// 智能问数相关类型定义

// Skill接口
export interface Skill {
  // Skill名称
  name: string;
  // Skill描述
  description: string;
  // 支持的意图
  supportedIntents: string[];
  // 执行方法
  execute(params: Record<string, any>): Promise<SkillResult>;
  // 验证参数
  validateParams(params: Record<string, any>): boolean;
}

// Skill执行结果
export interface SkillResult {
  // 执行状态
  success: boolean;
  // 结果数据
  data?: any;
  // 错误信息
  error?: string;
  // 结果类型
  resultType: 'list' | 'chart' | 'document' | 'export' | 'message';
}

// 选择选项
interface ChoiceOption {
  label: string;
  value: string;
  data?: Record<string, any>;
}

// 智能问数请求
export interface IntelligentQARequest {
  query: string;
  choice?: string;
  entities?: Record<string, any>;
  context?: Array<{
    type: string;
    content: string;
    timestamp: Date;
    resultType: string;
    entities: Record<string, any>;
  }>;
}

// 智能问数响应
export interface IntelligentQAResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  resultType?: 'list' | 'chart' | 'document' | 'export' | 'message' | 'choice';
  options?: ChoiceOption[];
  suggestions?: string[];
  qaMeta?: {
    intent: string;
    confidence: number;
    entities: Record<string, any>;
  };
}

// 意图识别结果
export interface IntentRecognitionResult {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
}