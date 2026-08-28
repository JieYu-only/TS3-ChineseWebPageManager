# package local-echo needs git for installation
# alpine image of node does not have git installed
ARG BUILD_IMAGE=node:16
FROM ${BUILD_IMAGE} as build

# create the directory "app" inside the docker image and set it to the default directory
WORKDIR /app 

# copy the files into the workdir (node_modules are excluded by ignore file)
COPY . . 

# download all the packages for the ui and the server
# build app for production with minification
RUN npm install --prefix ./packages/ui && \
  npm run build --prefix ./packages/ui && \
  npm install --prefix ./packages/server

ARG RUNTIME_IMAGE=node:22-alpine
FROM ${RUNTIME_IMAGE}

WORKDIR /app 

COPY --from=build /app/packages/ui/dist ./packages/ui/dist
COPY --from=build /app/packages/server ./packages/server

# the webserver will look for the environment variables "PORT" and "NODE_ENV"
ENV PORT 8080
ENV NODE_ENV=production

# the webserver port
EXPOSE ${PORT}

# starts the webserver (backend)
# info: in the exec form it is not possible to access environment variables
CMD ["npm", "start", "--prefix", "./packages/server"]
