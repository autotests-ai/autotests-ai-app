# Build context: this module. DS runtime is vendor/ds; react-ui is vendor/react-ui.
# VITE_IDP_* are public (client autotests-ai). Empty → dest cloud button hidden.
# Never ARG a secret / IDP_CLIENT_SECRET here.
FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_IDP_CLIENT_ID=
ARG VITE_IDP_AUTHORIZE_URL=
ENV VITE_IDP_CLIENT_ID=$VITE_IDP_CLIENT_ID
ENV VITE_IDP_AUTHORIZE_URL=$VITE_IDP_AUTHORIZE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY vendor/ds/ /tmp/ui-runtime/
COPY --from=build /app/dist /tmp/ui-dist/
RUN rm -rf /usr/share/nginx/html/* \
  && cp -a /tmp/ui-runtime/. /usr/share/nginx/html/ \
  && cp -a /tmp/ui-dist/. /usr/share/nginx/html/ \
  && rm -f /usr/share/nginx/html/README.md \
  && rm -rf /tmp/ui-runtime /tmp/ui-dist
EXPOSE 80
