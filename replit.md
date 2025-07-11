# Ship Station - Logistics Management Platform

## Overview

Ship Station is a comprehensive logistics management platform that provides real-time order tracking, driver management, and delivery coordination capabilities. The system serves both business administrators and drivers through different interfaces - an admin web portal for business operations and a mobile-friendly driver app for field operations.

## System Architecture

### Full-Stack Structure
- **Frontend**: React with TypeScript, using Vite as the build tool
- **Backend**: Express.js with TypeScript running on Node.js
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Replit-based OpenID Connect authentication system
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom logistics theme

### Monorepo Organization
The application follows a monorepo structure with shared code between client and server:
- `client/` - React frontend application
- `server/` - Express.js backend API
- `shared/` - Common TypeScript schemas and types
- Database migrations and configuration at root level

## Key Components

### Database Layer (Drizzle + MySQL)
- **ORM**: Drizzle with MySQL2 connection pool
- **Schema Management**: Type-safe schema definitions in `shared/schema.ts`
- **Core Entities**: Users, Drivers, Orders, Customers, Order Status History, Activity Logs
- **Session Storage**: MySQL-based session management for authentication

### Authentication & Authorization
- **Provider**: Replit OpenID Connect integration
- **Session Management**: Express sessions with PostgreSQL store
- **Role-Based Access**: Admin, Driver, Staff, and Viewer roles
- **Security**: HTTP-only cookies, secure session handling

### Frontend Architecture
- **Router**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Components**: shadcn/ui component library with custom logistics theme
- **Form Handling**: React Hook Form with Zod validation
- **Mobile Support**: Responsive design with mobile-first driver interface

### Backend API Structure
- **RESTful Design**: Express.js with TypeScript
- **Route Organization**: Modular route handlers with middleware
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Real-time Features**: WebSocket support for live tracking updates

## Data Flow

### Order Management Flow
1. **Order Creation**: Admin creates orders through web interface or bulk CSV upload
2. **Assignment**: Orders automatically assigned to drivers based on availability and location
3. **Status Tracking**: Real-time status updates from pickup to delivery
4. **Driver Interface**: Mobile-friendly interface for drivers to manage assigned orders

### Authentication Flow
1. **Login**: Users authenticate through Replit OIDC
2. **Session Creation**: Server creates secure session with PostgreSQL storage
3. **Role-Based Routing**: Frontend routes users based on their role (admin vs driver)
4. **API Protection**: All API endpoints protected with authentication middleware

### Real-time Updates
- **Order Status**: Live updates when drivers change order status
- **Driver Location**: Real-time location tracking for active deliveries
- **Dashboard Stats**: Live dashboard metrics for administrators

## External Dependencies

