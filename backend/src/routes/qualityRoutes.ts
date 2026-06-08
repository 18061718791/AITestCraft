import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { qualityService } from '../services/qualityService';
import { taskPersistenceService } from '../services/taskPersistenceService';
import validateRequest from '../middleware/validateRequest';
import logger from '../utils/logger';

const router = Router();

// 评估测试用例质量
router.post('/evaluate-cases', [
  body('taskId').isString().notEmpty(),
], validateRequest, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.body;

    const task = await taskPersistenceService.getTask(taskId);
    if (!task) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (task.status !== 'completed' || !task.data?.testCases) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: 'Task not completed or no test cases found' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const score = qualityService.evaluateTestCases(task.data.testCases);

    res.json({
      success: true,
      data: score,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('quality', 'evaluate_cases_failed', error);
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: 'Failed to evaluate cases' },
      timestamp: new Date().toISOString(),
    });
  }
});

// 评估测试点质量
router.post('/evaluate-points', [
  body('taskId').isString().notEmpty(),
], validateRequest, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.body;

    const task = await taskPersistenceService.getTask(taskId);
    if (!task) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (task.status !== 'completed' || !task.data?.testPoints) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: 'Task not completed or no test points found' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const score = qualityService.evaluateTestPoints(task.data.testPoints);

    res.json({
      success: true,
      data: score,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('quality', 'evaluate_points_failed', error);
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: 'Failed to evaluate points' },
      timestamp: new Date().toISOString(),
    });
  }
});

// 提交用户反馈
router.post('/feedback', [
  body('taskId').isString().notEmpty(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comments').optional().isString(),
  body('issues').optional().isArray(),
  body('improvements').optional().isArray(),
], validateRequest, async (req: Request, res: Response) => {
  try {
    const feedback = req.body;
    const score = qualityService.calculateFeedbackScore(feedback);

    logger.info('quality', 'feedback_received', {
      taskId: feedback.taskId,
      rating: feedback.rating,
      score,
    });

    res.json({
      success: true,
      data: { score, message: 'Feedback received' },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('quality', 'feedback_failed', error);
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: 'Failed to process feedback' },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
