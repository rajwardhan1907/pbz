# PaintBiz Pro - Business Management System

## Overview

PaintBiz Pro is a full-stack web application designed for a local house painting business. It provides comprehensive business management features including job tracking, customer management, inventory control, expense tracking, worker management, travel logging, and profit/loss analytics. The application is built for daily use by a non-technical business owner with a focus on simplicity, stability, and maintainability.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (configured in `tailwind.config.ts`)
- **Forms**: React Hook Form with Zod validation via `@hookform/resolvers`
- **Charts**: Recharts for dashboard analytics and profit/loss visualization

The frontend follows a page-based architecture with:
- Pages in `client/src/pages/` (dashboard, jobs, inventory, expenses, workers, customers, travel, notes, auth)
- Reusable components in `client/src/components/`
- Custom hooks in `client/src/hooks/` for authentication and business data fetching
- Path aliases: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful endpoints with Zod schema validation
- **Session Management**: Express sessions with PostgreSQL-backed store (`connect-pg-simple`)
- **Authentication**: Single-owner login with password hashing using Node.js crypto (scrypt)

Key backend files:
- `server/index.ts` - Express app setup and middleware
- `server/routes.ts` - API route definitions with authentication middleware
- `server/storage.ts` - Database abstraction layer interface
- `server/db.ts` - Drizzle ORM database connection
- `server/seed.ts` - Default admin user seeding

### Data Layer
- **ORM**: Drizzle ORM with `drizzle-zod` for automatic schema validation
- **Database**: PostgreSQL (configured via `DATABASE_URL` environment variable)
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit for schema management (`drizzle.config.ts`, run with `npm run db:push`)

Database tables:
- `users` - Authentication (single admin)
- `customers` - Customer contact information
- `jobs` - Job tracking with status, quotes, and payments
- `inventory` - Materials and stock tracking
- `expenses` - Expense categorization and tracking
- `workers` - Worker profiles and wages
- `attendance` - Worker attendance records
- `travelExpenses` - Travel and fuel cost logging
- `notes` - Contextual notes linked to any entity

### Build System
- **Development**: Vite with HMR for frontend, tsx for TypeScript server execution
- **Production Build**: Custom build script (`script/build.ts`) using esbuild for server bundling and Vite for client
- **Output**: Server bundles to `dist/index.cjs`, client to `dist/public/`

## External Dependencies

### Database
- **PostgreSQL**: Primary database requiring `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database access with automatic schema inference
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### UI Libraries
- **Radix UI**: Accessible component primitives (dialogs, dropdowns, forms, etc.)
- **shadcn/ui**: Pre-built component library configured in `components.json`
- **Recharts**: Charting library for dashboard analytics

### Authentication & Security
- Node.js built-in `crypto` module for password hashing (scrypt)
- Express sessions with secure cookie handling
- Passport.js with local strategy (configured but using custom session handling)

### Development Tools
- **Vite**: Frontend build tool with React plugin
- **tsx**: TypeScript execution for development server
- **esbuild**: Fast bundling for production builds
- **Replit plugins**: Runtime error overlay, cartographer, and dev banner for Replit environment