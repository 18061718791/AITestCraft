# AITestCraft Docker 部署指南

## 📋 概述

本文档指导您如何使用 Docker 将 AITestCraft 自动化测试平台部署到 Linux 服务器。

**重要提示**：本部署方案完全独立于本地开发环境，不会影响本地服务的正常运行。

## 🏗️ 架构说明

```
┌─────────────────────────────────────────────────────────────┐
│                         用户访问层                            │
│                   (浏览器访问 80 端口)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  ┌──────────────┐         ┌──────────────┐                  │
│  │   Nginx      │ ──────► │   前端应用    │                  │
│  │  (80端口)    │         │  (React SPA) │                  │
│  └──────────────┘         └──────────────┘                  │
│         │                                                   │
│         │ /api/* 反向代理                                    │
│         ▼                                                   │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │   后端API    │ ──────► │   MySQL      │                  │
│  │  (9000端口)  │         │  (主数据库)   │                  │
│  │  Node.js     │         │   Prisma     │                  │
│  └──────────────┘         └──────────────┘                  │
│         │                                                   │
│         │ 可选：外部数据库连接                                │
│         ▼                                                   │
│  ┌──────────────┐    ┌──────────────┐                       │
│  │  外部MySQL   │    │  PostgreSQL  │                       │
│  │ (缺陷数据)   │    │ (缺陷数据)   │                       │
│  └──────────────┘    └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## 📁 文件说明

### Docker 部署专用文件（不影响本地环境）

| 文件 | 说明 | 本地环境是否使用 |
|------|------|----------------|
| `docker-compose.prod.yml` | 生产环境 Docker Compose 配置 | ❌ 否 |
| `.env.docker` | Docker 环境变量配置 | ❌ 否 |
| `.env.docker.example` | Docker 配置模板 | ❌ 否 |
| `DEPLOY_DOCKER.md` | 本部署指南 | ❌ 否 |
| `scripts/export-mysql-for-docker.bat` | 数据导出脚本 | ❌ 否 |

### 本地开发环境文件（保持不变）

| 文件 | 说明 | 本地环境使用 |
|------|------|-------------|
| `backend/.env` | 本地后端配置 | ✅ 是 |
| `frontend/.env.development` | 本地前端配置 | ✅ 是 |
| `docker-compose.yml` | 本地 Docker 配置 | ✅ 是（如使用） |

## 🚀 快速开始

### 第一步：导出本地 MySQL 数据

在 Windows 本地环境执行：

```batch
# 进入项目目录
cd d:\自动化测试平台\AITestCraft-Tech-style

# 运行数据导出脚本
scripts\export-mysql-for-docker.bat -p your_mysql_password

# 或使用完整参数
scripts\export-mysql-for-docker.bat -h localhost -P 3306 -u root -p your_password -d testcase_generator
```

导出脚本特点：
- ✅ 使用 UTF-8 编码，确保中文无乱码
- ✅ 导出完整表结构和数据
- ✅ 自动添加字符集设置
- ✅ 导出文件位置：`docker/mysql-init/01-init-data.sql`

### 第二步：上传文件到 Linux 服务器

将以下文件/目录上传到服务器的 `/opt/aitestcraft` 目录：

```
aitestcraft/
├── backend/                    # 后端代码
│   ├── Dockerfile
│   ├── package*.json
│   ├── prisma/
│   └── src/
├── frontend/                   # 前端代码
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── docker-entrypoint.sh
│   ├── package*.json
│   └── src/
├── prompts/                    # AI 提示词文件
├── docker/
│   └── mysql-init/            # 数据库初始化文件
│       └── 01-init-data.sql   # 导出的数据文件
├── docker-compose.prod.yml    # Docker 编排配置
└── .env.docker                # 环境变量配置
```

上传命令示例：
```bash
# 在本地 Windows PowerShell 中执行
scp -r backend frontend prompts docker user@your-server-ip:/opt/aitestcraft/
scp docker-compose.prod.yml .env.docker user@your-server-ip:/opt/aitestcraft/
```

### 第三步：在服务器上启动服务

```bash
# SSH 连接到服务器
ssh user@your-server-ip

# 进入项目目录
cd /opt/aitestcraft

# 启动所有服务
docker-compose -f docker-compose.prod.yml --env-file .env.docker up -d

# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

### 第四步：验证部署

```bash
# 检查后端健康状态
curl http://localhost:9000/health

# 检查前端
curl http://localhost

# 检查数据库
docker exec -it aitestcraft-mysql mysql -u aitestcraft -p -e "SHOW TABLES;"
```

