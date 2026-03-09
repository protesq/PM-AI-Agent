FROM node:18-alpine
WORKDIR /app
# Docker CLI — agent'ın host Docker daemon'ına erişmesi için
RUN apk add --no-cache docker-cli
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npx", "nodemon", "src/index.js"]
