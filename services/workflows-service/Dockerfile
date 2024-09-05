FROM node:18.17.1-bullseye-slim as dev

RUN apt-get update
RUN apt-get install dumb-init

WORKDIR /app

ARG RELEASE
ENV RELEASE=${RELEASE:-unknown}
ARG SHORT_SHA
ENV SHORT_SHA=${SHORT_SHA}

COPY ./package.json .

RUN npm install --legacy-peer-deps

COPY . .

# Create a new .env file and populate it with environment variables
RUN echo "PORT=3000" >> .env && \
    echo "BACKOFFICE_PORT=5137" >> .env && \
    echo "WORKFLOW_DASHBOARD_PORT=5200" >> .env && \
    echo "KYB_APP_PORT=5201" >> .env && \
    echo "BACKOFFICE_CORS_ORIGIN=https://ballerine-back-office.onrender.com" >> .env && \
    echo "WORKFLOW_DASHBOARD_CORS_ORIGIN=https://ballerine-workflow-service.onrender.com" >> .env && \
    echo "KYB_EXAMPLE_CORS_ORIGIN=https://ballerine-workflow-service.onrender.com" >> .env && \
    echo "APP_API_URL=https://ballerine-workflow-service.onrender.com" >> .env && \
    echo "BCRYPT_SALT=10" >> .env && \
    echo "SESSION_EXPIRATION_IN_MINUTES=30" >> .env && \
    echo "DB_URL=postgres://admin:admin@ballerine-postgres:5432/postgres" >> .env && \
    echo "DB_USER=admin" >> .env && \
    echo "DB_PASSWORD=admin" >> .env && \
    echo "DB_PORT=5432" >> .env && \
    echo "ADMIN_API_KEY=admin_secret" >>  .env && \
    echo "API_KEY=secret" >> .env && \
    echo "NODE_ENV=development" >> .env && \
    echo "COMPOSE_PROJECT_NAME=ballerine-x" >> .env && \
    echo "SESSION_SECRET=secret" >> .env && \
    echo "EMAIL_API_TOKEN=''" >> .env && \
    echo "EMAIL_API_URL=https://api.sendgrid.com/v3/mail/send" >> .env && \
    echo "UNIFIED_API_URL=http://ballerine-workflow-service.onrender.com" >> .env && \
    echo "ENVIRONMENT_NAME=development" >> .env && \
    echo "HASHING_KEY_SECRET=secret" >> .env && \
    echo "HASHING_KEY_SECRET_BASE64=JDJiJDEwJEdSUHhqQXQ2aGtYcGQxQ2NNcmxvZnU=" >> .env && \
    echo "NOTION_API_KEY=secret" >> .env && \
    echo "DOMAIN_NAME=http://ballerine-workflow-service.onrender.com" >> .env && \
    echo "VITE_API_URL=http://ballerine-workflow-service.onrender.com/api/v1/" >> .env && \
    echo "WEBHOOK_SECRET=secret" >> .env && \
    echo "WEBHOOK_URL=http://hkdk.events/n8jmuhxpo4xf5l" >> .env
    
RUN npm run prisma:generate
RUN npm run build

CMD [ "dumb-init", "npm", "run", "dev", "--host" ]

FROM node:18.17.1-bullseye-slim as prod

ARG RELEASE
ENV RELEASE=${RELEASE:-unknown}
ARG SHORT_SHA
ENV SHORT_SHA=${SHORT_SHA}

WORKDIR /app

COPY --from=dev /usr/bin/dumb-init /usr/bin/dumb-init
COPY --from=dev /app/node_modules/ ./node_modules
COPY --from=dev /app/package.json ./package.json
COPY --from=dev /app/dist ./dist
COPY --from=dev /app/prisma ./prisma
COPY --from=dev /app/scripts ./scripts
COPY --from=dev /app/src ./src
COPY --from=dev /app/tsconfig.build.json ./tsconfig.build.json
COPY --from=dev /app/tsconfig.json ./tsconfig.json

EXPOSE 3000

CMD [ "dumb-init", "npm", "run", "prod" ]

