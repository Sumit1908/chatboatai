# WhatsApp Broadcasting Platform

## Overview

This is an enterprise-grade WhatsApp broadcasting web application built for managing message templates, campaigns, and real-time message delivery tracking via the Meta WhatsApp Business API. The platform features a dashboard with analytics, template management with approval workflows, campaign scheduling and execution, message tracking with delivery status updates, and API settings configuration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is a React single-page application using TypeScript with the following key decisions:

- **Routing**: Uses `wouter` for lightweight client-side routing instead of React Router
- **State Management**: TanStack React Query for server state, with optimistic updates and caching
- **UI Framework**: shadcn/ui component library built on Radix UI primitives, following Carbon Design System principles for data-dense enterprise interfaces
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode support)
- **Forms**: React Hook Form with Zod validation via @hookform/resolvers
- **Charts**: Recharts library for data visualization (area charts, bar charts, pie charts)

### Backend Architecture

The backend is an Express.js server running on Node.js with TypeScript:

- **API Design**: RESTful endpoints under `/api/*` prefix for all data operations
- **WebSocket**: Real-time updates via WebSocket server at `/ws` path using the `ws` package
- **Server Structure**: Single entry point (`server/index.ts`) with routes registered in `server/routes.ts`
- **Storage Layer**: `DatabaseStorage` class in `server/storage.ts` implementing `IStorage` interface with PostgreSQL-backed CRUD via Drizzle ORM for all entities
- **Static Serving**: Production builds served from `dist/public`, with Vite dev server middleware in development
- **Build Process**: Custom build script using esbuild for server bundling and Vite for client bundling
- **Validation**: Zod schemas for all PATCH/PUT endpoints ensuring type-safe updates

### Real-Time Architecture

The platform uses WebSocket for real-time updates:

- **Server**: WebSocket server attached to HTTP server at `/ws` path
- **Client**: `useWebSocket` hook in `client/src/hooks/use-websocket.ts` with auto-reconnect
- **Events**: 
  - `message-status-update`: Message delivery status changes
  - `template-updated`: Template status changes
  - `campaign-updated`: Campaign progress updates
  - `activity-added`: New activity feed entries
  - `settings-updated`: API configuration changes
- **Cache Invalidation**: WebSocket events automatically invalidate TanStack Query caches

### Data Layer

- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Defined in `shared/schema.ts` with Zod validation schemas generated via `drizzle-zod`
- **Migrations**: Drizzle Kit configured to output migrations to `./migrations` directory
- **Key Entities (all PostgreSQL-backed)**: Users, Templates (with approval statuses), Campaigns (with execution states), Messages (with delivery tracking), CampaignMetrics, ApiSettings, WhatsAppAccounts, Contacts, ContactLists, ContactTags, Conversations, ConversationMessages, Notifications, Activities, ActiveAccounts

### Multi-Account Support

The platform supports multiple WhatsApp Business numbers with account switching:
- **Account Switcher**: Dropdown in sidebar header to switch between connected WhatsApp numbers
- **Data Scoping**: Contacts, lists, tags, conversations, and notifications are scoped to the active account
- **Account Verification**: All update/delete operations verify accountId before allowing mutations
- **Account Creation**: Facebook OAuth flow for connecting new WhatsApp Business accounts with full backend integration

### Known Limitations (MVP)
- Active account selection is stored in memory only (resets on server restart)
- Dashboard analytics are global, not yet filtered by active account

### Authentication & Subscription

- **Authentication**: Replit Auth with Google login support via `/api/login` and `/api/logout` endpoints
- **User Model**: Extended user schema with roles (super_admin, admin, user), subscription status (trial, active, canceled, expired), payment tracking (hasPaid, grantedFreeAccess), and trial end date
- **Access Control**: Regular users require active subscription or free access grant; super_admin can view all users and grant free access
- **Pricing**: ₹799/month subscription with 7-day free trial

### Public Pages

- **Landing Page** (`/`): Hero section, features showcase, pricing card with ₹799/month, and CTAs for login/signup
- **Privacy Policy** (`/privacy`): Standard privacy policy for payment gateway compliance
- **Terms of Service** (`/terms`): Service terms including subscription and usage policies
- **Refund Policy** (`/refund`): 7-day money-back guarantee policy
- **Contact Us** (`/contact`): Contact form with email, phone, and address information

