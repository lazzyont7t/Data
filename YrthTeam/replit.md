# Prediction Dashboard System

## Overview

This is a full-stack web application that provides real-time prediction services for lottery-style gaming systems. The application monitors multiple prediction systems (MYS and MZ) with different time intervals (30 seconds and 1 minute), executes automated predictions using mathematical algorithms, and displays results through a live dashboard interface.

The system features PostgreSQL database integration with user authentication, prediction result tracking with win/loss analysis, and real-time WebSocket communication. Users can register accounts, track their prediction accuracy, and view detailed statistics. The system automatically checks actual results against predictions to determine win/loss status using real API data.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript in SPA (Single Page Application) mode
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent UI design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: Native WebSocket API for live updates from the server
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with real-time WebSocket support
- **Scheduling**: Node-cron for automated prediction execution based on configurable intervals
- **Data Storage**: In-memory storage with TypeScript interfaces (designed for easy database integration)
- **WebSocket Server**: ws library for real-time client communication

### Data Storage Solutions
- **Primary Storage**: PostgreSQL database with Drizzle ORM
- **Database Schema**: Users, prediction results, system status, user statistics, and sessions tables
- **Data Models**: Complete user management, prediction tracking with win/loss results, and system monitoring
- **Migration Support**: Automated database schema management with drizzle-kit

### Authentication and Authorization
- **Session Management**: PostgreSQL session storage with express-session and connect-pg-simple
- **User Authentication**: Full login/register system with bcrypt password hashing
- **Protected Routes**: All prediction endpoints require authentication
- **User Context**: Predictions are linked to authenticated users for personalized tracking

### External Service Integrations
- **MYS System API**: Fetches data from `draw.ar-lottery01.com` for 30-second and 1-minute WinGo games
- **MZ System API**: Connects to `mzplayapi.com` for alternative prediction data sources
- **Prediction Algorithms**: Custom mathematical logic that analyzes historical number patterns to generate predictions
- **Win/Loss Validation**: Automated result checking service that compares predictions against actual outcomes
- **Real-time Result Tracking**: Scheduled tasks that fetch actual results and update prediction accuracy

### Core Architectural Decisions

**Monorepo Structure**: The application uses a shared TypeScript configuration with separate client and server directories, allowing for type sharing between frontend and backend through a shared schema.

**Real-time Updates**: WebSocket integration provides live prediction results and system status updates without requiring page refreshes, essential for time-sensitive prediction monitoring.

**Modular Service Architecture**: Prediction logic is separated into dedicated service classes (PredictionService, SchedulerService) for maintainability and testability.

**Type-Safe API Communication**: Shared TypeScript schemas ensure type safety across the full stack, reducing runtime errors and improving developer experience.

**Responsive Design System**: shadcn/ui components with Tailwind CSS provide a consistent, mobile-friendly interface that works across different screen sizes.

**Environment-Aware Configuration**: Different configurations for development (with Vite HMR) and production (with static file serving) ensure optimal performance in each environment.

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL database driver for serverless environments
- **drizzle-orm & drizzle-kit**: Type-safe ORM and migration toolkit for PostgreSQL
- **express**: Web application framework for Node.js
- **ws**: WebSocket server implementation for real-time communication
- **node-cron**: Task scheduling for automated prediction execution

### Frontend UI Dependencies
- **@radix-ui/react-***: Comprehensive set of unstyled, accessible UI primitives
- **@tanstack/react-query**: Server state management and data fetching
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library for consistent iconography
- **wouter**: Lightweight routing library for React

### Development and Build Tools
- **vite**: Fast build tool and development server
- **typescript**: Static type checking
- **@replit/vite-plugin-runtime-error-modal**: Development error handling
- **esbuild**: Fast JavaScript bundler for production builds

### Data Processing Dependencies
- **date-fns**: Date manipulation and formatting
- **zod**: Runtime type validation and schema parsing
- **class-variance-authority**: Utility for creating type-safe component variants