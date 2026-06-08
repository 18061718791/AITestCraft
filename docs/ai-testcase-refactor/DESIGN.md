# AI测试用例生成助手 - 技术设计方案

## 一、Provider架构详细设计

### 1.1 抽象基类设计

```typescript
// backend/src/services/llm/types.ts

export interface LLMConfig {
  provider: string;
  apiKey: string;
  baseURL: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  batchSize?: number;
}

export interface GeneratePointsParams {
  requirement: string;
  system?: string;
  module?: string;
  scenario?: string;
}

export interface GenerateCasesParams {
  testPoints: string[];
  system?: string;
  module?: string;
  scenario?: string;
  onProgress?: (completed: number, total: number, batchCases: TestCase[]) => void;
}

export interface RequestOptions {
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface ProviderCapability {
  supportsStreaming: boolean;
  supportsBatching: boolean;
  maxBatchSize: number;
  recommendedTemperature: number;
}
```

```typescript
// backend/src/services/llm/baseProvider.ts

import { LLMConfig, GeneratePointsParams, GenerateCasesParams, RequestOptions, ProviderCapability } from './types';
import { TestPoint, TestCase } from '../../types';

export abstract class BaseLLMProvider {
  protected config: LLMConfig;
  protected capability: ProviderCapability;

  constructor(config: LLMConfig) {
    this.config = config;
    this.capability = this.defineCapability();
  }

  // 抽象方法: 必须由子类实现
  abstract readonly name: string;
  abstract readonly supportedModels: string[];

  abstract generateTestPoints(params: GeneratePointsParams): Promise<TestPoint[]>;
  abstract generateTestCases(params: GenerateCasesParams): Promise<TestCase[]>;

  // 通用方法: 可由子类覆盖
  loadConfig(config: LLMConfig): void {
    this.config = { ...this.config, ...config };
  }

  validateConfig(): boolean {
    return !!(
      this.config.apiKey &&
      this.config.baseURL &&
      this.config.model &&
      this.supportedModels.includes(this.config.model)
    );
  }

  getCapability(): ProviderCapability {
    return this.capability;
  }

  // 受保护方法: 子类内部使用
  protected abstract makeRequest(prompt: string, options?: RequestOptions): Promise<string>;
  protected abstract parseTestPoints(content: string): TestPoint[];
  protected abstract parseTestCases(content: string): TestCase[];
  protected abstract defineCapability(): ProviderCapability;

  // 通用工具方法
  protected createAxiosClient() {
    // 创建配置好的axios实例
  }

  protected handleError(error: any): string {
    // 统一的错误处理逻辑
    if (error.code === 'ECONNABORTED') {
      return 'AI服务响应超时，请稍后重试';
    } else if (error.response?.status === 429) {
      return 'AI服务调用频率限制，请稍后再试';
    } else if (error.response?.status >= 500) {
      return 'AI服务暂时不可用，请稍后重试';
    }
    return `AI服务处理失败: ${error.message || '未知错误'}`;
  }
}
```

### 1.2 Provider工厂设计

```typescript
// backend/src/services/llm/providerFactory.ts

import { BaseLLMProvider } from './baseProvider';
import { LLMConfig } from './types';
import { DeepSeekProvider } from './deepseekProvider';
import { VolcanoCodingPlanProvider } from './volcanoProvider';

export class LLMProviderFactory {
  private static providers: Map<string, new (config: LLMConfig) => BaseLLMProvider> = new Map();
  private static instances: Map<string, BaseLLMProvider> = new Map();

  // 注册Provider
  static register(
    name: string,
    ProviderClass: new (config: LLMConfig) => BaseLLMProvider
  ): void {
    this.providers.set(name, ProviderClass);
  }

  // 获取Provider实例 (单例模式)
  static getProvider(config: LLMConfig): BaseLLMProvider {
    const { provider } = config;

    if (!this.providers.has(provider)) {
      throw new Error(`Unknown LLM provider: ${provider}. Available: ${this.getAvailableProviders().join(', ')}`);
    }

    // 使用配置哈希作为缓存键
    const cacheKey = `${provider}-${config.model}`;

    if (!this.instances.has(cacheKey)) {
      const ProviderClass = this.providers.get(provider)!;
      const instance = new ProviderClass(config);
      this.instances.set(cacheKey, instance);
    }

    return this.instances.get(cacheKey)!;
  }

  // 获取可用Provider列表
  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  // 清除缓存
  static clearCache(): void {
    this.instances.clear();
  }

  // 初始化注册所有Provider
  static initialize(): void {
    this.register('deepseek', DeepSeekProvider);
    this.register('volcano-coding', VolcanoCodingPlanProvider);
    // 阶段2完成后可扩展: this.register('openai', OpenAIProvider);
    // 未来可扩展: this.register('claude', ClaudeProvider);
  }
}
```

