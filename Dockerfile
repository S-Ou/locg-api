FROM node:22-alpine

# better-sqlite3 has no musl prebuilds; node-gyp needs the toolchain
RUN apk add --no-cache python3 make g++

# Use Corepack to activate the pnpm version pinned in package.json (packageManager)
RUN corepack enable \
	&& corepack prepare pnpm@10.13.1 --activate

WORKDIR /usr/src/app

# Only copy lockfile and package manifest first for better caching
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy the rest of the source
COPY . .

ENV NODE_ENV=production

# Default port used in config (can be overridden with -e PORT)
EXPOSE 8000

# Run the start script (package.json start uses tsx)
CMD ["pnpm", "start"]
