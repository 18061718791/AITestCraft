# Docker部署规范文档

## 项目概述

AITestCraft是一个AI驱动的测试用例生成平台，包含以下组件：

* **Frontend**: React + Vite + TypeScript (端口5175)

* **Backend**: Node.js + Express + TypeScript + Prisma (端口9000)

* **Database**: MySQL (通过Prisma ORM连接)

## 技术栈分析

### 后端 (backend/)

* **运行时**: Node.js

* **框架**: Express.js

* **语言**: TypeScript

* **ORM**: Prisma (MySQL)

* **WebSocket**: Socket.IO

* **构建输出**: `dist/` 目录

* **启动命令**: `npm start` (运行 `node dist/index.js`)

* **构建命令**: `npm run build` (运行 `tsc`)

### 前端 (frontend/)

* **框架**: React 18

* **构建工具**: Vite

* **语言**: TypeScript

* **UI库**: Ant Design

* **构建输出**: `dist/` 目录

* **预览命令**: `npm run preview` (运行 `vite preview`)

* **构建命令**: `npm run build` (运行 `tsc && vite build`)

### 数据库

* **类型**: MySQL

* **ORM**: Prisma

* **连接**: 通过环境变量 `DATABASE_URL`

## 环境变量需求

### 后端环境变量

```env
# 必需
DATABASE_URL=mysql://user:password@mysql:3306/aitestcraft
DEEPSEEK_API_KEY=your_api_key
DEEPSEEK_API_URL=https://api.deepseek.com/v1

# 可选（有默认值）
PORT=9000
NODE_ENV=production
WEBSOCKET_PORT=5000
LOG_LEVEL=info
MAX_FILE_SIZE=10MB
```

### 前端环境变量

```env
VITE_API_URL=http://localhost:9000
VITE_SOCKET_URL=http://localhost:9000
VITE_ENV=production
```

## Docker架构设计

### 服务组成

1. **nginx**: 反向代理和静态文件服务
2. **frontend**: 构建后的React应用（通过nginx提供）
3. **backend**: Node.js API服务
4. **mysql**: MySQL数据库

### 网络架构

```
┌─────────────────────────────────────────────────────────────┐
│                         Docker Network                       │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  Nginx   │────│ Frontend │    │ Backend  │────┐          │
│  │  :80     │    │ (static) │    │  :9000   │    │          │
│  └──────────┘    └──────────┘    └──────────┘    │          │
│       │                                          │          │
│       └──────────────────────────────────────────┘          │
│                                                  │          │
│                                            ┌──────────┐     │
│                                            │  MySQL   │     │
│                                            │  :3306   │     │
│                                            └──────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 数据持久化

* **MySQL数据**: Docker Volume `mysql_data`

* **上传文件**: Docker Volume `uploads_data`

* **日志**: Docker Volume `logs_data`

## 部署策略

### 多阶段构建

1. **Frontend构建阶段**: 使用Node镜像构建React应用
2. **Backend构建阶段**: 使用Node镜像编译TypeScript
3. **生产阶段**: 使用精简镜像运行服务

### 镜像优化

* 使用 Alpine Linux 减少镜像体积

* 分离构建和运行阶段

* 仅复制必要的文件到生产镜像

## 安全考虑

* 不将敏感信息（API密钥）硬编码到镜像中

* 使用环境变量注入配置

* MySQL使用强密码

* 非root用户运行Node.js应用