### 1.3 DeepSeek Provider实现

```typescript
// backend/src/services/llm/deepseekProvider.ts

import { BaseLLMProvider } from './baseProvider';
import { LLMConfig, GeneratePointsParams, GenerateCasesParams, RequestOptions, ProviderCapability } from './types';
import { TestPoint, TestCase } from '../../types';
import axios, { AxiosInstance } from 'axios';
import logger from '../../utils/logger';
import { readFileSync } from 'fs';
import { join } from 'path';
import { sanitizeHtml } from '../../utils/sanitize';

export class DeepSeekProvider extends BaseLLMProvider {
  readonly name = 'deepseek';
  readonly supportedModels = ['deepseek-chat', 'deepseek-coder'];
  private client: AxiosInstance;
  private testPointsPrompt: string;
  private testCasesPrompt: string;

  constructor(config: LLMConfig) {
    super(config);
    this.client = this.createAxiosClient();
    this.testPointsPrompt = this.loadPrompt('generate_test_points.md');
    this.testCasesPrompt = this.loadPrompt('generate_test_cases.md');
  }

  protected defineCapability(): ProviderCapability {
    return {
      supportsStreaming: true,
      supportsBatching: true,
      maxBatchSize: 5,
      recommendedTemperature: 0.7,
    };
  }

  async generateTestPoints(params: GeneratePointsParams): Promise<TestPoint[]> {
    const cleanedRequirement = sanitizeHtml(params.requirement);
    let prompt = this.testPointsPrompt.replace('{requirement}', cleanedRequirement);
    prompt = prompt.replace('{system}', params.system || '通用系统');
    prompt = prompt.replace('{module}', params.module || '通用模块');
    prompt = prompt.replace('{scenario}', params.scenario || '通用场景');

    const response = await this.makeRequest(prompt);
    return this.parseTestPoints(response);
  }

  async generateTestCases(params: GenerateCasesParams): Promise<TestCase[]> {
    const batchSize = this.config.batchSize || this.capability.maxBatchSize;
    const allTestCases: TestCase[] = [];
    const totalBatches = Math.ceil(params.testPoints.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const batch = params.testPoints.slice(i * batchSize, (i + 1) * batchSize);
      const batchCases = await this.generateCasesBatch(batch, params, i + 1, totalBatches);
      allTestCases.push(...batchCases);

      if (params.onProgress) {
        params.onProgress(i + 1, totalBatches, batchCases);
      }
    }

    return allTestCases;
  }

  protected async makeRequest(prompt: string, options?: RequestOptions): Promise<string> {
    // 实现与现有deepseekService.ts类似的逻辑
    // 但使用this.config获取配置
    const requestData = {
      model: this.config.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.maxTokens || this.config.maxTokens || 4000,
      temperature: options?.temperature || this.config.temperature || 0.7,
    };

    const response = await this.client.post('/chat/completions', requestData);
    return response.data.choices?.[0]?.message?.content || '';
  }

  protected parseTestPoints(content: string): TestPoint[] {
    // 复用现有解析逻辑
    // ...
  }

  protected parseTestCases(content: string): TestCase[] {
    // 复用现有解析逻辑
    // ...
  }

  private createAxiosClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout || 120000,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private loadPrompt(filename: string): string {
    return readFileSync(join(process.cwd(), '..', 'prompts', filename), 'utf-8');
  }

  private async generateCasesBatch(
    testPoints: string[],
    params: GenerateCasesParams,
    batchIndex: number,
    totalBatches: number
  ): Promise<TestCase[]> {
    // 实现批处理逻辑
    // ...
  }
}
```

### 1.4 火山引擎Coding Plan Provider实现

