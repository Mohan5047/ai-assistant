# Personal AI Life Assistant — Complete Production System (Parts 1, 2 & 3)

A production-oriented, full-stack Personal AI Life Assistant built as a unified TypeScript monorepo using npm workspaces. It enables users to organize tasks, manage calendar events, receive timely push and email reminders, plan their daily schedule, and interact with a tool-calling AI assistant through modern Web and Mobile clients.

---

## 1. System Architecture

```mermaid
flowchart TD
    subgraph Clients["Client Layer"]
        Web["Web Client (React 19, TypeScript, Vite, Tailwind/CSS Variables)"]
        Mobile["Mobile Client (React Native 0.76, Expo SDK 52, Expo Router)"]
    end

    subgraph Backend["API & Orchestration Layer (Node.js & Express)"]
        API["Express API Server (Port 3000)"]
        AuthMid["Auth Middleware (JWT Cookie / Bearer Token)"]
        ZodVal["Zod Request Validation"]
        
        subgraph Services["Core Domain Services"]
            AuthSvc["Auth & GDPR Service (BCrypt, SHA-256 Reset Tokens)"]
            EventSvc["Event Service (Local & Google Cal Events)"]
            TaskSvc["Task Service (Priority, Deadlines, Statuses)"]
            DashSvc["Dashboard Aggregator (Stats, Briefings)"]
            AISvc["AI Orchestrator (Function Calling, Daily Planner, Destructive Guards)"]
            SyncSvc["Google Calendar Sync Engine (AES-256-GCM Tokens)"]
            NotifSvc["Notification Service (Push Devices & Quiet Hours)"]
        end
    end

    subgraph Workers["Asynchronous Worker Layer (BullMQ & Redis)"]
        Worker["Standalone Background Worker Process"]
        ReminderQ["BullMQ Reminder Queue"]
        SyncQ["BullMQ Calendar Sync Queue"]
        PushSvc["Expo Push Notification Service"]
        EmailSvc["SMTP / Nodemailer Email Service"]
    end

    subgraph Storage["Persistence & External Services"]
        PG[("Cloud PostgreSQL (Prisma ORM)")]
        Redis[("Redis 7 (Queue & Cache)")]
        GoogleAPI["Google Calendar API (OAuth 2.0 / Incremental Sync)"]
        LLM["Large Language Model API (Tool Calling / Function Exec)"]
        ExpoPush["Expo Push Server API"]
    end

    Web -->|HTTP / REST + Cookie| API
    Mobile -->|HTTP / REST + Bearer Token| API

    API --> AuthMid
    AuthMid --> ZodVal
    ZodVal --> Services

    Services -->|Prisma Client| PG
    Services -->|Queue Jobs| Redis
    Services -->|Tool Calls| LLM
    Services -->|OAuth / Sync| GoogleAPI

    Redis --> ReminderQ
    Redis --> SyncQ
    ReminderQ --> Worker
    SyncQ --> Worker

    Worker -->|Fetch Due Reminders| PG
    Worker -->|Dispatch Push| PushSvc
    Worker -->|Dispatch Email| EmailSvc
    PushSvc -->|HTTP API| ExpoPush
```

---

## 2. Monorepo Structure

