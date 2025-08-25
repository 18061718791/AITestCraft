// 测试点类型
export interface TestPoint {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  category: 'functional' | 'performance' | 'security' | 'usability' | 'compatibility';
  expectedResult: string;
  testSteps: string[];
  content?: string;
  selected?: boolean;
}

// 测试用例类型
export interface TestCase {
  number: string;
  system: string;
  module: string;
  scenario: string;
  title: string;
  description: string;
  precondition: string;
  steps: string[];
  expected_results: string | string[];
  actual_result: string;
  pass_fail: 'Pass' | 'Fail' | '待测试';
  selected?: boolean;
}

// API请求类型
export interface GeneratePointsRequest {
  requirement: string;
  sessionId: string;
}

export interface GenerateCasesRequest {
  testPoints: string[];
  sessionId: string;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// WebSocket事件类型
export interface WebSocketEvent {
  type: string;
  data: any;
}

export interface PointsGeneratedEvent extends WebSocketEvent {
  type: 'points-generated';
  data: {
    taskId: string;
    points: TestPoint[];
  };
}

export interface CasesGeneratedEvent extends WebSocketEvent {
  type: 'cases-generated';
  data: {
    taskId: string;
    cases: TestCase[];
  };
}

export interface ErrorEvent extends WebSocketEvent {
  type: 'error';
  data: {
    message: string;
    code: string;
  };
}

// 任务状态类型
export interface TaskStatus {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  type: 'points' | 'cases';
  sessionId: string;
  data?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  progress?: number;
  result?: any;
}

// 前端状态管理类型
export interface TestFlowState {
  currentStep: 1 | 2 | 3;
  requirement: string;
  testPoints: TestPoint[];
  selectedPoints: string[];
  testCases: TestCase[];
  selectedCases: string[];
  loading: {
    generatingPoints: boolean;
    generatingCases: boolean;
  };
  error: string | null;
  sessionId: string;
}

// 错误类型
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class HttpError extends Error {
  statusCode: number;
  code: ErrorCode;

  constructor(
    statusCode: number,
    message: string,
    code: ErrorCode = ErrorCode.API_ERROR
  ) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface AppError extends Error {
  code: ErrorCode;
  details?: any;
}