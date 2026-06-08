import express from 'express';
import { notificationController } from '../controllers/notificationController';

const router = express.Router();

// 通知接收人管理
router.get('/recipients', notificationController.getRecipients);
router.post('/recipients', notificationController.createRecipient);
router.put('/recipients/:id', notificationController.updateRecipient);
router.delete('/recipients/:id', notificationController.deleteRecipient);

// 通知设置管理
router.get('/settings', notificationController.getSettings);
router.put('/settings', notificationController.updateSettings);

// 测试通知
router.post('/test', notificationController.sendTestNotification);

export default router;