```
personal-ai-assistant/
├── apps/
│   ├── api/                       # Express REST API, Prisma schema, background worker
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # Models: User, Event, Task, Reminder, CalendarConnection, AiThread, Device, PasswordResetToken
│   │   │   └── migrations/        # Immutable SQL migrations
│   │   ├── src/
│   │   │   ├── config/            # Environment validation (Zod) & Prisma singleton
│   │   │   ├── controllers/       # HTTP controllers (auth, events, tasks, dashboard, ai, calendar, notifications)
│   │   │   ├── middleware/        # Authentication, Zod validation, error handler, rate limit
│   │   │   ├── routes/            # REST route definitions
│   │   │   ├── services/          # Core business logic:
│   │   │   │   ├── ai/            # Tool calling orchestrator, relative date parser, planner
│   │   │   │   ├── calendar/      # Google Calendar sync engine with AES-256 token encryption
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── event.service.ts
│   │   │   │   ├── task.service.ts
│   │   │   │   ├── notification.service.ts
│   │   │   │   └── dashboard.service.ts
│   │   │   ├── jobs/              # BullMQ queue definitions, push service, email service
│   │   │   ├── utils/             # AES-256 encryption, logger, JWT, async wrapper
│   │   │   ├── tests/             # 10 test suites (62 unit & integration tests)
│   │   │   ├── app.ts             # Express app setup & middleware pipeline
│   │   │   ├── server.ts          # Main HTTP server entrypoint
│   │   │   └── worker.ts          # Standalone BullMQ worker entrypoint
│   │   ├── Dockerfile             # Multi-stage production Docker build
│   │   └── package.json
│   ├── web/                       # Web Client (React 19, TypeScript, Vite)
│   │   ├── src/
│   │   │   ├── components/        # Component UI library (Button, Card, Input, Modal, Badge, etc.)
│   │   │   ├── context/           # AuthContext & ThemeContext
│   │   │   ├── lib/               # Typed API client & date formatting helpers
│   │   │   ├── pages/             # Dashboard, Calendar, Tasks, AiChat, Settings, Login, Register
│   │   │   ├── App.tsx            # Protected client-side routing
│   │   │   └── main.tsx           # Web entrypoint
│   │   ├── nginx.conf             # Nginx configuration for production SPA routing
│   │   ├── Dockerfile             # Multi-stage build + Nginx runner
│   │   └── package.json
│   └── mobile/                    # Mobile Client (React Native 0.76, Expo SDK 52)
│       ├── app/                   # Expo Router screens:
│       │   ├── _layout.tsx        # Root navigation stack & providers
│       │   ├── index.tsx          # Authentication router
│       │   ├── welcome.tsx        # Onboarding hero screen
│       │   ├── login.tsx          # Email/Password + Google login
│       │   ├── register.tsx       # Registration with timezone detection
│       │   ├── forgot-password.tsx# Password reset request
│       │   ├── google-signin.tsx  # Google OAuth token exchange
│       │   ├── (tabs)/            # Tab Navigation:
│       │   │   ├── dashboard.tsx  # Personalized greeting, metrics, today's schedule, AI briefing
│       │   │   ├── calendar.tsx   # Agenda view, day navigation, Google badges
│       │   │   ├── tasks.tsx      # Task list, status filters, priority badges, completion toggle
│       │   │   ├── ai.tsx         # AI chat, prompt suggestion chips, tool execution feedback
│       │   │   └── settings.tsx   # Settings hub, profile, appearance, integrations
│       │   ├── event/             # Event creation & detail views
│       │   ├── task/              # Task creation & detail views
│       │   ├── daily-plan.tsx     # AI daily planning timeline
│       │   ├── notifications.tsx  # Push notifications, quiet hours across midnight, test push
│       │   ├── profile.tsx        # Profile edit, GDPR JSON export, account deletion modal
│       │   └── calendar-status.tsx# Google Calendar sync status & manual trigger
│       ├── src/
│       │   ├── components/ui/     # Native UI Kit: Button, Input, Card, Badge, Header, EmptyState
│       │   ├── context/           # ThemeContext (Light/Dark) & AuthContext (SecureStore token)
│       │   └── lib/               # Typed MobileApiClient & Expo Notifications helper
│       ├── eas.json               # EAS Build configuration (development, preview, production)
│       └── package.json
├── packages/
│   └── shared/                    # Shared contracts, Zod schemas, TypeScript types, constants
│       ├── src/
│       │   ├── schemas/           # Zod validation schemas
│       │   ├── types/             # Domain TypeScript interfaces and enums
│       │   └── constants.ts       # Shared constants
│       └── package.json
├── docker-compose.yml             # Orchestration for Postgres, Redis, API, Worker, and Web
├── package.json                   # Root workspace scripts
└── tsconfig.base.json             # Base strict TypeScript config
```

---

## 3. Prerequisites

- **Node.js**: `>= 20.0.0`
- **npm**: `>= 10.0.0`
- **PostgreSQL**: Cloud instance (Neon, Supabase, Railway) or local Docker container
- **Redis**: `>= 6.0.0` (for BullMQ queue and reminder processing)
- **Expo Go App** (optional): For previewing on physical iOS / Android devices

---

## 4. Environment Configuration

### Backend (`apps/api/.env`)
Create `apps/api/.env` with the following variables:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/assistant_db?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=super-secret-jwt-key-min-32-chars-long
JWT_EXPIRES_IN=7d
TOKEN_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
CORS_ORIGIN=http://localhost:5173,http://localhost
APP_URL=http://localhost:5173

# Optional: AI Provider Key (OpenAI or compatible)
OPENAI_API_KEY=your-api-key

# Optional: Google Calendar OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/google/callback

# Optional: SMTP Server for Email Reminders
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-user
SMTP_PASS=your-pass
SMTP_FROM="Personal Assistant" <reminders@example.com>
```

### Web (`apps/web/.env`)
```env
VITE_API_URL=http://localhost:3000/api
```

### Mobile (`apps/mobile/.env`)
```env
# For local Android emulator use http://10.0.2.2:3000/api
# For iOS simulator or LAN device use your machine IP: http://192.168.x.x:3000/api
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

