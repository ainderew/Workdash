# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN mkdir -p public && npm ci

# Dev target — full source + deps, no build step
FROM node:20-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["npm", "run", "dev"]

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copy RNNoise WASM (postinstall ran in deps stage, but its public/ is separate)
RUN cp node_modules/@jitsi/rnnoise-wasm/dist/rnnoise.wasm public/rnnoise.wasm

# Build args for NEXT_PUBLIC_ env vars (baked in at build time)
ARG NEXT_PUBLIC_SERVER_URL
ARG NEXT_PUBLIC_SFU_SERVER_URL
ARG NEXT_PUBLIC_GIPHY_PICKER
ARG NEXT_PUBLIC_UMAMI_URL
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID

ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build-nolog

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 8080
CMD ["node", "server.js"]