```typescript
// backend/src/services/llm/volcanoProvider.ts

import { BaseLLMProvider } from './baseProvider';
import { LLMConfig, GeneratePointsParams, GenerateCasesParams, RequestOptions, ProviderCapability } from './types';
import { TestPoint, TestCase } from '../../types';
import axios, { AxiosInstance } from 'axios';
import logger from '../../utils/logger';

export class VolcanoCodingPlanProvider extends BaseLLMProvider {
  readonly name = 'volcano-coding';
  readonly supportedModels = [
    'ark-code-latest',
    'doubao-seed-code',
    'deepseek-v3.2',
    'kimi-k2.5',
    'glm-4.7',
  ];
  private client: AxiosInstance;

  constructor(config: LLMConfig) {
    super(config);
    this.client = this.createAxiosClient();
  }

  protected defineCapability(): ProviderCapability {
    return {
      supportsStreaming: true,
      supportsBatching: true,
      maxBatchSize: 10, // 火山引擎代码模型批处理能力更强
      recommendedTemperature: 0.3, // 代码模型推荐较低温度
    };
  }

  async generateTestPoints(params: GeneratePointsParams): Promise<TestPoint[]> {
    // 火山引擎使用与DeepSeek相同的提示词模板
    // 但可以利用代码模型的结构化理解能力
    const prompt = this.buildPointsPrompt(params);
    const response = await this.makeRequest(prompt, { temperature: 0.3 });
    return this.parseTestPoints(response);
  }

  async generateTestCases(params: GenerateCasesParams): Promise<TestCase[]> {
    // 利用更大的批处理大小提高效率
    const batchSize = this.config.batchSize || this.capability.maxBatchSize;
    // ... 类似DeepSeek的实现，但batchSize更大
    return [];
  }

  protected async makeRequest(prompt: string, options?: RequestOptions): Promise<string> {
    const requestData = {
      model: this.config.model,
      messages: [
        // 火山引擎Coding Plan可以添加system prompt优化代码理解
        {
          role: 'system',
          content: '你是一位资深的软件测试工程师，擅长将需求转化为结构化的测试用例。请严格按照要求的JSON格式输出。',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: options?.maxTokens || this.config.maxTokens || 4000,
      temperature: options?.temperature || this.config.temperature || 0.3,
    };

    const response = await this.client.post('/chat/completions', requestData);
    return response.data.choices?.[0]?.message?.content || '';
  }

  protected parseTestPoints(content: string): TestPoint[] {
    // 复用基类的通用解析逻辑
    // 火山引擎返回格式与OpenAI兼容
    return this.parseJSONOrText(content, 'points');
  }

  protected parseTestCases(content: string): TestCase[] {
    return this.parseJSONOrText(content, 'cases');
  }

  private createAxiosClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseURL, // https://ark.cn-beijing.volces.com/api/coding/v3
      timeout: this.config.timeout || 120000,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private buildPointsPrompt(params: GeneratePointsParams): string {
    // 构建针对火山引擎优化的提示词
    // 可以添加更多结构化标记
    return ``;
  }

  private parseJSONOrText(content: string, type: 'points' | 'cases'): any[] {
    // 通用解析逻辑
    // 1. 尝试JSON解析
    // 2. 失败则回退到文本解析
    return [];
  }
}
```

## 二、配置系统改造设计

### 2.1 数据库配置表扩展

```sql
-- 现有 system_configs 表结构已支持，只需新增配置项

-- 需要新增的配置项:
INSERT INTO system_configs (config_key, config_value, config_type, description) VALUES
('LLM_PROVIDER', 'deepseek', 'llm', '当前使用的LLM Provider: deepseek | volcano-coding'),
('LLM_MODEL', 'deepseek-chat', 'llm', '当前使用的模型名称'),
('LLM_API_KEY', '', 'llm', 'API密钥'),
('LLM_BASE_URL', 'https://api.deepseek.com/v1', 'llm', 'API基础URL'),
('LLM_TEMPERATURE', '0.7', 'llm', '温度参数'),
('LLM_TIMEOUT', '120000', 'llm', '超时时间(ms)'),
('LLM_MAX_RETRIES', '3', 'llm', '最大重试次数'),
('LLM_RETRY_DELAY', '2000', 'llm', '重试延迟(ms)'),
('LLM_BATCH_SIZE', '5', 'llm', '批处理大小');

-- 火山引擎专用配置
INSERT INTO system_configs (config_key, config_value, config_type, description) VALUES
('VOLCANO_API_KEY', '', 'llm', '火山引擎API密钥'),
('VOLCANO_BASE_URL', 'https://ark.cn-beijing.volces.com/api/coding/v3', 'llm', '火山引擎Coding Plan基础URL'),
('VOLCANO_MODEL', 'ark-code-latest', 'llm', '火山引擎模型');

-- OpenAI预留配置(阶段2后启用)
-- INSERT INTO system_configs (config_key, config_value, config_type, description) VALUES
-- ('OPENAI_API_KEY', '', 'llm', 'OpenAI API密钥'),
-- ('OPENAI_BASE_URL', 'https://api.openai.com/v1', 'llm', 'OpenAI基础URL'),
-- ('OPENAI_MODEL', 'gpt-4', 'llm', 'OpenAI模型');
```

