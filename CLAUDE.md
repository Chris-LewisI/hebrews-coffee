# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Local Development
```bash
# Start development server with Docker
docker-compose up --build

# Access application at http://localhost:8001
# Default login: admin / password123
```

### Production Deployment
```bash
# Deploy production stack with nginx reverse proxy
docker-compose -f docker-compose.prod.yml up --build -d

# Clean rebuild (use provided script)
./cleanup-and-rebuild.sh

# Monitor production services
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

### Environment Setup
```bash
# Copy environment template and configure
cp example.env .env
# Edit .env with your configuration values
```

## Application Architecture

### Core Components
- **Flask Application** (`app/main.py`): Main server handling all routes, order management, menu configuration, authentication, and PDF generation
- **Security Layer** (`app/security_utils.py`): Input validation, SQL injection prevention, and secure database operations through `InputValidator` and `SecureDatabase` classes
- **Database**: SQLite3 with two main tables - `orders` (order management) and `menu_config` (dynamic menu items)
- **Frontend**: Vanilla JavaScript with multiple specialized modules for different features

### Security Architecture
The application implements comprehensive security measures:
- **Input Validation**: All user inputs are validated and sanitized using the `InputValidator` class
- **SQL Injection Prevention**: Parameterized queries and pattern detection for malicious inputs
- **CSRF Protection**: Flask-WTF CSRF tokens on all forms
- **Authentication**: Session-based auth with hashed passwords
- **XSS Prevention**: HTML escaping and character filtering

### Database Schema
- **orders**: customer_name, drink, milk, syrup, foam, temperature, extra_shot, notes, status, price, created_at
- **menu_config**: item_type (drink/milk/syrup/foam), item_name, price, created_at

### Frontend Modules
- `customer-autocomplete.js`: Customer search and history
- `menu-editor.js`: Dynamic menu management
- `order-management.js`: Admin order operations
- `chart.js`: Analytics dashboard
- `refresh.js`: Auto-refresh functionality
- `auto-print.js`: Automatic label printing

### Key Routes
- `/` - Main order interface
- `/orders` - Order management dashboard
- `/in_progress` - Active orders display
- `/completed` - Analytics and completed orders
- `/api/*` - JSON API endpoints for order counts, customers, history
- `/create_label/<id>` - PDF label generation

### Authentication Flow
- Environment-based credentials (APP_USERNAME/APP_PASSWORD)
- Session management with Flask sessions
- Login required decorator for protected routes

### Container Architecture
- **Development**: Single Flask container on port 8001
- **Production**: Flask app + Nginx reverse proxy (ports 3000/3001)
- **Data Persistence**: Docker volumes for SQLite database and logs
- **Health Checks**: Built-in container health monitoring

## Development Notes

### Database Initialization
The application auto-creates tables on startup and handles schema migrations for existing databases.

### Environment Variables
Required: `FLASK_SECRET_KEY`, `APP_USERNAME`, `APP_PASSWORD`
Optional: `DATABASE_PATH`, `DOMAIN`

### Docker Context
The app detects Docker environment (`/app` directory existence) and adjusts database paths accordingly.

### Security Considerations
- All user inputs pass through InputValidator before database operations
- SQL queries use parameterization exclusively
- File uploads and dangerous operations are restricted
- CSRF tokens protect all state-changing operations