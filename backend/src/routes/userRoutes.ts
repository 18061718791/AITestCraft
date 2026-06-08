import { Router } from 'express';
import { userService } from '../services/userService';
import { authMiddleware, requirePermission } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, requirePermission('user:view'), async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query['page'] as string) || 1;
    const pageSize = parseInt(req.query['pageSize'] as string) || 20;
    const keyword = req.query['keyword'] as string | undefined;
    const result = await userService.list(page, pageSize, keyword);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

router.get('/:id', authMiddleware, requirePermission('user:view'), async (req: AuthRequest, res, next) => {
  try {
    const id = parseInt(req.params['id'] || '0');
    const user = await userService.findById(id);
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '用户不存在' } });
      return;
    }
    res.json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
});

router.post('/', authMiddleware, requirePermission('user:create'), async (req: AuthRequest, res, next) => {
  try {
    const user = await userService.create(req.body);
    res.json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
});

// 当前用户更新自己的资料（不需要特殊权限）- 必须放在 /:id 路由之前
router.put('/profile', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '未登录' } });
      return;
    }
    const { nickname, email, avatar } = req.body;
    const user = await userService.update(userId, { nickname, email, avatar });
    res.json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
});

router.put('/:id', authMiddleware, requirePermission('user:update'), async (req: AuthRequest, res, next) => {
  try {
    const id = parseInt(req.params['id'] || '0');
    const user = await userService.update(id, req.body);
    res.json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
});

router.delete('/:id', authMiddleware, requirePermission('user:delete'), async (req: AuthRequest, res, next) => {
  try {
    const id = parseInt(req.params['id'] || '0');
    await userService.delete(id);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    next(error);
  }
});

router.post('/:id/reset-password', authMiddleware, requirePermission('user:update'), async (req: AuthRequest, res, next) => {
  try {
    const id = parseInt(req.params['id'] || '0');
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '密码长度至少6位' } });
      return;
    }
    await userService.resetPassword(id, newPassword);
    res.json({ success: true, message: '密码重置成功' });
  } catch (error: any) {
    next(error);
  }
});

// 更新用户Redmine关联（允许用户更新自己的关联，或管理员更新任意用户）
router.put('/:id/redmine-binding', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const id = parseInt(req.params['id'] || '0');
    const currentUserId = req.user?.userId;
    const isAdmin = req.user?.roles?.some((r: any) => r.code === 'admin');
    
    // 检查权限：只能更新自己，或者管理员可以更新任意用户
    if (id !== currentUserId && !isAdmin) {
      res.status(403).json({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: '无权更新其他用户的Redmine关联' } 
      });
      return;
    }
    
    const { redmineUserId, redmineLastname } = req.body;
    
    if (!redmineUserId || !redmineLastname) {
      res.status(400).json({ 
        success: false, 
        error: { code: 'BAD_REQUEST', message: 'Redmine用户ID和姓名不能为空' } 
      });
      return;
    }
    
    const user = await userService.updateRedmineBinding(id, redmineUserId, redmineLastname);
    res.json({ success: true, data: user, message: 'Redmine关联成功' });
  } catch (error: any) {
    next(error);
  }
});

// 获取当前用户的Redmine关联信息
router.get('/profile/redmine', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '未登录' } });
      return;
    }
    const redmineUserId = await userService.getRedmineUserId(userId);
    res.json({ success: true, data: { redmine_user_id: redmineUserId } });
  } catch (error: any) {
    next(error);
  }
});

export default router;
