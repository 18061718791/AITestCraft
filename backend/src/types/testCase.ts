import { systems, modules, scenarios } from '../generated/prisma';

export interface TestCase {
  id: number;
  title: string;
  preconditions: string;
  steps: string;
  expectedResult: string;
  actualResult?: string;
  status: 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  tags: string[];
  systemId?: number | null;
  moduleId?: number | null;
  scenarioId?: number | null;
  system?: systems | null;
  module?: modules | null;
  scenario?: scenarios | null;
  createdAt: string;  // 格式化为 yyyy-mm-dd hh:mm:ss 字符串
  updatedAt: string;   // 格式化为 yyyy-mm-dd hh:mm:ss 字符串
}

export interface CreateTestCaseRequest {
  title: string;
  preconditions: string;
  steps: string;
  expectedResult: string;
  actualResult?: string;
  status?: 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
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
  status?: 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  tags?: string[];
  systemId?: number;
  moduleId?: number;
  scenarioId?: number;
}

export interface SaveFromAssistantRequest {
  scenarioId: number;
  testCases: Array<{
    title: string;
    preconditions: string;
    steps: string;
    expectedResult: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    tags?: string[];
  }>;
}