### 2.2 配置加载服务

```typescript
// backend/src/services/llmConfigService.ts

import { configService } from './configService';
import { LLMConfig } from './llm/types';

export class LLMConfigService {
  async getLLMConfig(provider?: string): Promise<LLMConfig> {
    const targetProvider = provider || await this.getDefaultProvider();

    // 根据Provider加载对应配置
    const configMap: Record<string, () => Promise<LLMConfig>> = {
      'deepseek': () => this.loadDeepSeekConfig(),
      'volcano-coding': () => this.loadVolcanoConfig(),
      // 阶段2后可扩展: 'openai': () => this.loadOpenAIConfig(),
    };

    const loader = configMap[targetProvider];
    if (!loader) {
      throw new Error(`No config loader for provider: ${targetProvider}`);
    }

    return loader();
  }

  async getDefaultProvider(): Promise<string> {
    const config = await configService.getConfigByKey('LLM_PROVIDER');
    return config?.config_value || 'deepseek';
  }

  async setDefaultProvider(provider: string): Promise<void> {
    await configService.createOrUpdateConfig('LLM_PROVIDER', provider, 'llm');
  }

  private async loadDeepSeekConfig(): Promise<LLMConfig> {
    const [provider, apiKey, baseURL, model, temperature, timeout, maxRetries, retryDelay, batchSize] =
      await Promise.all([
        configService.getConfigByKey('LLM_PROVIDER'),
        configService.getConfigByKey('LLM_API_KEY'),
        configService.getConfigByKey('LLM_BASE_URL'),
        configService.getConfigByKey('LLM_MODEL'),
        configService.getConfigByKey('LLM_TEMPERATURE'),
        configService.getConfigByKey('LLM_TIMEOUT'),
        configService.getConfigByKey('LLM_MAX_RETRIES'),
        configService.getConfigByKey('LLM_RETRY_DELAY'),
        configService.getConfigByKey('LLM_BATCH_SIZE'),
      ]);

    return {
      provider: 'deepseek',
      apiKey: apiKey?.config_value || process.env['DEEPSEEK_API_KEY'] || '',
      baseURL: baseURL?.config_value || 'https://api.deepseek.com/v1',
      model: model?.config_value || 'deepseek-chat',
      temperature: parseFloat(temperature?.config_value || '0.7'),
      timeout: parseInt(timeout?.config_value || '120000'),
      maxRetries: parseInt(maxRetries?.config_value || '3'),
      retryDelay: parseInt(retryDelay?.config_value || '2000'),
      batchSize: parseInt(batchSize?.config_value || '5'),
    };
  }

  private async loadVolcanoConfig(): Promise<LLMConfig> {
    const [apiKey, baseURL, model, temperature, timeout] =
      await Promise.all([
        configService.getConfigByKey('VOLCANO_API_KEY'),
        configService.getConfigByKey('VOLCANO_BASE_URL'),
        configService.getConfigByKey('VOLCANO_MODEL'),
        configService.getConfigByKey('LLM_TEMPERATURE'),
        configService.getConfigByKey('LLM_TIMEOUT'),
      ]);

    return {
      provider: 'volcano-coding',
      apiKey: apiKey?.config_value || '',
      baseURL: baseURL?.config_value || 'https://ark.cn-beijing.volces.com/api/coding/v3',
      model: model?.config_value || 'ark-code-latest',
      temperature: parseFloat(temperature?.config_value || '0.3'),
      timeout: parseInt(timeout?.config_value || '120000'),
      maxRetries: 3,
      retryDelay: 2000,
      batchSize: 10,
    };
  }

  // 阶段2后扩展: OpenAI配置加载
  // private async loadOpenAIConfig(): Promise<LLMConfig> {
  //   const [apiKey, baseURL, model, temperature, timeout] =
  //     await Promise.all([
  //       configService.getConfigByKey('OPENAI_API_KEY'),
  //       configService.getConfigByKey('OPENAI_BASE_URL'),
  //       configService.getConfigByKey('OPENAI_MODEL'),
  //       configService.getConfigByKey('LLM_TEMPERATURE'),
  //       configService.getConfigByKey('LLM_TIMEOUT'),
  //     ]);
  //
  //   return {
  //     provider: 'openai',
  //     apiKey: apiKey?.config_value || '',
  //     baseURL: baseURL?.config_value || 'https://api.openai.com/v1',
  //     model: model?.config_value || 'gpt-4',
  //     temperature: parseFloat(temperature?.config_value || '0.7'),
  //     timeout: parseInt(timeout?.config_value || '120000'),
  //     maxRetries: 3,
  //     retryDelay: 2000,
  //     batchSize: 5,
  //   };
  // }
}

export const llmConfigService = new LLMConfigService();
```

