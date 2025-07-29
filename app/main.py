from flask import Flask, g, render_template, request, redirect, url_for, Response, make_response, send_file, session, flash
from flask_wtf.csrf import CSRFProtect, generate_csrf
import sqlite3
import csv
from io import StringIO
import os
import io
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from dotenv import load_dotenv
from security_utils import InputValidator, require_valid_id, SecureDatabase

app = Flask(__name__)

load_dotenv()

app.secret_key = os.getenv('FLASK_SECRET_KEY')

# Database path - use environment variable or default based on environment
if os.path.exists('/app'):  # Running in Docker container
    DATABASE = os.getenv('DATABASE_PATH', '/app/db.sqlite3')
else:  # Running locally
    DATABASE = os.getenv('DATABASE_PATH', 'db.sqlite3')

# ---------- Hardcoded Users (for demonstration) ----------
username = os.getenv('APP_USERNAME', 'admin')  # default to 'admin' if not set
password = os.getenv('APP_PASSWORD', 'password123')  # default password

users = {
    username: generate_password_hash(password)
}

# Initialize CSRF protection
csrf = CSRFProtect(app)

# ---------- Database Helpers ----------
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def create_tables():
    try:
        # Ensure the database file can be created
        db_dir = os.path.dirname(DATABASE)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
        
        # Create empty file if it doesn't exist
        if not os.path.exists(DATABASE):
            open(DATABASE, 'a').close()
        
        db = sqlite3.connect(DATABASE)
        db.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT NOT NULL,
                drink TEXT NOT NULL,
                milk TEXT NOT NULL,
                syrup TEXT,
                foam TEXT,
                temperature TEXT NOT NULL,
                extra_shot INTEGER NOT NULL,
                notes TEXT,
                status TEXT NOT NULL,
                price REAL NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        
        # Add syrup and foam columns if they don't exist (for existing databases)
        try:
            db.execute("ALTER TABLE orders ADD COLUMN syrup TEXT")
        except sqlite3.OperationalError:
            pass  # Column already exists
        
        try:
            db.execute("ALTER TABLE orders ADD COLUMN foam TEXT")
        except sqlite3.OperationalError:
            pass  # Column already exists
        
        # Create menu configuration table
        db.execute("""
            CREATE TABLE IF NOT EXISTS menu_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_type TEXT NOT NULL,
                item_name TEXT NOT NULL,
                price REAL,
                created_at TEXT NOT NULL
            )
        """)
        
        # Insert default menu items if table is empty
        existing_items = db.execute("SELECT COUNT(*) FROM menu_config").fetchone()[0]
        if existing_items == 0:
            default_items = [
                ('drink', 'Latte', 4.0),
                ('drink', 'Coffee', 3.0),
                ('milk', 'Whole', None),
                ('milk', 'Oat', None),
                ('milk', 'Almond', None),
                ('milk', 'None', None),
                ('syrup', 'Vanilla', None),
                ('syrup', 'Caramel', None),
                ('syrup', 'Hazelnut', None),
                ('syrup', 'None', None),
                ('foam', 'Regular', None),
                ('foam', 'Extra Foam', None),
                ('foam', 'No Foam', None)
            ]
            for item_type, item_name, price in default_items:
                db.execute(
                    "INSERT INTO menu_config (item_type, item_name, price, created_at) VALUES (?, ?, ?, datetime('now'))",
                    (item_type, item_name, price)
                )
        
        db.commit()
        db.close()
        
    except Exception as e:
        print(f"Error creating database tables: {e}")
        raise

# Initialize database tables on app startup
def init_db():
    """Initialize database tables if they don't exist"""
    try:
        # Ensure the directory exists (only if DATABASE has a directory component)
        db_dir = os.path.dirname(DATABASE)
        if db_dir:  # Only create directory if there is one
            os.makedirs(db_dir, exist_ok=True)
        create_tables()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Error initializing database: {e}")

# Initialize database when app starts
init_db()

# ---------- Login Helpers ----------
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.after_request
def add_csrf_header(response):
    if 'text/html' in response.headers.get('Content-Type', ''):
        response.set_cookie('csrf_token', generate_csrf())
    return response

