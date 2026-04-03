# GoMate

Production-oriented monorepo for a global carpooling platform. Drivers create one-time or recurring trips; passengers search and book seats.

**This repo is an MVP foundation only.** No chat, payments, ratings, notifications, maps, or advanced business logic yet.

## Tech stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL, Drizzle ORM
- **Monorepo:** pnpm

## Structure

- `artifacts/gomate-web` – React SPA
- `artifacts/api-server` – Express API
- `lib/db` – Drizzle schema and client

## Setup

### Prerequisites

- Node.js 18+
- pnpm 9+
- PostgreSQL (for database)

### Install dependencies

```bash
pnpm install
```

### Environment

Copy `.env.example` to `.env` and adjust:

```bash
cp .env.example .env
```

Required variables:

- `PORT` – API server port (default `3000`)
- `DATABASE_URL` – PostgreSQL connection string
- `VITE_API_BASE_URL` – API base URL for the frontend (e.g. `http://localhost:3000`)

### Run development

- **API only:** `pnpm dev:api`
- **Web only:** `pnpm dev:web`
- **Both:** `pnpm dev`

### Build

```bash
pnpm build
```

### Database (when schema exists)

```bash
pnpm db:generate   # generate migrations
pnpm db:migrate    # run migrations
pnpm db:studio     # Drizzle Studio (optional)
```

## Windows

All scripts use `cross-env` where needed so they work on Windows and Linux. Use PowerShell or Command Prompt as usual.

## License

Private.
