# トビネズミMMO（仮称）サーバー（任意）。リポジトリのルートで：
#   docker build -t tobinezumi -f tobinezumi/server/Dockerfile .
#   docker run -p 8080:8080 -v tobi-data:/app/tobinezumi/server/data -v tobi-backups:/app/tobinezumi/server/backups tobinezumi
FROM node:22-slim
WORKDIR /app
# 配るのはクライアント一式と本編（静的）＋サーバー
COPY tobinezumi.html index.html kyokai.html style.css style-home.css game.js pwa.js sw.js manifest.webmanifest ./
COPY assets ./assets
COPY main ./main
COPY minigames ./minigames
COPY kyokai ./kyokai
COPY vendor ./vendor
COPY godot/assets/fonts ./godot/assets/fonts
COPY tobinezumi/client ./tobinezumi/client
COPY tobinezumi/shared ./tobinezumi/shared
COPY tobinezumi/assets ./tobinezumi/assets
COPY tobinezumi/server/package.json tobinezumi/server/package-lock.json ./tobinezumi/server/
RUN cd tobinezumi/server && npm ci --omit=dev
COPY tobinezumi/server ./tobinezumi/server
WORKDIR /app/tobinezumi/server
RUN mkdir -p data backups && chown -R node:node data backups
ENV HOST=0.0.0.0 PORT=8080
EXPOSE 8080
USER node
CMD ["node", "--disable-warning=ExperimentalWarning", "index.js"]
