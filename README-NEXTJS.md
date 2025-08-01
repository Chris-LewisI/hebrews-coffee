# HeBrews Coffee - Next.js Order Management System

A modern, production-ready coffee ordering system built with Next.js 15, TypeScript, Prisma, and Tailwind CSS. This is a complete rewrite of the original Flask application with enhanced performance, better user experience, and modern deployment options.

## ✨ Features

### 🏪 **Core Functionality**
- **Order Management**: Create, track, and manage coffee orders with real-time status updates
- **Customer System**: Autocomplete customer names with order history
- **Menu Configuration**: Dynamic menu management for drinks, milk options, syrups, and more
- **Wait Time Tracking**: Configurable color-coded wait time alerts (yellow/red thresholds)
- **PDF Label Generation**: Printable order labels for baristas
- **Analytics Dashboard**: Comprehensive order statistics and trends

### 🔐 **Security & Authentication**
- **Secure Login**: NextAuth.js with bcrypt password hashing
- **Session Management**: Secure, server-side session handling
- **CSRF Protection**: Built-in protection against cross-site request forgery
- **Type-Safe API**: Full TypeScript coverage with Prisma ORM

### 📱 **Modern UX/UI**
- **Responsive Design**: Mobile-first design that works on all devices
- **Real-time Updates**: Live order status changes without page refreshes
- **Intuitive Interface**: Clean, professional design with Tailwind CSS
- **Search & Filtering**: Advanced order search and status filtering
- **Sound Notifications**: Optional audio alerts for new orders

### 🚀 **Production Ready**
- **Docker Support**: Complete containerization with health checks
- **Database Migration**: Import existing Flask data seamlessly
- **Performance Optimized**: Server-side rendering, caching, and compression
- **Monitoring**: Health check endpoints and error logging
- **Scalable**: Ready for cloud deployment (Vercel, Railway, AWS, etc.)

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **PDF Generation**: jsPDF
- **Containerization**: Docker

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Docker (optional, for production deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hebrews-coffee-nextjs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open http://localhost:3000
   - Login with: `admin` / `password123`

## 🔄 Migration from Flask

If you're migrating from the original Flask application:

```bash
# Run the migration script
node scripts/migrate-from-flask.js /path/to/flask/db.sqlite3
```

This will import:
- ✅ All existing orders with proper status mapping
- ✅ Menu configuration items
- ✅ Application settings
- ✅ Create admin user account

## 🐳 Docker Deployment

### Development
```bash
docker-compose up --build
```

### Production
```bash
# Build production image
docker build -t hebrews-coffee .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

## ☁️ Cloud Deployment

### Vercel (Recommended)
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Railway
1. Connect repository to Railway
2. Add PostgreSQL addon
3. Set environment variables
4. Deploy

### Traditional VPS
1. Use Docker compose for easy setup
2. Configure reverse proxy (nginx)
3. Set up SSL certificates
4. Configure backups

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="file:./dev.db"  # or PostgreSQL URL

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Admin Account
APP_USERNAME="admin"
APP_PASSWORD="password123"
```

## 📱 API Documentation

### Orders API
- `GET /api/orders` - List orders with filtering
- `POST /api/orders` - Create new order
- `PATCH /api/orders/[id]` - Update order status
- `DELETE /api/orders/[id]` - Delete order
- `GET /api/orders/[id]/label` - Generate PDF label

### Menu API
- `GET /api/menu` - Get menu items
- `POST /api/menu` - Add menu item
- `PATCH /api/menu/[id]` - Update menu item
- `DELETE /api/menu/[id]` - Delete menu item

### Analytics API
- `GET /api/analytics` - Get order statistics
- `GET /api/export/csv` - Export orders as CSV

### System API
- `GET /api/health` - Health check
- `GET /api/customers` - Customer autocomplete
- `GET/POST /api/settings/wait-time-thresholds` - Wait time settings

## 🎯 Usage Guide

### Creating Orders
1. Navigate to the home page
2. Enter customer name (autocomplete available)
3. Select drink, milk, and options
4. Add special notes if needed
5. Submit order

### Managing Orders
1. Go to "Orders" page
2. View all active orders in table format
3. Use search and filters
4. Update order status (Start → Complete)
5. Print labels or delete orders

### Menu Configuration
1. Navigate to "Menu Config" page
2. Add/edit/delete menu items by category
3. Set prices for drinks
4. Changes reflect immediately in order form

### Analytics
1. Visit "Analytics" page
2. View key metrics and trends
3. Configure wait time alert thresholds
4. Export data as CSV

---

**🎉 The Next.js version is complete and ready for production use!**

**Ready to deploy?** Follow the deployment guide above for your preferred platform.