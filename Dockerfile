FROM node:21-alpine3.18

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    ffmpeg

COPY package*.json ./

RUN npm install --omit=dev --ignore-scripts

COPY . .

ARG PORT
ENV PORT $PORT
EXPOSE $PORT

CMD ["npm", "start"]