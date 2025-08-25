import { Router } from 'express';
import { TestCaseController, createTestCaseValidation, updateTestCaseValidation, saveFromAssistantValidation } from '../controllers/testCaseController';

const router = Router();
const testCaseController = new TestCaseController();

// 测试用例相关路由
router.get('/test-cases', testCaseController.getTestCases);
router.get('/test-cases/by-hierarchy', testCaseController.getTestCasesByHierarchy);
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