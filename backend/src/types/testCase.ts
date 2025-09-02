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
  createdAt: Date;
  updatedAt: Date;
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