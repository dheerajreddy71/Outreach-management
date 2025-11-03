# Unified Multi-Channel Customer Outreach Platform

This is a comprehensive Next.js application for team-based customer engagement across multiple channels.

## Project Structure

- `/app` - Next.js 14+ App Router pages and API routes
- `/components` - React components (UI, inbox, analytics)
- `/lib` - Utilities, integrations, auth helpers
- `/prisma` - Database schema and migrations
- `/types` - TypeScript type definitions

## Tech Stack

- Next.js 14+ with TypeScript and App Router
- Prisma ORM with PostgreSQL
- Better Auth for authentication
- Twilio SDK for SMS/WhatsApp
- Tailwind CSS for styling
- React Query for data management
- Zod for validation

## Development Guidelines

- Use TypeScript strict mode
- Follow ESLint and Prettier rules
- Document functions with JSDoc
- Validate inputs with Zod schemas
- Use React Query for API calls
- Implement optimistic updates
- Handle errors gracefully