## 三、任务持久化设计

### 3.1 Redis任务存储

```typescript
// backend/src/services/taskPersistenceService.ts

import Redis from 'ioredis'; // 需要安装: npm install ioredis
import { TaskStatus } from '../types';
import logger from '../utils/logger';

export class TaskPersistenceService {
  private redis: Redis;
  private readonly TASK_PREFIX = 'ai_task:';
  private readonly TASK_TTL = 24 * 60 * 60; // 24小时

  constructor() {
    this.redis = new Redis({
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['REDIS_PORT'] || '6379'),
      password: process.env['REDIS_PASSWORD'],
      db: parseInt(process.env['REDIS_DB'] || '0'),
    });
  }

  async saveTask(task: TaskStatus): Promise<void> {
    const key = `${this.TASK_PREFIX}${task.taskId}`;
    await this.redis.setex(key, this.TASK_TTL, JSON.stringify(task));
    logger.info('task_persistence', 'task_saved', { taskId: task.taskId });
  }

  async getTask(taskId: string): Promise<TaskStatus | null> {
    const key = `${this.TASK_PREFIX}${taskId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async updateTaskStatus(
    taskId: string,
    status: TaskStatus['status'],
    data?: any,
    error?: string
  ): Promise<void> {
    const task = await this.getTask(taskId);
    if (task) {
      task.status = status;
      task.data = data;
      task.error = error;
      task.updatedAt = new Date();
      await this.saveTask(task);
    }
  }

  async getTasksBySession(sessionId: string): Promise<TaskStatus[]> {
    const keys = await this.redis.keys(`${this.TASK_PREFIX}*`);
    const tasks: TaskStatus[] = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const task = JSON.parse(data);
        if (task.sessionId === sessionId) {
          tasks.push(task);
        }
      }
    }

    return tasks;
  }

  async cleanupOldTasks(): Promise<number> {
    // Redis自动过期，无需手动清理
    return 0;
  }
}

export const taskPersistenceService = new TaskPersistenceService();
```

### 3.2 TestService适配

```typescript
// backend/src/services/testService.ts (改造后)

import { LLMProviderFactory } from './llm/providerFactory';
import { llmConfigService } from './llmConfigService';
import { taskPersistenceService } from './taskPersistenceService';

class TestService {
  // 移除: private tasks: Map<string, TaskStatus> = new Map();
  // 改为使用 taskPersistenceService

