FROM node:22-alpine
RUN apk add --no-cache ffmpeg imagemagick
WORKDIR /app
COPY watcher.js ./
CMD ["node", "watcher.js"]
