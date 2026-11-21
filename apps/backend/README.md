# LandConnect API

Express + TypeScript API foundation and PostgreSQL/Prisma data model.

## Prerequisites
- Node.js 22
- PostgreSQL 15 or later

## Setup
From `apps/backend`:

```powershell
npm install
Copy-Item .env.example .env
# Edit .env and set DATABASE_URL to your local PostgreSQL connection
npm run db:validate
npm run db:generate
npm run db:migrate -- --name init
npm run typecheck
npm run dev
```

Test: `Invoke-RestMethod http://localhost:4000/api/health`

The health endpoint checks only that the HTTP process responds; it does **not** verify database connectivity. Prisma models are definitions until migrations are applied. There are no authentication, property, messaging, signaling or calling endpoints in this PR.

### Security notes
Do not commit `.env`, database passwords or service credentials. Production CORS origins must be explicitly configured. Before enabling calls, implement authenticated room membership checks, short-lived LiveKit tokens and server-authorized call state transitions.