# ---------- Auth Routes ----------
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user_password_hash = users.get(username)

        if user_password_hash and check_password_hash(user_password_hash, password):
            session['user'] = username
            return redirect(url_for('index'))
        else:
            flash("Invalid credentials")
            return render_template('login.html')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login'))

# ---------- Routes ----------
@app.route('/')
@login_required
def index():
    db = get_db()
    orders = db.execute('SELECT * FROM orders ORDER BY created_at DESC').fetchall()
    drinks = db.execute('SELECT * FROM menu_config WHERE item_type = "drink" ORDER BY item_name').fetchall()
    milks = db.execute('SELECT * FROM menu_config WHERE item_type = "milk" ORDER BY item_name').fetchall()
    syrups = db.execute('SELECT * FROM menu_config WHERE item_type = "syrup" ORDER BY item_name').fetchall()
    foams = db.execute('SELECT * FROM menu_config WHERE item_type = "foam" ORDER BY item_name').fetchall()
    return render_template('index.html', orders=orders, drinks=drinks, milks=milks, syrups=syrups, foams=foams)

@app.route('/in_progress')
@login_required
def in_progress_orders():
    db = get_db()
    orders = db.execute('SELECT * FROM orders ORDER BY created_at DESC').fetchall()
    in_progress = [o for o in orders if o['status'] != 'completed']
    return render_template('in_progress.html', orders=in_progress)

@app.route('/order', methods=['POST'])
@login_required
def order():
    # Validate and sanitize all inputs
    customer_name = request.form['customer_name']
    drink = request.form['drink']
    milk = request.form.get('milk')
    syrup = request.form.get('syrup')
    foam = request.form.get('foam')
    temperature = request.form.get('temperature')
    notes = request.form.get('notes', '')
    extra_shot = request.form.get('extra_shot') == 'true'

    # Validate customer name
    is_valid, sanitized_name, error = InputValidator.validate_customer_name(customer_name)
    if not is_valid:
        flash(f"Invalid customer name: {error}")
        return redirect(url_for('index'))
    
    # Validate menu items (drink, milk, syrup, foam)
    for item_name, item_type in [(drink, 'drink'), (milk, 'milk'), (syrup, 'syrup'), (foam, 'foam')]:
        if item_name:  # Only validate if not None/empty
            is_valid, _, error = InputValidator.validate_menu_item(item_name)
            if not is_valid:
                flash(f"Invalid {item_type}: {error}")
                return redirect(url_for('index'))
    
    # Validate temperature
    if temperature and temperature not in ['Hot', 'Iced']:
        flash("Invalid temperature selection")
        return redirect(url_for('index'))
    
    # Validate notes
    is_valid, sanitized_notes, error = InputValidator.validate_notes(notes)
    if not is_valid:
        flash(f"Invalid notes: {error}")
        return redirect(url_for('index'))

    db = get_db()
    
    # Get price from database
    drink_price = db.execute(
        'SELECT price FROM menu_config WHERE item_type = "drink" AND item_name = ?', 
        (drink,)
    ).fetchone()
    
    price = drink_price['price'] if drink_price and drink_price['price'] else 0.0
    if extra_shot:
        price += 1.0

    db.execute(
        '''
        INSERT INTO orders 
        (customer_name, drink, milk, syrup, foam, temperature, extra_shot, notes, status, price, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))
        ''',
        (sanitized_name, drink, milk, syrup, foam, temperature, int(extra_shot), sanitized_notes, 'pending', price)
    )
    db.commit()
    return redirect(url_for('index'))