### Core Libraries
- **Database**: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`
- **Authentication**: `openid-client`, `passport`, `express-session`
- **Frontend**: `react`, `@tanstack/react-query`, `wouter`
- **UI**: `@radix-ui/*` components, `tailwindcss`, `class-variance-authority`
- **Forms**: `react-hook-form`, `@hookform/resolvers`, `zod`
- **Utilities**: `date-fns`, `clsx`, `cmdk`

### Development Tools
- **Build**: Vite for frontend, esbuild for backend
- **TypeScript**: Full type safety across the stack
- **Development**: Replit-specific plugins for hot reloading and error overlay

## Deployment Strategy

### Production Build
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Database**: Drizzle migrations handle schema updates
- **Environment**: Production mode with secure session configuration

### Development Environment
- **Hot Reloading**: Vite dev server with HMR for frontend changes
- **API Proxy**: Vite proxies API requests to Express server
- **Database**: Direct connection to Neon PostgreSQL instance
- **Authentication**: Replit OIDC in development mode

### Environment Configuration
- **Database**: `DATABASE_URL` for MySQL connection (format: mysql://user:password@host:port/database)
- **Authentication**: `SESSION_SECRET`, `ISSUER_URL`, `REPL_ID` for OIDC
- **Security**: Secure cookies and HTTPS in production

### MySQL Database Setup

**Required Environment Variables:**
```
DATABASE_URL=mysql://username:password@hostname:3306/logistics
SESSION_SECRET=your-session-secret-here
```

**Setup Steps:**

1. **Create MySQL Database:**
   - Set up a MySQL server (local, cloud, or hosted service)
   - Create a database named 'logistics'
   - Update the DATABASE_URL environment variable

2. **Run Database Setup:**
   ```bash
   mysql -u username -p logistics < setup-mysql.sql
   ```

3. **Sample Data Included:**
   - 3 sample clients with login credentials
   - 4 delivery zones (North, South, East, West)
   - Database structure with all required tables and relationships

**MySQL Schema Features:**
- AUTO_INCREMENT primary keys for efficient indexing
- JSON data types for complex data storage
- Foreign key constraints for data integrity
- Optimized indexes for query performance
- UTF8MB4 character set for full Unicode support

## Recent Changes
- July 11, 2025: **Split-Screen Order Creation Modal** - Created new order creation interface matching shipping label design
  - Built split-screen modal with form fields on left and blue preview panel on right
  - Integrated cost calculation with weight and distance estimates
  - Applied modal universally across all order creation buttons (dashboard, orders table, client interface)
  - Removed old modal components and standardized on new design
  - Fixed database schema column name mismatches for PostgreSQL compatibility

- July 11, 2025: **Ship Station Complete Rebranding** - Successfully rebranded application to Ship Station
  - Updated all branding elements from LogiTrack/ShippXpress to Ship Station
  - Changed footer attribution to "Built by Phantasm Solutions"
  - Maintained professional navy/orange color scheme
  - Updated all logo references and application names throughout the platform
  - Application now fully functional with Ship Station branding

- July 2, 2025: **ShippXpress Complete Rebranding** - Successfully rebranded LogiTrack to ShippXpress
  - Integrated ship logo and created professional navy/orange color scheme
  - Built comprehensive sidebar navigation with collapsible design and navigation icons
  - Enhanced landing page with modern layout, statistics, and feature showcase
  - Created new Super Admin dashboard with metric cards and improved layout
  - Fixed client login system to accept both username and email authentication
  - Updated all branding elements and CSS utilities for consistent ShippXpress theme
  - Application now fully functional with professional ShippXpress design

- July 2, 2025: **PostgreSQL Database Restoration** - Migrated back from MySQL to PostgreSQL
  - Restored PostgreSQL connection using Replit's native database support
  - Fixed schema compatibility issues and field mappings
  - Resolved client authentication with proper email/username login support
  - All database operations working correctly with PostgreSQL backend

- June 30, 2025: Multi-tenant route optimization system implemented
  - Added client management with role-based access control
  - Implemented zone-based delivery system (A, B, C, D for North, South, East, West)
  - Added 2:30 PM cutoff time for batch processing and route optimization
  - Created super admin controls for managing clients, drivers, and zones
  - Added void order functionality for client users
  - Implemented optimized route planning with 300-mile radius zones
  - Set base pickup point: 1049 Industrial Dr, Bensenville, IL 60106
  - Added American Distributors LLC as first client with restricted access
  - Fixed role-based routing in App.tsx for proper super admin interface access
  - Added sample clients (American Distributors LLC, Midwest Supply Co, Great Lakes Logistics)
  - Created 4 delivery zones (North, South, East, West) with 300-mile radius
  - Implemented client login system with credentials (american_dist/password123)
  - Added Client Login page accessible from landing page
  - Super admin dashboard shows all clients, drivers, zones, and route batches
  - Complete role-based access: super_admin → full dashboard, client → orders only, driver → mobile app
  - Added billing system with weight and distance tracking for transparent pricing
  - Implemented client impersonation feature for super admin users
  - Added logout functionality to super admin dashboard header
  - Created dedicated billing interface showing pricing calculations
  - Added weight and distance fields to orders table for accurate billing

## Changelog
- June 30, 2025. Initial setup with basic logistics platform
- June 30, 2025. Added shipping label generation and barcode scanning
- June 30, 2025. Implemented multi-tenant route optimization system

## User Preferences

Preferred communication style: Simple, everyday language.