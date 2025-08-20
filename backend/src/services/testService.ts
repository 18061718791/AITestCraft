import { v4 as uuidv4 } from 'uuid';
import deepseekService from './deepseekService';
import excelService from './excelService';
import notificationService from './notificationService';
import logger from '../utils/logger';
import { TestCase, TaskStatus } from '../types';


class TestService {
  private tasks: Map<string, TaskStatus> = new Map();

  async generateTestPoints(requirement: string, sessionId: string): Promise<string> {
    const taskId = uuidv4();
    
    this.tasks.set(taskId, {
      taskId,
      status: 'pending',
      type: 'points',
      sessionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info('test_service', 'generate_test_points_started', {
      taskId,
      sessionId,
      requirement: requirement.substring(0, 100) + (requirement.length > 100 ? '...' : '')
    });

    // Process asynchronously
    this.processTestPoints(taskId, requirement, sessionId);

    return taskId;
  }

  async generateTestCases(testPoints: string[], sessionId: string): Promise<string> {
    const taskId = uuidv4();
    
    this.tasks.set(taskId, {
      taskId,
      status: 'pending',
      type: 'cases',
      sessionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info('test_service', 'generate_test_cases_started', {
      taskId,
      sessionId,
      testPointsCount: testPoints.length,
      testPoints: testPoints.slice(0, 5)
    });

    // Process asynchronously
    this.processTestCases(taskId, testPoints, sessionId);

    return taskId;
  }

  private async processTestPoints(taskId: string, requirement: string, sessionId: string): Promise<void> {
    try {
      this.updateTaskStatus(taskId, 'processing');
      notificationService.notifyProgress(sessionId, 10, '开始生成测试点...');

      logger.info('test_service', 'processing_test_points', {
        taskId,
        sessionId,
        step: 'calling_deepseek',
        requirement: requirement.substring(0, 200) + (requirement.length > 200 ? '...' : '')
      });

      logger.debug('test_service', 'deepseek_input', {
        taskId,
        sessionId,
        fullRequirement: requirement,
        requirementLength: requirement.length
      });

      const testPoints = await deepseekService.generateTestPoints(requirement);
      
      logger.info('test_service', 'test_points_generated', {
        taskId,
        sessionId,
        pointsCount: testPoints.length,
        points: testPoints
      });

      logger.debug('test_service', 'test_points_detailed', {
        taskId,
        sessionId,
        points: testPoints,
        rawData: JSON.stringify(testPoints, null, 2)
      });

      this.updateTaskStatus(taskId, 'completed', { testPoints });
      notificationService.notifyPointsGenerated(sessionId, {
        taskId,
        points: testPoints,
      });

      logger.info(`Generated ${testPoints.length} test points for task ${taskId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateTaskStatus(taskId, 'failed', undefined, errorMessage);
      
      notificationService.notifyError(sessionId, {
        message: '生成测试点失败',
        details: errorMessage,
      });

      logger.error('test_service', 'test_points_generation_failed', error, {
        taskId,
        sessionId,
        error: errorMessage,
        requirement: requirement.substring(0, 100) + (requirement.length > 100 ? '...' : '')
      });
    }
  }

  private async processTestCases(taskId: string, testPoints: string[], sessionId: string): Promise<void> {
    try {
      this.updateTaskStatus(taskId, 'processing');
      notificationService.notifyProgress(sessionId, 10, '开始生成测试用例...');

      logger.info('test_service', 'processing_test_cases', {
        taskId,
        sessionId,
        testPointsCount: testPoints.length,
        step: 'calling_deepseek'
      });

      const testCases = await deepseekService.generateTestCases(testPoints);
      
      logger.info('test_service', 'test_cases_generated', {
        taskId,
        sessionId,
        casesCount: testCases.length,
        cases: testCases.slice(0, 3)
      });

      this.updateTaskStatus(taskId, 'completed', { testCases });
      notificationService.notifyCasesGenerated(sessionId, {
        taskId,
        cases: testCases,
      });

      logger.info(`Generated ${testCases.length} test cases for task ${taskId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateTaskStatus(taskId, 'failed', undefined, errorMessage);
      
      notificationService.notifyError(sessionId, {
        message: '生成测试用例失败',
        details: errorMessage,
      });

      logger.error('test_service', 'test_cases_generation_failed', error, {
        taskId,
        sessionId,
        error: errorMessage,
        testPointsCount: testPoints.length
      });
    }
  }

  async generateExcelFile(testCases: TestCase[]): Promise<Buffer> {
    return excelService.generateTestCasesExcel(testCases);
  }

  async generateTestPointsExcel(testPoints: string[]): Promise<Buffer> {
    return excelService.generateTestPointsExcel(testPoints);
  }

  getTaskStatus(taskId: string): TaskStatus | undefined {
    return this.tasks.get(taskId);
  }

  getTasksBySession(sessionId: string): TaskStatus[] {
    return Array.from(this.tasks.values())
      .filter(task => task.sessionId === sessionId);
  }

  private updateTaskStatus(
    taskId: string, 
    status: TaskStatus['status'], 
    data?: any, 
    error?: string
  ): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;
      task.data = data;
      if (error !== undefined) {
        task.error = error;
      } else {
        delete task.error;
      }
      task.updatedAt = new Date();
    }
  }

  // Cleanup old tasks periodically
  cleanupOldTasks(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [taskId, task] of this.tasks.entries()) {
      if (task.updatedAt < oneHourAgo) {
        this.tasks.delete(taskId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} old tasks`);
    }
  }
}

// Start cleanup interval
const testService = new TestService();
setInterval(() => {
  testService.cleanupOldTasks();
}, 30 * 60 * 1000); // Run every 30 minutes

export default testService;