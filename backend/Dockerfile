# 后端Dockerfile - 多阶段构建
# 注意：构建上下文应该是项目根目录，而不是backend目录

# 阶段1: 依赖安装
FROM node:20-alpine AS deps
WORKDIR /app

# 复制package文件（从backend目录）
COPY backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 阶段2: 构建
FROM node:20-alpine AS builder
WORKDIR /app

# 安装OpenSSL（Prisma需要）
RUN apk add --no-cache openssl

# 复制package文件并安装所有依赖（包括devDependencies）
COPY backend/package*.json ./
RUN npm ci

# 复制Prisma schema文件
COPY backend/prisma ./prisma/

# 生成Prisma客户端
RUN npx prisma generate

# 复制源代码
COPY backend/. .

# 编译TypeScript
RUN npm run build

# 阶段3: 生产运行
FROM node:20-alpine AS runner
WORKDIR /app

# 安装OpenSSL（Prisma需要）
RUN apk add --no-cache openssl

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=9000

# 从deps阶段复制生产依赖
COPY --from=deps /app/node_modules ./node_modules

# 从builder阶段复制编译后的代码
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# 从builder阶段复制Prisma生成的客户端
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma

# 复制 prompts 文件到容器根目录（从构建上下文复制）
COPY prompts /prompts

# 创建上传目录并设置权限
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 9000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动命令（使用npm start）
CMD ["npm", "start"]