### Recent Changes (January 2026)

- Integrated Replit Auth for user authentication with Google login
- Created landing page with marketing content and ₹799/month pricing
- Created legal pages (Privacy, Terms, Refund, Contact) for payment gateway verification
- Updated user schema to support roles and subscription management
- Removed sample data for production readiness
- Added multi-account support with account switcher in sidebar
- Created Inbox page for 2-way messaging with conversation list and message threads
- Created Contacts page with contacts table, lists management, and tags
- Created Notifications page for broadcast scheduling and delivery tracking
- All contact-related data is now scoped per WhatsApp account
- Implemented collapsible sidebar sections for Contacts (Contacts, Lists, Tags, Import/Export) and Notifications (Notifications, Add New)
- Created full-page Template Editor with media headers (text/image/video/document), body with formatting, footer, and interactive buttons (QUICK_REPLY, URL, PHONE_NUMBER)
- Created full-page Notification Editor with template selection, recipient targeting via contact lists, scheduling, and live preview
- Split Contacts into dedicated pages: main contacts table, lists management, tags management, and import/export with CSV upload
- Enhanced Settings page with collapsible step-by-step Setup Guide for WhatsApp API integration, including resource links to Meta documentation
- Fixed SelectItem component empty value bug that caused blank page rendering on Import/Export and Notification Editor pages
- Implemented Facebook OAuth flow for adding WhatsApp Business accounts with full token exchange and account creation
- Added secure file upload system with multer for media attachments in templates
  - WhatsApp-compliant size limits: 5MB images, 16MB videos, 100MB documents
  - MIME type and extension validation to prevent type spoofing
  - Ownership-based authorization for file deletion (users can only delete their own files)
  - Path traversal protection and filename format validation
- Created GDPR-compliant data deletion page at `/delete-data` for users to request account deletion
- Dashboard now shows real data from database and Meta API (quality rating, messaging limits, chart data from actual messages)
- Inbox defaults to showing only conversations with customer replies (filter=replied), with toggle for All Conversations
- Added team member/account sharing system: invite by email, auto-accept on login, shared accounts appear in account switcher
- Simplified number registration: "Detect Phone Numbers" auto-discovers numbers from WABA ID + Access Token before manual entry
- Analytics: Failed stat is clickable, shows dialog with all failed message phone numbers, error codes, and CSV download
- Notification Report page: `/notifications/:id/report` with full delivery breakdown charts, message-level detail table with status filtering, and CSV export
- Template media auto-reuse: Notification editor auto-uses image/video/document from template components, no re-upload needed
- Inbox Active/Closed tabs properly handle null conversation statuses (default to "open")
- Fixed messaging limit tier mapping: added TIER_2K (2,000), TIER_NOT_SET, and complete Meta API tier coverage
- Professional UI overhaul: redesigned dashboard with compact KPI cards, messaging capacity visualization with tier progression, consistent page headers with tracking-tight typography across all pages
- Unified stat card patterns across dashboard, notifications, and analytics pages

### Development vs Production

- **Development**: Vite dev server with HMR, runtime error overlay, and Replit-specific plugins
- **Production**: Pre-built static assets served by Express, server code bundled with esbuild

## External Dependencies

### Meta WhatsApp Business API

Primary external integration for:
- Template submission and status synchronization (PENDING, APPROVED, REJECTED, DISABLED, PAUSED)
- Message sending and delivery status webhooks (queued, sent, delivered, read, failed)
- Quality score tracking for templates

### Database

- **PostgreSQL**: Primary database accessed via `DATABASE_URL` environment variable
- **Sessions**: `connect-pg-simple` for session storage in PostgreSQL

### Third-Party Libraries

- **UI Components**: Full shadcn/ui component set with Radix primitives
- **Date Handling**: date-fns for date formatting and manipulation
- **Validation**: Zod for runtime type validation across client and server
- **HTTP Client**: Native fetch API wrapped in custom `apiRequest` utility