@app.route('/orders')
@login_required
def orders():
    db = get_db()
    search = request.args.get('search', '')
    # Handle multiple status values - default to pending and in_progress
    status_filters = request.args.getlist('status')
    if not status_filters:
        status_filters = ['pending', 'in_progress']
    
    # Validate search input
    if search:
        is_valid, sanitized_search, error = InputValidator.validate_search_query(search)
        if not is_valid:
            flash(f"Invalid search query: {error}")
            return redirect(url_for('orders'))
        search = sanitized_search
    
    # Validate status filters
    validated_statuses = []
    for status in status_filters:
        if status == 'all':
            validated_statuses = ['all']
            break
        is_valid, validated_status, error = InputValidator.validate_status(status)
        if not is_valid:
            flash(f"Invalid status filter: {error}")
            return redirect(url_for('orders'))
        validated_statuses.append(validated_status)
    
    base_query = '''
        SELECT *, 
               CASE 
                   WHEN status = 'pending' THEN (julianday('now') - julianday(created_at)) * 24 * 60
                   WHEN status = 'in_progress' THEN (julianday('now') - julianday(created_at)) * 24 * 60
                   ELSE 0
               END as wait_time_minutes
        FROM orders 
        WHERE 1=1
    '''
    
    additional_params = []
    
    # Add status filter if specified
    if 'all' not in validated_statuses:
        placeholders = ','.join(['?' for _ in validated_statuses])
        base_query += f' AND status IN ({placeholders})'
        additional_params.extend(validated_statuses)
    
    base_query += '''
        ORDER BY 
            CASE status
                WHEN "pending" THEN 1
                WHEN "in_progress" THEN 2
                WHEN "completed" THEN 3
            END,
            created_at DESC
    '''
    
    # Use secure search if search term provided
    if search:
        # Replace placeholder with actual LIKE conditions
        search_query = base_query.replace('WHERE 1=1', 'WHERE ({{LIKE_CONDITIONS}})')
        if 'all' not in validated_statuses:
            placeholders = ','.join(['?' for _ in validated_statuses])
            search_query = search_query.replace(f'AND status IN ({placeholders})', f'AND status IN ({placeholders})')
        
        try:
            orders = SecureDatabase.safe_like_query(
                db, 
                search_query, 
                ['customer_name', 'drink', 'notes'], 
                search, 
                additional_params
            )
        except ValueError as e:
            flash(str(e))
            return redirect(url_for('orders'))
    else:
        orders = db.execute(base_query, additional_params).fetchall()
    
    return render_template('orders.html', orders=orders, search=search, status_filters=validated_statuses)

@app.route('/delete_order/<int:order_id>', methods=['POST'])
@login_required
@require_valid_id
def delete_order(order_id):
    db = get_db()
    db.execute('DELETE FROM orders WHERE id = ?', [order_id])
    db.commit()
    return redirect(request.referrer or url_for('index'))

@app.route('/update_status/<int:order_id>', methods=['POST'])
@login_required
@require_valid_id
def update_status(order_id):
    new_status = request.form.get('status')
    
    # Validate status using our security utilities
    is_valid, validated_status, error = InputValidator.validate_status(new_status)
    if not is_valid:
        flash(f"Invalid status: {error}")
        return redirect(request.referrer or url_for('index'))
        
    db = get_db()
    db.execute('UPDATE orders SET status = ? WHERE id = ?', [validated_status, order_id])
    db.commit()
    return redirect(request.referrer or url_for('index'))

