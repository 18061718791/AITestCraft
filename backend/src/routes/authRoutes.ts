import { Router } from 'express';
import { authService } from '../services/authService';
import { authMiddleware, loadUserFromToken } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '缺少 refreshToken' } });
      return;
    }
    const result = await authService.refresh(refreshToken);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await authService.me(req.user!.userId);
    res.json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
});

router.post('/change-password', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    await authService.changePassword(req.user!.userId, oldPassword, newPassword);
    res.json({ success: true, message: '密码修改成功' });
  } catch (error: any) {
    next(error);
  }
});

export default router;
