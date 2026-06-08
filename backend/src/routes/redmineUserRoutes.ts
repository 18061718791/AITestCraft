import { Router } from 'express';
import * as redmineUserController from '../controllers/redmineUserController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// 搜索Redmine用户（支持模糊检索）
router.get('/search', authMiddleware, redmineUserController.searchRedmineUsers);

// 获取所有活跃的Redmine用户
router.get('/', authMiddleware, redmineUserController.getAllActiveRedmineUsers);

// 根据ID获取Redmine用户信息
router.get('/:id', authMiddleware, redmineUserController.getRedmineUserById);

export default router;
