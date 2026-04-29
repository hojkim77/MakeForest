FROM node:20-alpine
WORKDIR /app

COPY package.json yarn.lock turbo.json ./
COPY apps/server/package.json ./apps/server/
COPY packages/db/package.json ./packages/db/
COPY packages/redis/package.json ./packages/redis/
COPY packages/types/package.json ./packages/types/
# web의 package.json은 yarn workspace 해석에만 필요 (빌드 불필요)
COPY apps/web/package.json ./apps/web/
# prisma generate(postinstall)가 schema를 필요로 하므로 install 전에 먼저 복사
COPY packages/db/prisma ./packages/db/prisma/

RUN yarn install --frozen-lockfile

COPY apps/server/ ./apps/server/
COPY packages/ ./packages/

# server + 의존 패키지만 빌드
RUN yarn turbo run build --filter=@makeforest/server...

EXPOSE 4000
CMD ["node", "apps/server/dist/index.js"]
