# AITestCraft - AI测试用例生成平台

基于多LLM Provider的自动化测试用例生成工具，支持DeepSeek、火山引擎Coding Plan等多种AI模型，提供测试点和测试用例的智能生成、质量评估与持续优化。

## 项目结构

```
AITestCraft/
├── frontend/          # 前端应用 (React + Vite + TypeScript)
├── backend/           # 后端API (Express.js + TypeScript)
├── prompts/           # AI提示词模板
├── docs/              # 项目文档
└── README.md
```

## 核心特性

- 🤖 **多LLM Provider支持** - DeepSeek、火山引擎Coding Plan，可扩展OpenAI等
- 📋 **智能测试点提取** - 从需求描述自动提取测试点
- 📝 **结构化测试用例生成** - 生成符合规范的完整测试用例
- 🎯 **生成质量评估** - 多维度评分：完整性、清晰度、覆盖度、一致性
- 📊 **Provider动态切换** - 运行时切换AI模型，无需重启服务
- ⚡ **任务持久化** - Redis存储任务状态，服务重启不丢失
- 🛡️ **限流保护** - 防止API滥用，保障服务稳定

## 快速开始

### 环境要求
- Node.js 18+
- MySQL / PostgreSQL
- Redis (可选，用于任务持久化)

### 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd frontend
npm install
```

### 配置环境变量

复制 `backend/.env.example` 到 `backend/.env`，配置以下关键项：

```env
# 数据库
DATABASE_URL="mysql://user:password@localhost:3306/aitestcraft"

# DeepSeek (默认Provider)
DEEPSEEK_API_KEY=your_deepseek_api_key

# 火山引擎Coding Plan (可选)
VOLCANO_API_KEY=your_volcano_api_key

# Redis (可选，用于任务持久化)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 启动服务

```bash
# 启动后端 (端口9000)
cd backend
npm run dev

# 启动前端 (端口5173)
cd frontend
npm run dev
```

## API文档

### 测试生成API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/test/generate-points` | 生成测试点 |
| POST | `/api/test/generate-cases` | 生成测试用例 |
| GET | `/api/test/task/:taskId` | 查询任务状态 |

**生成请求示例：**
```json
{
  "requirement": "用户登录功能测试",
  "sessionId": "session-123",
  "provider": "volcano-coding",
  "model": "ark-code-latest"
}
```

### LLM配置API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/llm/providers` | 获取可用Provider列表 |
| GET | `/api/llm/models?provider={name}` | 获取Provider支持的模型 |
| GET | `/api/llm/config` | 获取当前LLM配置 |
| POST | `/api/llm/config` | 更新LLM配置 |

### 质量评估API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/quality/evaluate-cases` | 评估测试用例质量 |
| POST | `/api/quality/evaluate-points` | 评估测试点质量 |
| POST | `/api/quality/feedback` | 提交用户反馈 |

## 架构设计

### Provider架构

```
┌─────────────────────────────────────────────┐
│              LLM Provider 抽象层              │
│  ┌────────────┐ ┌─────────────────────────┐ │
│  │  DeepSeek  │ │  火山引擎 Coding Plan    │ │
│  │  Provider  │ │  Provider               │ │
│  └────────────┘ └─────────────────────────┘ │
│         ▲                    ▲              │
│         └────────────────────┘              │
│              BaseLLMProvider                │
└─────────────────────────────────────────────┘
```

新增Provider只需：
1. 继承 `BaseLLMProvider`
2. 实现 `generateTestPoints` 和 `generateTestCases`
3. 注册到 `LLMProviderFactory`

## 配置说明

### 数据库配置

系统配置存储在 `system_configs` 表中，支持以下配置项：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `LLM_PROVIDER` | 当前Provider | `deepseek` |
| `LLM_MODEL` | 当前模型 | `deepseek-chat` |
| `LLM_API_KEY` | API密钥 | - |
| `LLM_BASE_URL` | API基础URL | - |
| `LLM_TEMPERATURE` | 温度参数 | `0.7` |
| `LLM_BATCH_SIZE` | 批处理大小 | `5` |

## 测试

```bash
# 运行所有测试
cd backend
npm test

# 运行特定测试
npx jest src/services/llm/__tests__

# 性能测试
npx jest src/services/__tests__/performance.test.ts
```

## 开发指南

### 代码规范
- TypeScript严格模式
- ESLint代码规范
- 单元测试覆盖率 > 80%

### 提交规范
```
feat: 新功能
fix: 修复
docs: 文档
refactor: 重构
test: 测试
```

## 故障排除

### 端口冲突
```bash
# 查看端口占用
netstat -ano | findstr :9000
```

### Redis连接失败
- 检查Redis服务是否启动
- 验证REDIS_HOST和REDIS_PORT配置
- 系统会自动降级到内存存储

### Provider切换失败
- 检查API密钥是否配置正确
- 验证Provider配置是否完整
- 查看后端日志获取详细错误

## 更新日志

### v2.0.0 (2026-04-30)
- 新增多LLM Provider支持
- 新增火山引擎Coding Plan
- 新增任务持久化(Redis)
- 新增生成质量评估
- 新增限流保护
- 优化提示词模板

## 许可证

MIT License
