#!/bin/sh

# 前端Docker入口脚本 - 用于注入运行时环境变量

# 设置默认环境变量
# 如果未设置，使用相对路径（空字符串表示使用页面同源）
API_URL=${VITE_API_URL:-"/api"}
SOCKET_URL=${VITE_SOCKET_URL:-""}

# 创建配置脚本
cat > /usr/share/nginx/html/config.js << EOF
window.APP_CONFIG = {
  VITE_API_URL: "$API_URL",
  VITE_SOCKET_URL: "$SOCKET_URL"
};
EOF

echo "Environment variables injected:"
echo "  VITE_API_URL: $API_URL"
echo "  VITE_SOCKET_URL: ${SOCKET_URL:-'(relative - auto-detect)'}"

# 执行传入的命令
exec "$@"
