# Parfum Luxe E-commerce Website

## Overview

Parfum Luxe is a premium perfume e-commerce website built entirely with vanilla HTML, CSS, and JavaScript. The application features a complete shopping experience including product browsing, cart management, checkout process, and an admin dashboard for managing the store. The backend functionality is intended to be powered by Google Apps Script for data management and order processing.

## System Architecture

### Frontend Architecture
- **Technology Stack**: Pure HTML5, CSS3, and vanilla JavaScript
- **Design Pattern**: Multi-page application (MPA) with shared components
- **Styling Approach**: BEM-like CSS methodology with modular stylesheets
- **Responsive Design**: Mobile-first approach using CSS Grid and Flexbox
- **State Management**: Local storage for cart persistence and user preferences

### Backend Architecture
- **Data Layer**: Google Apps Script (Code.gs) for server-side logic
- **Data Storage**: Google Sheets as the primary database
- **API Communication**: Google Apps Script web app deployment for frontend-backend communication
- **Email Integration**: Google's MailApp service for order notifications

## Key Components

### Public-Facing Pages
1. **Homepage (index.html)**: Hero section, featured products, and brand introduction
2. **Products Page (products.html)**: Complete product catalog with filtering and search
3. **Product Detail Page (product-detail.html)**: Individual product information and purchase options
4. **Shopping Cart (cart.html)**: Cart management and item review
5. **Checkout (checkout.html)**: Multi-step checkout process with order summary
6. **About Page (about.html)**: Company information and brand story
7. **Contact Page (contact.html)**: Customer support and inquiry forms

### Admin Interface
- **Dashboard (dashboard.html)**: Complete admin panel for store management
- **Dashboard Styles (css/dashboard.css)**: Dedicated styling for admin interface

### JavaScript Modules
- **main.js**: Core application initialization and shared functionality
- **products.js**: Product listing, filtering, and search functionality
- **cart.js**: Shopping cart management with localStorage persistence
- **checkout.js**: Multi-step checkout process and order processing
- **dashboard.js**: Admin dashboard functionality and data management
- **utils.js**: Shared utility functions and helpers

### Styling System
- **styles.css**: Main stylesheet with component-based architecture
- **dashboard.css**: Admin-specific styling with professional dashboard UI
- **Font Awesome**: Icon library for consistent visual elements

## Data Flow

### Product Management
1. Products stored in Google Sheets with fields: ID, name, brand, price, description, image URLs, stock levels
2. Frontend fetches product data via Google Apps Script API calls
3. Products displayed with client-side filtering and search capabilities
4. Real-time inventory updates through backend integration

### Shopping Cart Flow
1. Cart items stored in browser localStorage for persistence
2. Add/remove/update operations handled by CartManager class
3. Cart state synchronized across all pages
4. Checkout process validates cart contents before processing

### Order Processing
1. Customer information collected through multi-step checkout form
2. Order data compiled and sent to Google Apps Script backend
3. Order details saved to Google Sheets database
4. Inventory levels automatically decremented
5. Email confirmation sent to customer via MailApp service

### Admin Dashboard Flow
1. Dashboard fetches real-time data from Google Sheets
2. Statistics and analytics calculated server-side
3. CRUD operations for products, orders, and customers
4. Data visualization for sales trends and inventory status

## External Dependencies

### CDN Resources
- **Font Awesome 6.0.0**: Icon library for UI elements
- **Google Fonts**: Typography enhancement (if implemented)

### Google Services Integration
- **Google Apps Script**: Server-side JavaScript runtime
- **Google Sheets API**: Database operations and data storage
- **Google MailApp**: Email notifications and communications
- **Google Drive**: Asset storage for product images (optional)

### Browser APIs
- **localStorage**: Client-side data persistence
- **Fetch API**: HTTP requests to Google Apps Script endpoints
- **History API**: URL management for SPA-like navigation (if implemented)

## Deployment Strategy

### Frontend Deployment
- **Static Hosting**: Deployable to Netlify, GitHub Pages, or Vercel
- **CDN Integration**: Assets optimized for global delivery
- **SSL Certificate**: HTTPS enabled for secure transactions
- **Domain Configuration**: Custom domain setup for professional branding

### Backend Deployment
- **Google Apps Script**: Web app deployment with public access
- **Google Sheets**: Database setup with proper permissions
- **API Endpoints**: RESTful endpoints for frontend communication
- **Security**: Input validation and sanitization implemented

### Environment Configuration
- **Development**: Local development with mock data
- **Staging**: Testing environment with real Google Sheets integration
- **Production**: Live deployment with full functionality

## Changelog

```
Changelog:
- June 28, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```