import { System, Module, Scenario } from './index';

export interface TestCase {
  id: number;
  title: string;
  preconditions: string;
  steps: string;
  expectedResult: string;
  actualResult?: string;
  status: TestCaseStatus;
  priority: TestCasePriority;
  tags: string[];
  systemId?: number;
  moduleId?: number;
  scenarioId?: number;
  system?: System | null;
  module?: Module | null;
  scenario?: Scenario | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestCaseRequest {
  title: string;
  preconditions: string;
  steps: string;
  expectedResult: string;
  actualResult?: string;
  status?: TestCaseStatus;
  priority?: TestCasePriority;
  tags?: string[];
  systemId?: number;
  moduleId?: number;
  scenarioId?: number;
}

export interface UpdateTestCaseRequest {
  title?: string;
  preconditions?: string;
  steps?: string;
  expectedResult?: string;
  actualResult?: string;
  status?: TestCaseStatus;
  priority?: TestCasePriority;
  tags?: string[];
  systemId?: number;
  moduleId?: number;
  scenarioId?: number;
}

// 测试用例状态枚举
export const TestCaseStatus = {
  PENDING: 'PENDING',
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
} as const;

export type TestCaseStatus = typeof TestCaseStatus[keyof typeof TestCaseStatus];

// 测试用例优先级枚举
export const TestCasePriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export type TestCasePriority = typeof TestCasePriority[keyof typeof TestCasePriority];