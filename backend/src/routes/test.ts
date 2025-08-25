import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import testService from '../services/testService';
// import { notificationService } from '../services/notificationService';
// 尝试添加文件扩展名以解决模块找不到的问题
import validateRequest from '../middleware/validateRequest';
import logger from '../utils/logger';

const router = Router();

// Generate test points
router.post('/generate-points', [
  body('requirement').isString().notEmpty(),
  body('sessionId').isString().notEmpty(),
  body('system').optional().isString(),
  body('module').optional().isString(),
  body('scenario').optional().isString(),
], validateRequest, async (req: Request, res: Response): Promise<void> => {
  try {
    const { requirement, sessionId, system, module, scenario } = req.body;
    
    logger.info(`Starting test points generation for session ${sessionId}`, {
      system,
      module,
      scenario
    });
    
    const taskId = await testService.generateTestPoints(requirement, sessionId, system, module, scenario);
    
    res.status(202).json({
      success: true,
      data: {
        taskId,
        message: '测试点生成任务已启动',
        status: 'processing',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in generate-points endpoint:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'API_ERROR',
        message: 'Failed to start test points generation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Generate test cases
router.post('/generate-cases', [
  body('testPoints').isArray().notEmpty(),
  body('sessionId').isString().notEmpty(),
  body('system').optional().isString(),
  body('module').optional().isString(),
  body('scenario').optional().isString(),
], validateRequest, async (req: Request, res: Response): Promise<void> => {
  try {
    const { testPoints, sessionId, system, module, scenario } = req.body;
    
    logger.info(`Starting test cases generation for session ${sessionId} with ${testPoints.length} points`, {
      system,
      module,
      scenario
    });
    
    const taskId = await testService.generateTestCases(testPoints, sessionId, system, module, scenario);
    
    res.status(202).json({
      success: true,
      data: {
        taskId,
        message: '测试用例生成任务已启动',
        status: 'processing',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in generate-cases endpoint:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'API_ERROR',
        message: 'Failed to start test cases generation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Download Excel file
router.post('/download-excel', async (req: Request, res: Response): Promise<void> => {
  try {
    const { testCases, sessionId } = req.body;
    
    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '测试用例数据不能为空',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Session ID is required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const buffer = await testService.generateExcelFile(testCases);
    
    const filename = `test-cases-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
    
    logger.info(`Downloaded Excel file with ${testCases.length} test cases`);
  } catch (error) {
    logger.error('Error in download-excel endpoint:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'API_ERROR',
        message: 'Failed to generate Excel file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Get task status
router.get('/task/:taskId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Task ID is required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    const task = testService.getTaskStatus(taskId);
    
    if (!task) {
      res.status(404).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Task not found',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    res.json({
      success: true,
      data: task,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in get-task-status endpoint:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'API_ERROR',
        message: 'Failed to get task status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;