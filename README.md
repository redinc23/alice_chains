# Alice Chains

A modern, dark-themed real-time messaging platform built with React, tRPC, Drizzle ORM, and Socket.IO.

## Features

- **Real-time messaging** via Socket.IO with typing indicators and read receipts
- **1-on-1 and group conversations** with participant management
- **Contact system** with friend requests (pending/accepted/blocked states)
- **Online presence** tracking with live status indicators
- **Dark theme** UI with glassmorphism panels and smooth animations
- **Mobile-responsive** design with collapsible sidebar
- **OAuth 2.0 authentication** with JWT sessions

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Hono + tRPC 11 + Drizzle ORM + MySQL
- **Real-time**: Socket.IO with room-based broadcasting
- **Auth**: OAuth 2.0 (Kimi) with JWT sessions

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | Auth-managed user accounts |
| `conversations` | Chat rooms (direct + group) |
| `conversation_participants` | Many-to-many user-conversation links |
| `messages` | Chat messages with types |
| `message_reads` | Read receipts per message |
| `contacts` | Friend relationships |

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables (see .env.example)

# Push database schema
npm run db:push

# Start development server
npm run dev
```

## Project Structure

```
├── api/              # Backend API (tRPC routers, Socket.IO, auth)
├── db/               # Database schema and relations
├── contracts/        # Shared types (frontend + backend)
├── src/
│   ├── pages/        # Route pages (Chat, Contacts, Login)
│   ├── hooks/        # Custom hooks (useAuth, useSocket)
│   ├── components/   # UI components (AuthLayout)
│   └── providers/    # tRPC provider
└── public/           # Static assets
```

## License

MIT
