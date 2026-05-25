# --- Stage 1: Dependencies ---
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# --- Stage 2: Builder ---
FROM node:22-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_STRAPI_URL
ENV NEXT_PUBLIC_STRAPI_URL=${NEXT_PUBLIC_STRAPI_URL}

# Production has hardcoded fallbacks for these (lib/tracking/config.ts,
# lib/seo.ts); the ARGs exist so staging/preview builds can override
# them. Without the ARG, compose's --build-arg would be silently
# dropped and the override would have no effect.
ARG NEXT_PUBLIC_GA_ID
ENV NEXT_PUBLIC_GA_ID=${NEXT_PUBLIC_GA_ID}
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

# Feature flag read by client components (e.g. AuthButtons). Next.js inlines
# NEXT_PUBLIC_* into the browser bundle at `next build`, so it must arrive
# as a build arg — runtime env is too late. Ops deploy forwards this from
# the GitHub secret of the same name.
ARG NEXT_PUBLIC_AUTH_ENABLED=true
ENV NEXT_PUBLIC_AUTH_ENABLED=${NEXT_PUBLIC_AUTH_ENABLED}

# Deployed-commit signature for the footer. next.config.ts reads BUILD_SHA
# and inlines it as NEXT_PUBLIC_BUILD_SHA at build time. The ops deploy
# already receives the commit as `sha`; it just needs to forward it as
# `--build-arg BUILD_SHA=<sha>`. Unset → footer omits the line.
ARG BUILD_SHA
ENV BUILD_SHA=${BUILD_SHA}

# Search-engine ownership verification tokens are emitted by
# app/layout.tsx's `metadata.verification`. Next.js evaluates that at
# `next build` time (the home page is statically pre-rendered), so the
# values must reach the build stage as ARGs — runtime container env
# arrives too late and the meta tags are baked out as absent.
ARG GOOGLE_SITE_VERIFICATION
ENV GOOGLE_SITE_VERIFICATION=${GOOGLE_SITE_VERIFICATION}
ARG BING_SITE_VERIFICATION
ENV BING_SITE_VERIFICATION=${BING_SITE_VERIFICATION}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# --- Stage 3: Runner ---
FROM node:22-alpine AS runner
WORKDIR /app

ARG NEXT_PUBLIC_STRAPI_URL
ENV NEXT_PUBLIC_STRAPI_URL=${NEXT_PUBLIC_STRAPI_URL}

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
# Copy static assets (JS/CSS bundles, images)
COPY --from=builder /app/.next/static ./.next/static
# Copy public directory (favicon, robots.txt, etc.)
COPY --from=builder /app/public ./public

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000 || exit 1

CMD ["node", "server.js"]
