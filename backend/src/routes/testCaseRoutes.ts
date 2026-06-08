import { Router } from 'express';
import { TestCaseController, createTestCaseValidation, updateTestCaseValidation, saveFromAssistantValidation } from '../controllers/testCaseController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const testCaseController = new TestCaseController();

// 测试用例相关路由（带用户数据隔离）
router.get('/test-cases', authMiddleware, testCaseController.getTestCases);
router.get('/test-cases/by-hierarchy', authMiddleware, testCaseController.getTestCasesByHierarchy);
router.get('/test-cases/:id', testCaseController.getTestCase);
router.post('/test-cases', createTestCaseValidation, testCaseController.createTestCase);
router.put('/test-cases/:id', updateTestCaseValidation, testCaseController.updateTestCase);
router.delete('/test-cases/:id', testCaseController.deleteTestCase);

// 从测试助手保存测试用例
router.post('/test-cases/save-from-assistant', saveFromAssistantValidation, testCaseController.saveFromTestAssistant);

// 批量操作相关路由
router.get('/test-cases/batch/template', testCaseController.downloadTemplate);
router.post('/test-cases/batch/export', testCaseController.batchExport);

export default router;