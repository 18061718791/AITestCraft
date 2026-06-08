# AI测试用例生成助手 - 现状调研发现

## 调研日期
2026-04-30

## 一、代码架构发现

### 1.1 前端架构

**状态管理**
- 使用 React Context + useReducer 管理全局状态
- 状态定义在 `frontend/src/contexts/AppContext.tsx`
- 包含: sessionId, currentStep, requirement, testPoints, testCases, selectedSystem/Module/Scenario

**API 通信**
- axios 封装在 `frontend/src/services/api.ts`
- 基础URL: `/api/test`
- 三个核心接口:
  - `POST /generate-points` - 启动测试点生成
  - `POST /generate-cases` - 启动测试用例生成
  - `GET /task/:taskId` - 查询任务状态

**实时通信**
- Socket.IO 客户端封装在 `frontend/src/services/socket.ts`
- 事件: `points-generated`, `cases-progress`, `cases-generated`, `error`
- 轮询作为 WebSocket 失败的降级方案 (3秒间隔, 最多5分钟)

**提示词处理**
- `frontend/src/utils/promptTemplate.ts` 处理模板读取和参数替换
- 通过API读取后端模板文件 (`/api/prompts/{filename}`)
- 有简单的模板缓存机制 (TemplateCache)

### 1.2 后端架构

**路由层**
- `backend/src/routes/test.ts` - 测试生成相关路由
- 使用 express-validator 进行参数校验
- 返回 202 Accepted 表示任务已启动

**服务层**
- `backend/src/services/testService.ts` - 任务调度核心
  - 内存存储: `Map<string, TaskStatus>`
  - 异步处理测试点/测试用例生成
  - 分批处理: 每批5条测试点
  - 30分钟清理过期任务

- `backend/src/services/deepseekService.ts` - AI服务核心
  - 直接调用 DeepSeek API (`/chat/completions`)
  - 硬编码 API URL 和密钥 (config/index.ts 中有fallback)
  - 加载 prompts/ 目录下的 markdown 模板
  - 支持 JSON 和纯文本两种响应解析
  - 重试机制: 指数退避, 最多3次

- `backend/src/services/notificationService.ts` - WebSocket通知
  - Socket.IO 服务端
  - 房间广播 + 直接发送双重保障
  - 事件: `points-generated`, `cases-generated`, `cases-progress`, `progress`, `error`

**配置管理**
- `backend/src/config/index.ts` - 环境变量配置
  - 问题: API密钥有硬编码fallback值
  - 超时: 120秒, 重试: 3次, 重试延迟: 2秒

- `backend/src/services/configService.ts` - 数据库存储配置
  - 使用 Prisma 操作 system_configs 表
  - 支持配置的CRUD和批量操作
  - 初始配置从环境变量生成

### 1.3 提示词模板

**generate_test_points.md**
- 角色: 软件测试分析工程师
- 输出: 测试点清单 (每行一个, `- ` 开头)
- 参数: {requirement}

**generate_test_cases.md**
- 角色: 资深软件测试工程师
- 输出: JSON数组格式
- 参数: {test_points}, {context_info}
- 包含: number, system, module, scenario, title, description, precondition, steps, expected_results, actual_result, pass_fail

## 二、问题详细分析

### 2.1 严重问题详解

**A1: AI Provider硬编码**
```typescript
// deepseekService.ts 第9行
export class DeepSeekService {
  private client: AxiosInstance;
  // ...
}
```
- 整个AI调用逻辑封装在单一类中
- 无接口抽象，无法扩展其他Provider
- 解析逻辑与DeepSeek响应格式强耦合

**A2: API密钥硬编码**
```typescript
// config/index.ts 第11行
apiKey: process.env['DEEPSEEK_API_KEY'] || 'sk-c147b25dfb42489d930739e989a343ff',
```
- 有默认fallback密钥
- 安全风险: 密钥可能泄露到版本控制

**A3: 任务状态内存存储**
```typescript
// testService.ts 第10行
class TestService {
  private tasks: Map<string, TaskStatus> = new Map();
```
- 服务重启后所有任务丢失
- 无任务恢复机制
- 单点故障风险

### 2.2 火山引擎Coding Plan调研结果

**API端点**
- OpenAI兼容: `https://ark.cn-beijing.volces.com/api/coding/v3`
- Anthropic兼容: `https://ark.cn-beijing.volces.com/api/coding`

**认证方式**
- Header: `Authorization: Bearer {API_KEY}`
- 与现有DeepSeek调用方式一致

**支持模型**
- `ark-code-latest` (推荐, 动态选择最优模型)
- `doubao-seed-code`
- `deepseek-v3.2`
- `kimi-k2.5`
- `glm-4.7`

**关键差异**
- Base URL不同
- 模型名称不同
- 代码模型对结构化输出可能更友好
- 批处理能力可能更强

## 三、改造影响范围

### 3.1 必须修改的文件

| 文件 | 修改内容 | 影响 |
|------|----------|------|
| `backend/src/services/deepseekService.ts` | 重构为Provider实现 | 高 |
| `backend/src/services/testService.ts` | 适配Provider抽象层 | 高 |
| `backend/src/routes/test.ts` | 增加provider参数 | 中 |
| `frontend/src/pages/admin/LLMConfigPage.tsx` | 增加Provider选择 | 中 |
| `frontend/src/services/api.ts` | 增加provider参数 | 低 |

### 3.2 新增文件

| 文件 | 用途 |
|------|------|
| `backend/src/services/llm/baseProvider.ts` | Provider抽象基类 |
| `backend/src/services/llm/providerFactory.ts` | Provider工厂 |
| `backend/src/services/llm/types.ts` | 共享类型 |
| `backend/src/services/llm/deepseekProvider.ts` | DeepSeek实现 |
| `backend/src/services/llm/volcanoProvider.ts` | 火山引擎实现 |

## 四、技术约束

1. **Node.js版本**: 项目使用Node.js 18+
2. **TypeScript**: 必须保持类型安全
3. **Prisma**: 配置表已存在，可直接扩展
4. **Express**: 保持现有中间件链
5. **React**: 保持现有Context状态管理
6. **Ant Design**: 配置页面使用antd组件

## 五、参考资源

- [火山引擎Coding Plan官方文档](https://www.volcengine.com/docs/82379/1928262)
- [火山方舟Coding Plan接入指南](https://brotherhong.com/docs/platforms/volcengine-coding-plan/)
- 项目现有代码: `backend/src/services/deepseekService.ts`
- 项目现有配置: `backend/src/services/configService.ts`