@app.route('/completed')
@login_required
def completed_orders():
    db = get_db()
    completed = db.execute('SELECT * FROM orders WHERE status = "completed" ORDER BY created_at DESC').fetchall()

    total_drinks = len(completed)
    total_money = sum(o['price'] for o in completed)
    
    # Calculate drink counts dynamically
    drink_counts = {}
    milk_counts = {}
    syrup_counts = {}
    foam_counts = {}
    temperature_counts = {}
    customer_counts = {}
    
    total_extra_shots = 0
    
    for order in completed:
        # Drink counts
        drink_name = order['drink']
        drink_counts[drink_name] = drink_counts.get(drink_name, 0) + 1
        
        # Milk counts
        milk_type = order['milk'] or 'None'
        milk_counts[milk_type] = milk_counts.get(milk_type, 0) + 1
        
        # Syrup counts
        syrup_type = order['syrup'] or 'None'
        syrup_counts[syrup_type] = syrup_counts.get(syrup_type, 0) + 1
        
        # Foam counts
        foam_type = order['foam'] or 'Regular'
        foam_counts[foam_type] = foam_counts.get(foam_type, 0) + 1
        
        # Temperature counts
        temp = order['temperature']
        temperature_counts[temp] = temperature_counts.get(temp, 0) + 1
        
        # Customer counts
        customer = order['customer_name']
        customer_counts[customer] = customer_counts.get(customer, 0) + 1
        
        # Extra shots
        if order['extra_shot']:
            total_extra_shots += 1
    
    # Calculate averages and insights
    avg_order_value = total_money / total_drinks if total_drinks > 0 else 0
    
    # Most popular items
    most_popular_drink = max(drink_counts.items(), key=lambda x: x[1]) if drink_counts else ('None', 0)
    most_popular_milk = max(milk_counts.items(), key=lambda x: x[1]) if milk_counts else ('None', 0)
    most_popular_syrup = max(syrup_counts.items(), key=lambda x: x[1]) if syrup_counts else ('None', 0)
    
    # Top customers
    top_customers = sorted(customer_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    
    # For backward compatibility, still provide total_lattes and total_coffees
    total_lattes = drink_counts.get('Latte', 0)
    total_coffees = drink_counts.get('Coffee', 0)

    return render_template(
        'completed.html',
        completed=completed,
        total_drinks=total_drinks,
        total_lattes=total_lattes,
        total_coffees=total_coffees,
        total_money=total_money,
        drink_counts=drink_counts,
        milk_counts=milk_counts,
        syrup_counts=syrup_counts,
        foam_counts=foam_counts,
        temperature_counts=temperature_counts,
        customer_counts=customer_counts,
        total_extra_shots=total_extra_shots,
        avg_order_value=avg_order_value,
        most_popular_drink=most_popular_drink,
        most_popular_milk=most_popular_milk,
        most_popular_syrup=most_popular_syrup,
        top_customers=top_customers
    )

@app.route('/export_completed_csv')
@login_required
def export_completed_csv():
    db = get_db()
    completed = db.execute('SELECT * FROM orders WHERE status = "completed" ORDER BY created_at DESC').fetchall()

    si = StringIO()
    writer = csv.writer(si)
    writer.writerow(['ID', 'Customer Name', 'Drink', 'Milk', 'Syrup', 'Foam', 'Temperature', 'Extra Shot', 'Notes', 'Price', 'Created At'])

    for o in completed:
        writer.writerow([
            o['id'], o['customer_name'], o['drink'], o['milk'],
            o['syrup'] or '', o['foam'] or '', o['temperature'], 
            'Yes' if o['extra_shot'] else 'No',
            o['notes'], f"{o['price']:.2f}", o['created_at']
        ])

    output = si.getvalue()
    si.close()

    return Response(
        output,
        mimetype='text/csv',
        headers={"Content-Disposition": "attachment; filename=completed_orders.csv"}
    )

@app.route('/create_label/<int:order_id>')
@login_required
def create_label(order_id):
    db = get_db()
    order = db.execute('SELECT * FROM orders WHERE id = ?', (order_id,)).fetchone()

    if not order:
        return "Order not found", 404

    buffer = io.BytesIO()
    label_width = 3 * inch
    label_height = 3 * inch
    c = canvas.Canvas(buffer, pagesize=(label_width, label_height))

    logo_path = os.path.join(app.root_path, 'static', 'watermark.png')
    if os.path.exists(logo_path):
        logo_size = 1.5 * inch
        logo_x = (label_width - logo_size) / 2
        logo_y = (label_height - logo_size) / 2
        c.drawImage(logo_path, logo_x, logo_y, width=logo_size, height=logo_size, preserveAspectRatio=True, mask='auto')

    font_name = "Helvetica-Bold"
    font_size = 16
    c.setFont(font_name, font_size)

    lines = [
        f"{order['customer_name']}'s {order['drink']}",
        f"Milk: {order['milk']}",
        f"Syrup: {order['syrup'] or 'None'}",
        f"Foam: {order['foam'] or 'Regular'}",
        f"Temp: {order['temperature']}"
    ]
    if order['extra_shot']:
        lines.append("+ Extra Shot")
    if order['notes']:
        lines.append(f"Note: {order['notes']}")

    line_height = font_size + 2
    total_text_height = line_height * len(lines)
    y_start = (label_height + total_text_height) / 2 - line_height

    y = y_start
    for line in lines:
        c.drawCentredString(label_width / 2, y, line)
        y -= line_height

    c.showPage()
    c.save()
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=False,
        mimetype='application/pdf',
        download_name=f'label_{order_id}.pdf'
    )

