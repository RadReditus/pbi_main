FROM node:20
WORKDIR /app

# Ставим зависимости
COPY package*.json ./
RUN npm ci || npm install

# Копируем исходники и собираем
COPY . .
RUN npm run build

# Прод-режим и старт из dist
ENV NODE_ENV=production
CMD ["npm","run","start"]
