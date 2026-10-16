# Production image (Next.js standalone output).
# The build prerenders public pages, so it needs read access to the database:
#   docker build --build-arg WECRUNCH_DATABASE_URL=... --build-arg SITE_URL=https://... -t wecrunch .
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG WECRUNCH_DATABASE_URL
ARG SITE_URL
ENV NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1
RUN node node_modules/prisma/build/index.js generate && node node_modules/next/dist/bin/next build

FROM node:24-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server.js"]
