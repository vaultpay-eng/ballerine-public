FROM node:18.17.1-bullseye-slim as dev

WORKDIR /app

COPY ./package.json .

RUN npm install --legacy-peer-deps

COPY . .

# RUN mv /app/.env.example /app/.env
RUN rm -f .env

RUN echo "VITE_API_URL=https://ballerine-workflow-service.onrender.com/api/v1/" >> .env && \
    echo "MODE=development" >> .env && \
    echo "VITE_IMAGE_LOGO_URL=https://raw.githubusercontent.com/vault-pay/logo/main/vaultpay-logo-1200.svg" >> .env && \
    echo "VITE_ENVIRONMENT_NAME=local" >> .env && \
    echo "VITE_API_KEY=secret" >> .env

RUN npm run build

ENV PATH="$PATH:./node_modules/.bin"

EXPOSE 5200

CMD ["npm", "run", "dev", "--host"]

FROM nginx:stable-alpine as prod

COPY --from=dev /app/dist /usr/share/nginx/html

COPY example.nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
