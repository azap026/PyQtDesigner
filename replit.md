# Construction Cost Estimation System

## Overview

A full-stack web application for construction cost estimation and project management. The system allows users to create construction projects, manage work items and materials, calculate costs based on consumption norms, and export estimates to PDF/Excel formats. Built with a modern React frontend and Express.js backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite with custom configuration for development and production

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database Layer**: Drizzle ORM for type-safe database operations
- **API Design**: RESTful API with structured error handling
- **Development**: Hot reload with Vite integration in development mode

### Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless configuration
- **ORM**: Drizzle ORM with schema-first approach
- **Migrations**: Drizzle Kit for database migrations
- **Connection**: Connection pooling with @neondatabase/serverless

### Database Schema Design
- **Projects**: Core project entity with metadata
- **Work Items**: Individual construction tasks linked to projects
- **Materials**: Master materials catalog with pricing
- **Work Materials**: Junction table linking materials to work items with consumption norms
- **Relationships**: Proper foreign key constraints with cascade deletes

### Authentication and Authorization
- Currently no authentication system implemented
- Session management setup prepared with connect-pg-simple for future implementation

### Frontend Components Architecture
- **Layout Components**: Header, Sidebar, Theme Provider
- **Business Components**: Work modals, material modals, project summary
- **UI Components**: Complete shadcn/ui component library
- **State Management**: React Query for API state, React Context for UI state

### Development Tooling
- **Type Safety**: Shared schema validation with Zod
- **Code Quality**: TypeScript strict mode enabled
- **Build System**: ESBuild for production builds
- **Development**: Vite dev server with HMR

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless database connection
- **drizzle-orm**: Type-safe database ORM
- **drizzle-zod**: Schema validation integration
- **@tanstack/react-query**: Server state management
- **express**: Node.js web framework
- **react**: Frontend framework
- **@radix-ui/***: Headless UI component library

### UI and Styling
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **clsx**: Conditional CSS class utilities
- **lucide-react**: Icon library

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Type checking and compilation
- **@replit/vite-plugin-runtime-error-modal**: Development error handling
- **tsx**: TypeScript execution for Node.js

### Form and Validation
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Form validation resolvers
- **zod**: Runtime type validation

### Utilities
- **date-fns**: Date manipulation utilities
- **nanoid**: ID generation
- **ws**: WebSocket support for database connections