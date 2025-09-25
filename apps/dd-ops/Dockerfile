FROM node:18-alpine AS base

# Alpine LinuxにPrismaに必要な依存関係をインストール
RUN apk add --no-cache libc6-compat openssl openssl-dev

# Install dependencies only when needed
FROM base AS deps
RUN npm install -g pnpm
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# publicディレクトリを作成（存在しない場合）
RUN mkdir -p ./public

# Generate Prisma client with explicit platform
RUN pnpm prisma generate

# Set build-time environment variables for Next.js
ENV NEXT_PUBLIC_API_URL=https://get-file-path-18562796135.asia-northeast1.run.app
ENV NEXT_PUBLIC_FILE_SERVER_URL=https://cdn.dd-ops.net
ENV NEXT_PUBLIC_UPLOAD_APP_URL=https://file-upload-app-18562796135.asia-northeast1.run.app
ENV NEXT_PUBLIC_ENV=production

# Set GCP environment variables for build time
ENV GCP_PROJECT_ID=spring-firefly-472108-a6
ENV GCP_LOCATION=asia-northeast1

# Build Next.js application
RUN pnpm build

# Production image - より簡単なアプローチ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# pnpmとPrisma CLIをグローバルインストール
RUN npm install -g pnpm prisma

# PostgreSQLクライアントをインストール（データベース権限設定用）
RUN apk add --no-cache postgresql-client

# 本番環境用の依存関係をインストール（Prismaも含める）
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod
RUN pnpm add prisma @prisma/client

# Prisma設定をコピー
COPY --from=builder /app/prisma ./prisma

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# アプリケーションファイルをコピー
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./next.config.js

# package.jsonもコピー（Next.jsの実行に必要）
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# 適切な権限を設定
RUN chown -R nextjs:nodejs /app

# Create startup script
RUN printf '#!/bin/sh\n\
echo "=== STARTING DD-OPS APPLICATION ==="\n\
echo "PORT: $PORT"\n\
echo "NODE_ENV: $NODE_ENV"\n\
echo "DATABASE_URL: ${DATABASE_URL:0:50}..."\n\
echo "=== DATABASE SCHEMA PERMISSIONS SETUP ==="\n\
# Extract connection parameters from DATABASE_URL\n\
DB_HOST=$(echo "$DATABASE_URL" | sed -n "s/.*@\\([^:]*\\):.*/\\1/p")\n\
DB_PORT=$(echo "$DATABASE_URL" | sed -n "s/.*:\\([0-9]*\\)\\/.*/\\1/p")\n\
DB_NAME=$(echo "$DATABASE_URL" | sed -n "s/.*\\/\\([^?]*\\).*/\\1/p")\n\
DB_PASSWORD=$(echo "$DATABASE_URL" | sed -n "s/.*:\\/\\/[^:]*:\\([^@]*\\)@.*/\\1/p")\n\
echo "Setting up schema permissions for dd_ops database..."\n\
export PGPASSWORD="$DB_PASSWORD"\n\
psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO postgres;" || echo "Schema permission setup failed, but continuing..."\n\
psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;" || echo "Table permission setup failed, but continuing..."\n\
psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;" || echo "Default privilege setup failed, but continuing..."\n\
echo "=== DATABASE MIGRATION START ==="\n\
echo "Checking database connectivity..."\n\
pnpm prisma migrate deploy || {\n\
  echo "Migration failed with pnpm, trying npx..."\n\
  npx prisma migrate deploy || {\n\
    echo "Migration failed, but continuing startup..."\n\
    echo "Please check database connectivity and migration files"\n\
  }\n\
}\n\
echo "=== DATABASE MIGRATION END ==="\n\
echo "Starting Next.js server on port $PORT..."\n\
exec pnpm start\n' > /app/start.sh

RUN chmod +x /app/start.sh
RUN chown nextjs:nodejs /app/start.sh

USER nextjs

EXPOSE 8080

CMD ["sh", "/app/start.sh"]