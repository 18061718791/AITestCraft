# 前端Dockerfile - 使用Nginx提供静态文件服务

# 阶段1: 构建
FROM node:20-alpine AS builder
WORKDIR /app

# 复制package文件
COPY package*.json ./
RUN npm ci

# 复制源代码
COPY . .

# 构建生产版本
RUN npm run build

# 阶段2: 生产运行 - 使用Nginx
FROM nginx:alpine

# 安装envsubst用于环境变量替换
RUN apk add --no-cache gettext

# 复制自定义Nginx配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制构建产物到Nginx目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制环境变量注入脚本
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 暴露80端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

# 使用自定义entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"]
