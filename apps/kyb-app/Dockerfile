FROM node:18.17.1-bullseye-slim as dev

WORKDIR /app

COPY ./package.json .

RUN npm install --legacy-peer-deps

COPY . .

# RUN mv /app/.env.example /app/.env
# Remove any existing .env file
RUN rm -f .env

RUN echo "PORT=80" >> .env && \
echo "VITE_API_URL=https://ballerine-backend.onrender.com/api/v1/" >> .env && \
echo "VITE_KYB_DEFINITION_ID=kyb_parent_kyc_session_example" >> .env && \
echo "VITE_API_KEY=secret" >> .env && \
echo "VITE_ENVIRONMENT_NAME=production" >> .env && \
echo "VITE_DEFAULT_EXAMPLE_TOKEN=12345678-1234-1234-1234-123456789012" >> .env && \
echo "VITE_SENTRY_AUTH_TOKEN=" >> .env && \
echo "VITE_SENTRY_DSN=" >> .env && \
echo "VITE_IMAGE_LOGO_URL=https://raw.githubusercontent.com/vault-pay/logo/main/vaultpay-logo-1200.svg" >> .env

# RUN mv /app/.env.example /app/.env
RUN npm run build

ENV PATH="$PATH:./node_modules/.bin"

EXPOSE 5201

CMD ["npm","run","dev", "--host"]

FROM nginx:stable-alpine as prod

COPY --from=dev /app/dist /usr/share/nginx/html

COPY example.nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
