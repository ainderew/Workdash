# Workdash Client

Next.js + React + Phaser frontend for Workdash.

This repo depends on `workdash-media-server`.

## Local Architecture

- Client (this repo): `http://localhost:8080`
- Media server: `http://localhost:4000`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`
- NATS JetStream: `localhost:4222` (monitoring on `localhost:8222`)

## Prerequisites

- Node.js 20 (v20.x) for builds — `npm run dev` works on Node 20–23, but `npm run build` requires Node 20 (as of Feb 23, 2026)
- Docker (Docker Desktop or OrbStack) with Docker Compose
- `workdash-media-server` checked out locally
- `.env.docker` template at the workspace root (copy to `.env` — see step 1)
- Google OAuth credentials for NextAuth
- GCS bucket + service account key for chat file uploads (required by server startup)

## 1) Start local infrastructure

A `docker-compose.yml` at the workspace root (`workdash-project/`) starts Postgres, Redis, and NATS together.

```bash
cd /Users/AndrewPinon/projects/workdash-project

# First time only — create your local env file from the template
cp .env.docker .env
# Edit .env and fill in values marked "CHANGE ME" (JWT_SECRET, Google OAuth, etc.)

# Start all services
docker compose up -d
```

**OrbStack users:** Docker Compose works the same way — just make sure OrbStack is running first (`open -a OrbStack`).

## 2) Configure and start the media server

Most media server config is handled by the root `.env` file (created in step 1). If you need to override anything locally, create `workdash-media-server/.env` with:

```env
DATABASE_URL=postgresql://workdash:workdash@localhost:5432/workdash
REDIS_URL=redis://localhost:6379
NATS_SERVERS=nats://127.0.0.1:4222
```

Then:

```bash
cd /workdash-media-server
npm install
npx prisma generate
npx prisma db push
npm run dev
```

The server should log:

- `SFU Server running on http://localhost:4000`
- `[broker] Connected to NATS JetStream`

## 3) Configure this client repo

Create `workdash/.env.local`:

```env
NEXT_PUBLIC_SFU_SERVER_URL=http://localhost:4000
NEXTAUTH_URL=http://localhost:8080
NEXTAUTH_SECRET=replace-with-a-random-secret

GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Optional (GIF picker)
# NEXT_PUBLIC_GIPHY_PICKER=your-giphy-api-key
```

Google OAuth setup must include this redirect URI:

- `http://localhost:8080/api/auth/callback/google`

## 4) Run the client

```bash
cd /Users/AndrewPinon/projects/workdash
npm install
npm run dev
```

Open `http://localhost:8080` and sign in with Google.

## Dev Commands

```bash
npm run dev        # next dev on :8080
npm run lint       # eslint + autofix
npm run build      # production build
npm test           # run all tests (vitest)
```

## Testing

Tests use [Vitest](https://vitest.dev/) with jsdom. Run the full suite with:

```bash
npm test
```

Test files live alongside the source they cover (`*.test.ts` / `*.test.tsx`).

**All tests must pass before committing.** If you add or change business logic, add or update the corresponding tests.

## Troubleshooting

- Server exits at startup with a NATS error:
    - Verify NATS is running: `docker compose ps` (from the workspace root).
    - OrbStack users: ensure OrbStack is running (`open -a OrbStack`).
- Server exits with `GCS_* environment variable is required`:
    - Set `GCS_BUCKET_NAME`, `GCS_PROJECT_ID`, and `GOOGLE_APPLICATION_CREDENTIALS`.
- Google sign-in fails:
    - Confirm `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and redirect URI.
- Client cannot connect to SFU:
    - Check `NEXT_PUBLIC_SFU_SERVER_URL` and that server is running on `:4000`.

## Stopping local services

```bash
cd /Users/AndrewPinon/projects/workdash-project

# Stop and remove containers (data is preserved in volumes)
docker compose down

# Stop and remove containers AND delete all data
docker compose down -v
```
