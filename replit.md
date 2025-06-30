# LogiTrack - Logistics Management Platform

## Overview

LogiTrack is a comprehensive logistics management platform that provides real-time order tracking, driver management, and delivery coordination capabilities. The system serves both business administrators and drivers through different interfaces - an admin web portal for business operations and a mobile-friendly driver app for field operations.

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

### Database Layer (Drizzle + PostgreSQL)
- **ORM**: Drizzle with Neon serverless PostgreSQL
- **Schema Management**: Type-safe schema definitions in `shared/schema.ts`
- **Core Entities**: Users, Drivers, Orders, Customers, Order Status History, Activity Logs
- **Session Storage**: PostgreSQL-based session management for authentication

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
- **Database**: `DATABASE_URL` for PostgreSQL connection
- **Authentication**: `SESSION_SECRET`, `ISSUER_URL`, `REPL_ID` for OIDC
- **Security**: Secure cookies and HTTPS in production

## Changelog
- June 30, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.