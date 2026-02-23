# Workdash Client

Next.js + React + Phaser frontend for Workdash.

This repo depends on `workdash-media-server`.

## Local Architecture

- Client (this repo): `http://localhost:8080`
- Media server: `http://localhost:4000`
- Postgres: `localhost:5432`
- NATS JetStream: `localhost:4222` (monitoring on `localhost:8222`)

## Prerequisites

- Node.js 20 (v20.x) for builds — `npm run dev` works on Node 20–23, but `npm run build` requires Node 20 (as of Feb 23, 2026)
- Docker (Docker Desktop or OrbStack)
- `workdash-media-server` checked out locally
- Google OAuth credentials for NextAuth
- GCS bucket + service account key for chat file uploads (required by server startup)

## 1) Start local infrastructure

Run once:

```bash
docker volume create workdash-postgres-data
```

Run Postgres:

```bash
docker run --name workdash-postgres -d \
  -e POSTGRES_DB=workdash_dev \
  -e POSTGRES_USER=workdash_dev_admin \
  -e POSTGRES_PASSWORD=qwe123.. \
  -p 5432:5432 \
  -v workdash-postgres-data:/var/lib/postgresql/data \
  postgres:16
```

Run NATS JetStream:

```bash
docker run --name workdash-nats -d \
  -p 4222:4222 \
  -p 8222:8222 \
  nats:2.10 -js
```

**OrbStack users:** The same `docker` commands work — OrbStack is a drop-in Docker replacement. Just make sure OrbStack is running first (`open -a OrbStack`). You can also use `orb` to manage containers:

```bash
# Start stopped containers
orb start workdash-postgres
orb start workdash-nats
```

## 2) Configure and start the media server

In `workdash-media-server/.env` set:

```env
PUBLIC_IP=127.0.0.1

DATABASE_URL=postgresql://workdash_dev_admin:qwe123..@localhost:5432/workdash_dev

JWT_SECRET=replace-with-a-random-secret
JWT_EXPIRES_IN=7d

NATS_SERVERS=nats://127.0.0.1:4222

GCS_BUCKET_NAME=your-bucket
GCS_PROJECT_ID=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account-key.json

# Optional
# CHAT_FILE_PURGE_INTERVAL_MS=300000
# CHAT_FILE_PURGE_RETENTION_MS=604800000
# CHAT_FILE_PURGE_BATCH_SIZE=100
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
```

## Troubleshooting

- Server exits at startup with a NATS error:
    - Verify NATS is running on `127.0.0.1:4222`.
    - OrbStack users: ensure OrbStack is running (`open -a OrbStack`) and the container is started (`docker start workdash-nats`).
- Server exits with `GCS_* environment variable is required`:
    - Set `GCS_BUCKET_NAME`, `GCS_PROJECT_ID`, and `GOOGLE_APPLICATION_CREDENTIALS`.
- Google sign-in fails:
    - Confirm `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and redirect URI.
- Client cannot connect to SFU:
    - Check `NEXT_PUBLIC_SFU_SERVER_URL` and that server is running on `:4000`.

## Stopping local services

```bash
docker stop workdash-postgres workdash-nats
docker rm workdash-postgres workdash-nats
```
