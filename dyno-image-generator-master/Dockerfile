FROM node:9.3-slim

WORKDIR /usr/src/app

RUN apt-get update
RUN apt-get install libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev build-essential g++ --yes

COPY package.json .
COPY package-lock.json .

RUN npm install --production

COPY build .

CMD ["node", "index.js"]