  async generateTestPoints(
    requirement: string,
    sessionId: string,
    system?: string,
    module?: string,
    scenario?: string,
    provider?: string
  ): Promise<string> {
    const taskId = uuidv4();

    // 创建任务并持久化
    const task: TaskStatus = {
      taskId,
      status: 'pending',
      type: 'points',
      sessionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await taskPersistenceService.saveTask(task);

    // 异步处理
    this.processTestPoints(taskId, requirement, sessionId, system, module, scenario, provider);

    return taskId;
  }

  private async processTestPoints(
    taskId: string,
    requirement: string,
    sessionId: string,
    system?: string,
    module?: string,
    scenario?: string,
    providerName?: string
  ): Promise<void> {
    try {
      await taskPersistenceService.updateTaskStatus(taskId, 'processing');
      notificationService.notifyProgress(sessionId, 10, '开始生成测试点...');

      // 动态获取Provider
      const config = await llmConfigService.getLLMConfig(providerName);
      const provider = LLMProviderFactory.getProvider(config);

      const testPoints = await provider.generateTestPoints({
        requirement,
        system,
        module,
        scenario,
      });

      await taskPersistenceService.updateTaskStatus(taskId, 'completed', { testPoints });
      notificationService.notifyPointsGenerated(sessionId, { taskId, points: testPoints });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await taskPersistenceService.updateTaskStatus(taskId, 'failed', undefined, errorMessage);
      notificationService.notifyError(sessionId, { message: '生成测试点失败', details: errorMessage });
    }
  }

  getTaskStatus(taskId: string): Promise<TaskStatus | null> {
    return taskPersistenceService.getTask(taskId);
  }
}
```

## 四、前端改造设计

### 4.1 API层改造

```typescript
// frontend/src/services/api.ts (新增)

export interface GeneratePointsRequest {
  requirement: string;
  sessionId: string;
  system?: string;
  module?: string;
  scenario?: string;
  provider?: string; // 新增: 指定Provider
  model?: string;    // 新增: 指定模型
}

export interface GenerateCasesRequest {
  testPoints: string[];
  sessionId: string;
  system?: string;
  module?: string;
  scenario?: string;
  provider?: string; // 新增
  model?: string;    // 新增
}

// 新增: 获取可用Provider列表
export const llmConfigApi = {
  getProviders: async (): Promise<{ success: boolean; data: string[] }> => {
    const response = await api.get('/llm/providers');
    return response.data;
  },

  getModels: async (provider: string): Promise<{ success: boolean; data: string[] }> => {
    const response = await api.get(`/llm/models?provider=${provider}`);
    return response.data;
  },

  getCurrentConfig: async (): Promise<{ success: boolean; data: any }> => {
    const response = await api.get('/llm/config');
    return response.data;
  },
};
```

### 4.2 LLM配置页面改造

```typescript
// frontend/src/pages/admin/LLMConfigPage.tsx (改造后核心逻辑)

const LLMConfigPage: React.FC = () => {
  const [providers, setProviders] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('deepseek');

  // 加载可用Provider
  useEffect(() => {
    llmConfigApi.getProviders().then(res => {
      if (res.success) setProviders(res.data);
    });
  }, []);

  // Provider切换时加载对应模型列表
  useEffect(() => {
    if (selectedProvider) {
      llmConfigApi.getModels(selectedProvider).then(res => {
        if (res.success) setModels(res.data);
      });
    }
  }, [selectedProvider]);

  const providerOptions = [
    { value: 'deepseek', label: 'DeepSeek', description: '深度求索大模型' },
    { value: 'volcano-coding', label: '火山引擎 Coding Plan', description: '字节跳动火山方舟代码模型' },
  ];

  const modelOptions: Record<string, string[]> = {
    'deepseek': ['deepseek-chat', 'deepseek-coder'],
    'volcano-coding': ['ark-code-latest', 'doubao-seed-code', 'deepseek-v3.2', 'kimi-k2.5', 'glm-4.7'],
  };

  // ... 表单渲染逻辑
};
```

## 五、接口契约

### 5.1 后端新增接口

| 方法 | 路径 | 说明 | 请求参数 | 响应 |
|------|------|------|----------|------|
| GET | `/api/llm/providers` | 获取可用Provider列表 | - | `{ success: true, data: ['deepseek', 'volcano-coding'] }` |
| GET | `/api/llm/models?provider={name}` | 获取Provider支持的模型 | provider: string | `{ success: true, data: ['deepseek-chat', ...] }` |
| GET | `/api/llm/config` | 获取当前LLM配置 | - | `{ success: true, data: LLMConfig }` |
| POST | `/api/test/generate-points` | 生成测试点 (新增provider参数) | `{ ..., provider?: string }` | 不变 |
| POST | `/api/test/generate-cases` | 生成测试用例 (新增provider参数) | `{ ..., provider?: string }` | 不变 |

### 5.2 向后兼容

- 所有新增参数均为可选
- 不传递provider参数时，使用系统默认配置
- 现有前端代码无需修改即可继续工作

## 六、部署与迁移

### 6.1 数据库迁移

```sql
-- 执行配置初始化脚本
-- 已有配置不受影响
-- 新增火山引擎相关配置项
```

### 6.2 环境变量迁移

```bash
# .env 新增
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 移除硬编码密钥 (已在代码中移除fallback)
# DEEPSEEK_API_KEY=xxx  # 改为通过数据库配置管理
```

### 6.3 启动顺序

```typescript
// backend/src/index.ts

// 1. 初始化Provider工厂
LLMProviderFactory.initialize();

// 2. 加载LLM配置
const config = await llmConfigService.getLLMConfig();
logger.info('LLM configuration loaded', { provider: config.provider, model: config.model });

// 3. 启动服务
server.listen(PORT, ...);
```
