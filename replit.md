# Web Crawler Application

## Overview

This is a full-stack web crawler application built with a React frontend and Express backend. The application allows users to create and manage web crawling jobs that extract content from websites based on configurable regex patterns and settings. The crawler converts web content to markdown format and stores results in a PostgreSQL database using Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and bundling

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Web Scraping**: Puppeteer for browser automation and Cheerio for HTML parsing
- **Content Processing**: TurndownService for HTML to Markdown conversion
- **Session Management**: PostgreSQL-based sessions with connect-pg-simple

## Key Components

### Database Schema
The application uses three main tables:
1. **Users**: Basic user authentication (id, username, password)
2. **Crawl Jobs**: Job configuration and status tracking
   - URL patterns and regex filters
   - Crawling parameters (depth, delays, concurrency)
   - Content processing options
   - Job status and progress tracking
3. **Crawl Results**: Individual page results with content and metadata

### Crawler Service
- **URL Discovery**: Recursively discovers URLs matching regex patterns
- **Content Extraction**: Uses Puppeteer for JavaScript-rendered content
- **Content Processing**: Configurable HTML cleaning and markdown conversion
- **Rate Limiting**: Built-in delays and concurrency controls
- **Error Handling**: Graceful handling of failed pages with error logging

### Storage Layer
- **Interface-based Design**: IStorage interface allows for different storage implementations  
- **Current Implementation**: In-memory storage with file-based persistence for development
- **Data Persistence**: Automatic save/load of crawl jobs and results to prevent data loss during server restarts
- **Production Ready**: Drizzle ORM integration for PostgreSQL persistence

## Recent Changes

### July 23, 2025
- **Fixed Crawler Issues**: Resolved Puppeteer browser configuration and Chrome dependency issues
- **Added Data Persistence**: Implemented file-based storage to prevent data loss during server restarts  
- **Fixed Download Function**: Corrected archiver import and error handling for result downloads
- **Enhanced Error Logging**: Added detailed logging throughout crawler service for better debugging

## Data Flow

1. **Job Creation**: User submits crawling configuration through React form
2. **Validation**: Zod schema validates input on both client and server
3. **Background Processing**: Crawler service runs asynchronously after job creation
4. **Progress Tracking**: Job status and progress updated in real-time
5. **Content Storage**: Extracted content stored as both HTML and Markdown
6. **Result Display**: Results displayed in paginated, searchable interface

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL driver
- **drizzle-orm**: Type-safe ORM for database operations
- **puppeteer**: Headless browser for web scraping
- **cheerio**: Server-side HTML manipulation
- **turndown**: HTML to Markdown conversion
- **archiver**: File compression for result exports

### UI Dependencies
- **@radix-ui/***: Accessible UI component primitives
- **@tanstack/react-query**: Server state management
- **react-hook-form**: Form handling and validation
- **zod**: Runtime type validation
- **tailwindcss**: Utility-first CSS framework

## Deployment Strategy

### Development
- **Dev Server**: Vite development server with HMR
- **Database**: Uses DATABASE_URL environment variable
- **Build Process**: TypeScript compilation with `tsx` for server execution

### Production
- **Frontend Build**: Vite builds optimized React bundle to `dist/public`
- **Backend Build**: esbuild bundles Express server to `dist/index.js`
- **Database Migrations**: Drizzle Kit manages schema migrations
- **Environment**: Requires DATABASE_URL for PostgreSQL connection

### Configuration Files
- **Drizzle Config**: Points to PostgreSQL with schema in `shared/schema.ts`
- **Vite Config**: Configured for React with TypeScript and path aliases
- **Tailwind Config**: Custom theme extending shadcn/ui design system
- **TypeScript Config**: Monorepo setup with shared types between client/server

The application follows a modern full-stack architecture with clear separation of concerns, type safety throughout, and scalable data processing capabilities.