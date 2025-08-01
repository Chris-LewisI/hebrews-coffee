# HeBrews Coffee POS System

A modern point-of-sale (POS) system built specifically for coffee shops, featuring order management, customer tracking, analytics, and label printing capabilities.

## Features

- **Order Management**: Create, track, and manage coffee orders with customizable options
- **Customer Management**: Track customer history and preferences with autocomplete functionality
- **Menu Configuration**: Dynamic menu management for drinks, milk types, syrups, and foam options
- **Order Status Tracking**: Real-time status updates (pending, in-progress, completed)
- **Analytics Dashboard**: Comprehensive sales analytics and reporting
- **Label Printing**: Generate PDF labels for orders with custom branding
- **Data Export**: Export completed orders to CSV format
- **Authentication**: Secure login system with session management
- **Responsive Design**: Mobile-friendly interface for tablet and phone use

## Technology Stack

- **Backend**: Flask (Python)
- **Database**: SQLite3
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **PDF Generation**: ReportLab
- **Authentication**: Flask-WTF with CSRF protection
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx (production)

## Quick Start

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Chris-LewisI/hebrews-coffee.git
   cd hebrews-coffee
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Open your browser to `http://localhost:5000`
   - Default login: admin / password123 (configure in .env)

### Production Deployment

#### Option 1: Standard Deployment (with exposed ports)
1. **Configure production environment**
   ```bash
   cp .env.prod.example .env.prod
   # Edit .env.prod with production settings
   ```

2. **Deploy with production compose**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

#### Option 2: Cloudflare Tunnel Deployment (Recommended)
1. **Configure production environment**
   ```bash
   cp .env.prod.example .env.prod
   # Edit .env.prod with production settings
   ```

2. **Deploy the application stack**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Set up Cloudflare tunnel**
   - Install cloudflared on your server
   - Create a tunnel: `cloudflared tunnel create hebrews-coffee`
   - Copy `cloudflare-tunnel.yml` to `~/.cloudflared/config.yml`
   - Configure the tunnel to point to `http://localhost:3001` (nginx container)
   - Set up DNS record: `yoururl.com` → tunnel
   - Run the tunnel: `cloudflared tunnel run hebrews-coffee`

4. **Access the application**
   - Public URL: `https://yoururl.com`
   - The application is secured behind Cloudflare's network

## Environment Variables

Create a `.env` file with the following variables:

```env
FLASK_SECRET_KEY=your-secret-key-here
APP_USERNAME=admin
APP_PASSWORD=your-secure-password
DOMAIN=https://yoururl.com.com
```

For production, update `.env.prod` with your specific values.

## API Endpoints

### Order Management
- `POST /order` - Create a new order
- `POST /update_status/<id>` - Update order status
- `POST /delete_order/<id>` - Delete an order
- `GET /create_label/<id>` - Generate PDF label for order

### Menu Management
- `POST /add_menu_item` - Add new menu item
- `POST /update_menu_item/<id>` - Update existing menu item
- `POST /delete_menu_item/<id>` - Delete menu item

### Analytics API
- `GET /api/order-count` - Get order counts by status
- `GET /api/customers` - Get list of all customers
- `GET /api/customer-history/<name>` - Get customer order history

## Database Schema

### Orders Table
- `id` - Primary key
- `customer_name` - Customer name
- `drink` - Selected drink type
- `milk` - Milk preference
- `syrup` - Syrup selection (optional)
- `foam` - Foam preference
- `temperature` - Hot/Cold preference
- `extra_shot` - Boolean for extra espresso shot
- `notes` - Special instructions
- `status` - Order status (pending/in_progress/completed)
- `price` - Order total
- `created_at` - Timestamp

### Menu Configuration Table
- `id` - Primary key
- `item_type` - Type (drink/milk/syrup/foam)
- `item_name` - Display name
- `price` - Item price (nullable for non-drink items)
- `created_at` - Timestamp

## Development Workflow

1. **Make changes** to the codebase
2. **Update image version** in Dockerfile if needed
3. **Test locally** using `docker-compose up --build`
4. **Commit and push** changes to remote branch
5. **Rebuild image** in production environment (Portainer)
6. **Reset database** if schema changes: Delete `/opt/appdata/hebrews-pos/sqlite3/db.sqlite3`
7. **Redeploy stack** in production

## File Structure

```
hebrews-coffee/
├── app/
│   ├── main.py                   # Main Flask application
│   ├── static/
│   │   ├── styles.css            # Main stylesheet
│   │   ├── logo.png              # Company logo
│   │   ├── watermark.png         # Label watermark
│   │   └── js/
│   │       ├── chart.js                  # Analytics charts
│   │       ├── customer-autocomplete.js # Customer search/autocomplete
│   │       ├── menu-editor.js           # Menu management UI
│   │       ├── order-management.js      # Admin order tools
│   │       └── refresh.js               # Auto-refresh logic
│   └── templates/
│       ├── base.html            # Base template
│       ├── index.html           # Main order interface
│       ├── orders.html          # Order management
│       ├── in_progress.html     # Active orders
│       ├── completed.html       # Analytics dashboard
│       └── login.html           # Authentication
├── .env                         # Local environment variables
├── .gitignore                   # Git ignored files and folders
├── cleanup-and-rebuild.sh       # Utility script for Docker cleanup
├── docker-compose.yml           # Development Docker Compose config
├── docker-compose.prod.yml      # Production Docker Compose config
├── Dockerfile                   # Development Dockerfile
├── Dockerfile.prod              # Production Dockerfile
├── example.env                  # Sample environment config
├── LICENSE                      # Project license
├── nginx.conf                   # Nginx config for deployment
├── nginx.conf.template          # Template for dynamic Nginx config
├── README.md                    # Project overview and usage
├── README-PRODUCTION.md         # Production setup documentation
└── requirements.txt             # Python dependencies
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions, please open an issue on the GitHub repository.