# ---------- Menu Management Routes ----------
@app.route('/update_menu_item/<int:item_id>', methods=['POST'])
@login_required
@require_valid_id
def update_menu_item(item_id):
    item_name = request.form.get('item_name')
    price = request.form.get('price')
    
    # Validate item name
    is_valid, sanitized_name, error = InputValidator.validate_menu_item(item_name)
    if not is_valid:
        flash(f"Invalid item name: {error}")
        return redirect(request.referrer or url_for('index'))
    
    # Validate price if provided
    if price and price.strip():
        is_valid, validated_price, error = InputValidator.validate_price(price)
        if not is_valid:
            flash(f"Invalid price: {error}")
            return redirect(request.referrer or url_for('index'))
        price = validated_price
    
    db = get_db()
    if price is not None:
        db.execute('UPDATE menu_config SET item_name = ?, price = ? WHERE id = ?', 
                  (sanitized_name, price, item_id))
    else:
        db.execute('UPDATE menu_config SET item_name = ? WHERE id = ?', 
                  (sanitized_name, item_id))
    
    db.commit()
    return redirect(request.referrer or url_for('index'))

@app.route('/add_menu_item', methods=['POST'])
@login_required
def add_menu_item():
    item_type = request.form.get('item_type')
    item_name = request.form.get('item_name')
    price = request.form.get('price')
    
    # Validate item type
    is_valid, validated_type, error = InputValidator.validate_item_type(item_type)
    if not is_valid:
        flash(f"Invalid item type: {error}")
        return redirect(request.referrer or url_for('index'))
    
    # Validate item name
    is_valid, sanitized_name, error = InputValidator.validate_menu_item(item_name)
    if not is_valid:
        flash(f"Invalid item name: {error}")
        return redirect(request.referrer or url_for('index'))
    
    # Validate price if provided
    validated_price = None
    if price and price.strip():
        is_valid, validated_price, error = InputValidator.validate_price(price)
        if not is_valid:
            flash(f"Invalid price: {error}")
            return redirect(request.referrer or url_for('index'))
    
    db = get_db()
    db.execute(
        'INSERT INTO menu_config (item_type, item_name, price, created_at) VALUES (?, ?, ?, datetime("now"))',
        (validated_type, sanitized_name, validated_price)
    )
    
    db.commit()
    return redirect(request.referrer or url_for('index'))

@app.route('/delete_menu_item/<int:item_id>', methods=['POST'])
@login_required
@require_valid_id
def delete_menu_item(item_id):
    db = get_db()
    db.execute('DELETE FROM menu_config WHERE id = ?', (item_id,))
    db.commit()
    return redirect(request.referrer or url_for('index'))

# ---------- API Routes ----------
@app.route('/api/order-count')
@login_required
def api_order_count():
    db = get_db()
    pending = db.execute('SELECT COUNT(*) FROM orders WHERE status = "pending"').fetchone()[0]
    in_progress = db.execute('SELECT COUNT(*) FROM orders WHERE status = "in_progress"').fetchone()[0]
    completed = db.execute('SELECT COUNT(*) FROM orders WHERE status = "completed"').fetchone()[0]
    
    return {
        'pending': pending,
        'in_progress': in_progress,
        'completed': completed,
        'total': pending + in_progress + completed
    }

@app.route('/api/customers')
@login_required
def api_customers():
    db = get_db()
    customers = db.execute(
        'SELECT DISTINCT customer_name FROM orders ORDER BY customer_name'
    ).fetchall()
    
    return {
        'customers': [row['customer_name'] for row in customers]
    }

@app.route('/api/customer-history/<customer_name>')
@login_required
def api_customer_history(customer_name):
    # Validate and sanitize customer name from URL
    is_valid, sanitized_name, error = InputValidator.validate_customer_name(customer_name)
    if not is_valid:
        return {'error': f'Invalid customer name: {error}'}, 400
    
    db = get_db()
    
    # Use secure LIKE query with proper escaping
    try:
        orders = SecureDatabase.safe_like_query(
            db,
            'SELECT * FROM orders WHERE {{LIKE_CONDITIONS}} ORDER BY created_at DESC LIMIT 10',
            ['customer_name'],
            sanitized_name,
            []
        )
    except ValueError as e:
        return {'error': str(e)}, 400
    
    return {
        'orders': [dict(order) for order in orders],
        'total_orders': len(orders),
        'favorite_drink': None  # Could be calculated from order history
    }

# ---------- Entry Point ----------
if __name__ == "__main__":
    create_tables()
    app.run(host='0.0.0.0', port=5000)