## ⚙️ 配置详解

### 必需配置（.env.docker）

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码 | `root` |
| `MYSQL_PASSWORD` | MySQL 应用密码 | `aitestcraft123` |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | `sk-xxxxxxxx` |
| `FRONTEND_URL` | 前端访问地址 | `http://your-server-ip` |
| `VITE_API_URL` | API 地址 | `http://your-server-ip:9000` |

### PostgreSQL 配置（缺陷管理）

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `POSTGRES_HOST` | PostgreSQL 主机 | `10.20.42.40` |
| `POSTGRES_PORT` | 端口 | `25432` |
| `POSTGRES_USER` | 用户名 | `redmine_ro` |
| `POSTGRES_PASSWORD` | 密码 | `readonly_pass` |
| `POSTGRES_DATABASE` | 数据库名 | `redmine_production` |

## 🔧 常用命令

```bash
# 停止所有服务
docker-compose -f docker-compose.prod.yml --env-file .env.docker down

# 停止并删除数据卷（谨慎使用）
docker-compose -f docker-compose.prod.yml --env-file .env.docker down -v

# 重启服务
docker-compose -f docker-compose.prod.yml --env-file .env.docker restart

# 重启单个服务
docker-compose -f docker-compose.prod.yml restart backend

# 查看容器日志
docker logs aitestcraft-backend
docker logs aitestcraft-frontend
docker logs aitestcraft-mysql

# 进入容器
docker exec -it aitestcraft-backend sh
docker exec -it aitestcraft-mysql mysql -u root -p

# 更新镜像后重新构建
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml --env-file .env.docker up -d
```

## 🔒 安全建议

1. **修改默认密码**：首次部署前务必修改所有默认密码
2. **使用 HTTPS**：生产环境建议使用 HTTPS
3. **限制端口访问**：
   - 开放 80 端口（HTTP）
   - 开放 443 端口（HTTPS，如果使用）
   - 限制 9000 端口仅内部访问
   - 限制 3306 端口仅内部访问
4. **防火墙配置**：
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw deny 9000/tcp
   sudo ufw deny 3306/tcp
   ```

## 🐛 故障排查

### 服务无法启动

```bash
# 查看详细日志
docker-compose -f docker-compose.prod.yml logs --tail=100 backend

# 检查环境变量
docker exec aitestcraft-backend env | grep -E '(DATABASE|DEEPSEEK)'
```

### 数据库连接失败

```bash
# 测试 MySQL 连接
docker exec -it aitestcraft-mysql mysql -u aitestcraft -p -e "SELECT 1"

# 检查后端数据库配置
docker exec aitestcraft-backend echo $DATABASE_URL
```

### 中文乱码问题

如果部署后出现中文乱码：

```bash
# 1. 检查数据库字符集
docker exec -it aitestcraft-mysql mysql -u root -p -e "SHOW VARIABLES LIKE 'character_set%'"

# 2. 检查表字符集
docker exec -it aitestcraft-mysql mysql -u root -p -e "SHOW TABLE STATUS"

# 3. 如需要，重新导出数据并确保使用 utf8mb4 编码
```

## 📝 更新部署

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新构建镜像
docker-compose -f docker-compose.prod.yml build

# 3. 重启服务
docker-compose -f docker-compose.prod.yml --env-file .env.docker up -d

# 4. 执行数据库迁移（如有需要）
docker exec -it aitestcraft-backend npx prisma migrate deploy
```

## 📊 数据备份

定期备份 MySQL 数据：

```bash
# 创建备份目录
mkdir -p /opt/aitestcraft-backup

# 备份数据
docker exec aitestcraft-mysqldump -u root -p your_root_password aitestcraft > /opt/aitestcraft-backup/backup-$(date +%Y%m%d).sql

# 设置定时任务（每天凌晨2点备份）
echo "0 2 * * * docker exec aitestcraft-mysql mysqldump -u root -p your_root_password aitestcraft > /opt/aitestcraft-backup/backup-\$(date +\%Y\%m\%d).sql" | sudo tee -a /etc/crontab
```

## 📞 获取帮助

如有问题，请检查：
1. 环境变量是否配置正确
2. 端口是否被占用
3. 防火墙设置是否正确
4. 查看容器日志获取详细错误信息

---

**注意**：本部署方案完全独立于本地开发环境，`.env.docker` 和 `docker-compose.prod.yml` 仅用于 Linux 服务器部署，不会影响本地 Windows 开发环境的正常运行。
