# Construction Cost Estimation System

## Overview

A full-stack web application for construction cost estimation and project management. The system allows users to create construction projects, manage work items and materials, calculate costs based on consumption norms, and export estimates to PDF/Excel formats. Built with a modern React frontend and Express.js backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.
User prefers Russian language for all interface and communication.

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
- **Database Management**: Materials database, Works database with full CRUD
- **Settings Interface**: Database management tabs with search and filtering
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

## Recent Changes

### January 2025
- Added Settings menu with database management interfaces
- Implemented Materials Database with full CRUD operations
- Implemented Works Database with cross-project work management
- Added search and filtering capabilities to database interfaces
- Fixed data type issues with decimal fields in API
- Russian localization for all interface elements
- Enhanced sidebar navigation with Settings section

### January 2025 (Latest)
- Implemented hierarchical work structure system (разделы → подразделы → работы)
- Added PostgreSQL tables: sections, tasks with proper relationships
- Created automatic hierarchy detection logic based on index patterns
- Developed Excel/CSV import functionality with UTF-8 encoding support
- Added API endpoints for hierarchical structure management (/api/hierarchy/*)
- Created comprehensive UI for managing hierarchical work structure
- Fixed database relation conflicts with proper relationName specification
- Integrated hierarchical structure tab into main Settings menu
- Resolved UTF-8 encoding issues for proper Russian text display
- Added inline editing functionality for costPrice (себестоимость) values
- Fixed data duplication problems and implemented proper database clearing
- Created working CSV template download with correct UTF-8 encoding
- Implemented bulk price update functionality with coefficient-based percentage changes
- Added "Коэффициент цен" button with modal dialog for mass price adjustments
- Created API endpoint (/api/hierarchy/bulk-update) for applying percentage changes to all work items
- Fixed import issues with Russian number format (comma to dot conversion)
- Enhanced automatic parent section creation for missing hierarchical relationships
- Improved record type detection to properly handle subsections without units
- **Comprehensive Material Prices Management**: Full Excel import/export system with error detection and filtering
- **Performance Optimization**: Added search performance improvements with memoization and display limits
- **Detailed Estimate Component**: Professional construction estimate interface matching industry standards with section grouping, material images, and cost breakdowns