FROM node:18.17.1-bullseye-slim as dev

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

COPY ./package.json ./

# Use pnpm to install dependencies
RUN pnpm install --strict-peer-dependencies

COPY . .

# RUN mv /app/.env.example /app/.env

# Remove any existing .env file
RUN rm -f .env

# Create a new .env file and populate it with environment variables
RUN echo "PORT=80" >> .env && \
    echo "VITE_API_URL=https://ballerine-workflow-service.onrender.com/api/v1/internal" >> .env && \
    echo "VITE_API_KEY=secret" >> .env && \
    echo "VITE_AUTH_ENABLED=true" >> .env && \
    echo "VITE_MOCK_SERVER=false" >> .env && \
    echo "VITE_POLLING_INTERVAL=10" >> .env && \
    echo "VITE_ASSIGNMENT_POLLING_INTERVAL=5" >> .env && \
    echo "VITE_FETCH_SIGNED_URL=false" >> .env && \
    echo "VITE_ENVIRONMENT_NAME=local" >> .env

ENV NODE_OPTIONS="--max-old-space-size=8192"

RUN pnpm run build

ENV PATH="$PATH:/app/node_modules/.bin"

EXPOSE 5137

CMD ["pnpm", "run", "dev", "--host"]

FROM nginx:stable-alpine as prod

COPY --from=dev /app/dist /usr/share/nginx/html

COPY example.nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]