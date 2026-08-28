# local-echo is installed from Git, so the build image needs the Git client.
ARG BUILD_IMAGE=node:22-bookworm-slim
FROM ${BUILD_IMAGE} AS build

WORKDIR /app

RUN apt-get update && \
  apt-get install -y --no-install-recommends git && \
  rm -rf /var/lib/apt/lists/*

# Install from the shared workspace lockfile for reproducible builds.
COPY package.json package-lock.json ./
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/server/package.json ./packages/server/package.json
RUN npm ci

COPY . .
RUN npm run ui:build

ARG RUNTIME_IMAGE=node:22-alpine
FROM ${RUNTIME_IMAGE}

WORKDIR /app 

# Install only the server's production dependencies in the runtime image.
COPY package.json package-lock.json ./
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/server/package.json ./packages/server/package.json
RUN npm ci --omit=dev --workspace=@ts3-manager/server && \
  npm cache clean --force

COPY --from=build /app/packages/ui/dist ./packages/ui/dist
COPY --from=build /app/packages/server ./packages/server

# the webserver will look for the environment variables "PORT" and "NODE_ENV"
ENV PORT 8080
ENV NODE_ENV=production

# the webserver port
EXPOSE ${PORT}

# starts the webserver (backend)
# info: in the exec form it is not possible to access environment variables
CMD ["npm", "run", "server:start"]
