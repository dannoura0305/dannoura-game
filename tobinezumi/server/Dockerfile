# トビネズミMMO（仮称）サーバー。リポジトリのルートで：
#   docker build -t tobinezumi -f tobinezumi/server/Dockerfile .
#   docker run -p 8080:8080 -v tobi-data:/data tobinezumi
# 公開（Fly.io・Render）の手順は tobinezumi/docs/DEPLOY.md。データ（SQLite とバックアップ）は /data（ボリューム）に置く。
FROM node:22-slim
WORKDIR /app
# 配るのはクライアント一式と本編（静的）＋サーバー
COPY tobinezumi.html tobinezumi.webmanifest index.html kyokai.html style.css style-home.css game.js pwa.js sw.js manifest.webmanifest ./
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
RUN cd tobinezumi/server && npm ci --omit=dev && npm cache clean --force
COPY tobinezumi/server ./tobinezumi/server
WORKDIR /app/tobinezumi/server
RUN mkdir -p /data/backups && chown -R node:node /data
ENV NODE_ENV=production HOST=0.0.0.0 TOBI_PORT=8080 TOBI_DATA_DIR=/data TOBI_BACKUPS=/data/backups TOBI_TRUST_PROXY=1
EXPOSE 8080
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://127.0.0.1:'+(process.env.TOBI_PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# root で起動 → /data を node の持ち物にしてから権限を落とす（docker-entry.mjs）。止めるときは SIGTERM（位置を保存・バックアップ）
STOPSIGNAL SIGTERM
CMD ["node", "--disable-warning=ExperimentalWarning", "docker-entry.mjs"]