---

## 5. Development & Running

### 1. Install Dependencies & Build Shared Package
```bash
npm install
npm run build:shared
```

### 2. Database Migrations
```bash
npm run db:generate
npm run db:migrate
```

### 3. Start Development Servers
You can run services independently in separate terminals:
```bash
# Terminal 1: Backend API Server
npm run dev:api

# Terminal 2: Standalone BullMQ Worker Process
npm run dev:worker

# Terminal 3: Web Application (Vite)
npm run dev:web

# Terminal 4: Mobile Application (Expo)
npm run dev:mobile
```

---

## 6. Testing & Quality Verification

The repository includes a comprehensive automated test suite verifying auth, events, tasks, AI tool calling, daily planning, Google Calendar encryption, reminder idempotency, device registration, quiet hours, GDPR export, and cascading account deletion:

```bash
# Run all 62 backend test suites
npm test

# Run strict TypeScript typecheck across all 3 workspaces (api, web, mobile)
npm run typecheck

# Build all production bundles (shared, api, web)
npm run build
```

---

## 7. Production Deployment

### Option A: Docker Compose (All Services)
To build and launch the complete stack (PostgreSQL, Redis, API, Standalone Worker, and Nginx-served Web frontend):
```bash
docker compose up --build -d
```
- Web Application: `http://localhost`
- API & Health Check: `http://localhost:3000/api/health/ready`

### Option B: Mobile EAS Builds
To build native binaries for iOS and Android via Expo Application Services:
```bash
cd apps/mobile
npx eas-cli build --profile preview --platform all
```

---

## 8. REST API Endpoint Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/health` | Service liveness health check | No |
| `GET` | `/api/health/ready` | Readiness check (DB & Redis ping) | No |
| `POST` | `/api/auth/register` | Register user account | No |
| `POST` | `/api/auth/login` | Authenticate user (Cookie or Bearer token) | No |
| `POST` | `/api/auth/google` | Sign in with Google ID token | No |
| `POST` | `/api/auth/forgot-password` | Request password reset token | No |
| `POST` | `/api/auth/reset-password` | Set new password with reset token | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Yes |
| `PATCH` | `/api/auth/profile` | Update profile (name, timezone, language) | Yes |
| `GET` | `/api/auth/export-data` | Full GDPR JSON data archive | Yes |
| `DELETE` | `/api/auth/account` | Permanent account deletion with password | Yes |
| `POST` | `/api/auth/logout` | Clear session / invalidate token | Yes |
| `GET` | `/api/dashboard/summary` | Aggregated metrics, today's schedule, AI briefing | Yes |
| `GET` | `/api/events` | List events with filtering & pagination | Yes |
| `POST` | `/api/events` | Create new event | Yes |
| `GET` | `/api/events/:id` | Get event details | Yes |
| `PATCH` | `/api/events/:id` | Update event | Yes |
| `DELETE` | `/api/events/:id` | Delete event | Yes |
| `GET` | `/api/tasks` | List tasks with status/priority filtering | Yes |
| `POST` | `/api/tasks` | Create new task | Yes |
| `GET` | `/api/tasks/:id` | Get task details | Yes |
| `PATCH` | `/api/tasks/:id` | Update task | Yes |
| `POST` | `/api/tasks/:id/complete`| Toggle / mark task completed | Yes |
| `DELETE` | `/api/tasks/:id` | Delete task | Yes |
| `POST` | `/api/ai/chat` | Natural language chat with tool execution | Yes |
| `GET` | `/api/ai/daily-plan` | AI-generated daily schedule plan | Yes |
| `GET` | `/api/calendar/google/auth-url` | Generate Google OAuth authorization URL | Yes |
| `GET` | `/api/calendar/google/status` | Connection status and sync timestamps | Yes |
| `POST` | `/api/calendar/sync` | Trigger two-way Google Calendar synchronization | Yes |
| `POST` | `/api/calendar/google/disconnect` | Disconnect Google Calendar integration | Yes |
| `POST` | `/api/notifications/devices` | Register mobile push token (`expo-notifications`) | Yes |
| `DELETE` | `/api/notifications/devices/:token` | Unregister mobile device token | Yes |
| `GET` | `/api/notifications/preferences` | Get push/email and quiet hours preferences | Yes |
| `PUT` | `/api/notifications/preferences` | Update push/email and quiet hours preferences | Yes |
| `POST` | `/api/notifications/test-push` | Send diagnostic test push notification | Yes |
