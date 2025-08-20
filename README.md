# AI测试用例生成器

基于DeepSeek AI的自动化测试用例生成工具，支持测试点和测试用例的智能生成。

## 项目结构

```
AITestCraft/
├── frontend/          # 前端应用 (React + Vite)
├── backend/           # 后端API (Express.js)
├── shared/            # 共享类型定义
└── docs/             # 项目文档
```

## 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装依赖

#### 后端依赖安装
```bash
cd backend
npm install
```

#### 前端依赖安装
```bash
cd frontend
npm install
```

### 配置环境变量

#### 后端配置
1. 复制 `.env.example` 到 `.env`
2. 配置 DeepSeek API 密钥:
   ```
   DEEPSEEK_API_KEY=your_api_key_here
   ```

#### 前端配置
前端配置会自动从后端获取，无需额外配置。

### 启动服务

#### 启动后端API服务
```bash
cd backend
npm run dev
```
后端服务将启动在 http://localhost:9000

#### 启动前端开发服务器
```bash
cd frontend
npm run dev
```
前端服务将启动在 http://localhost:6000

### 端口配置

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端开发服务器 | 5173 | 固定端口，冲突时报错 |
| 后端API服务 | 9000 | 固定端口，可通过.env修改 |

## 功能特性

- 🤖 **AI驱动测试用例生成**
- 📋 **智能测试点提取**
- 🎯 **多维度测试覆盖**
- 📊 **可视化测试报告**
- 🔗 **实时WebSocket通信**

## API文档

### 基础API
- `GET /health` - 健康检查
- `POST /api/test/generate-points` - 生成测试点
- `POST /api/test/generate-cases` - 生成测试用例

### WebSocket事件
- `testProgress` - 测试进度更新
- `testComplete` - 测试完成通知

## 开发指南

### 代码规范
- 使用TypeScript进行类型安全开发
- 遵循ESLint代码规范
- 提交前运行代码格式化

### 调试技巧
- 使用浏览器开发者工具查看网络请求
- 后端日志查看：`npm run dev` 终端输出
- 前端热重载：保存文件自动刷新

## 故障排除

### 端口冲突
如果端口被占用，请检查：
1. 是否有其他程序使用了6000或9000端口
2. 使用 `netstat -ano | findstr :端口号` 查看占用进程
3. 修改.env文件中的端口配置

### 网络错误
1. 确保前后端服务都已启动
2. 检查防火墙设置
3. 验证CORS配置是否正确

### API密钥问题
1. 确认DeepSeek API密钥有效
2. 检查网络连接是否正常
3. 查看后端错误日志获取详细信息

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交代码变更
4. 创建Pull Request

## 许可证

MIT License