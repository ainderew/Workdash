# Self-hosted analytics (Umami)

Umami is cookieless and stores no personal data, so WorkDash needs no consent
banner. This runs it on the same droplet that serves the app.

Everything below runs **on the droplet**. Nothing here is automated by the
deploy workflow — the workflow only bakes the two public env vars into the
client bundle once you set them in step 5.

## 1. DNS

Add an A record pointing `analytics.workdash.site` at the droplet's IP, the
same address `workdash.site` resolves to.

## 2. Bring up Umami and its database

Create `/opt/umami/docker-compose.yml`:

```yaml
services:
  umami-db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: CHANGE_ME_DB_PASSWORD
    volumes:
      - umami-db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U umami"]
      interval: 10s
      timeout: 5s
      retries: 10

  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    restart: unless-stopped
    depends_on:
      umami-db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://umami:CHANGE_ME_DB_PASSWORD@umami-db:5432/umami
      DATABASE_TYPE: postgresql
      APP_SECRET: CHANGE_ME_LONG_RANDOM_STRING
    # Bound to loopback only; nginx terminates TLS in front of it.
    ports:
      - "127.0.0.1:3001:3000"

volumes:
  umami-db-data:
```

Generate the two secrets with `openssl rand -hex 32`, then:

```bash
cd /opt/umami && docker compose up -d
```

> The app's own containers use `--network host`. Umami here uses a compose
> network and publishes only to `127.0.0.1:3001`, so it cannot collide with the
> app on 8080 and is not reachable from the internet except through nginx.

## 3. nginx

Add a server block, then reload:

```nginx
server {
    listen 80;
    server_name analytics.workdash.site;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
nginx -t && systemctl reload nginx
certbot --nginx -d analytics.workdash.site
```

## 4. Create the site in Umami

Open `https://analytics.workdash.site`. Sign in with the default
`admin` / `umami` and **change the password immediately** — this instance is
on the public internet.

Then Settings → Websites → Add website, with domain `workdash.site`. Copy the
**Website ID** it generates.

## 5. Point the app at it

In the GitHub repo: Settings → Secrets and variables → Actions → Variables,
add two **repository variables** (not secrets — they are public values baked
into the client bundle):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_UMAMI_URL` | `https://analytics.workdash.site` |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | the ID from step 4 |

Redeploy. Until both exist, `Analytics.tsx` renders nothing and no request is
made, so the site works exactly as it does today.

## Verifying

Load `https://workdash.site`, then check that a request to
`analytics.workdash.site/script.js` returns 200 and that the visit appears on
the Umami dashboard within a few seconds.

## Upkeep

This is yours to maintain: `docker compose pull && docker compose up -d` in
`/opt/umami` for updates, and the Postgres volume is the thing to back up if
the numbers ever matter to you.
