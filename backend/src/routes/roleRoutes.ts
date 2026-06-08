import { Router } from 'express';
import { roleService } from '../services/roleService';
import { authMiddleware, requirePermission } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, requirePermission('role:view'), async (req: AuthRequest, res, next) => {
  try {
    const roles = await roleService.list();
    res.json({ success: true, data: roles });
  } catch (error: any) {
    next(error);
  }
});

router.get('/permissions', authMiddleware, requirePermission('role:view'), async (req: AuthRequest, res, next) => {
  try {
    const permissions = await roleService.listPermissions();
    res.json({ success: true, data: permissions });
  } catch (error: any) {
    next(error);
  }
});

router.get('/init-defaults', authMiddleware, requirePermission('system:config'), async (req: AuthRequest, res, next) => {
  try {
    const result = await roleService.initDefaultRoles();
    res.json({ success: true, data: result, message: '默认角色和权限已初始化' });
  } catch (error: any) {
    next(error);
  }
});

router.post('/', authMiddleware, requirePermission('role:create'), async (req: AuthRequest, res, next) => {
  try {
    const role = await roleService.create(req.body);
    res.json({ success: true, data: role });
  } catch (error: any) {
    next(error);
  }
});

router.put('/:id', authMiddleware, requirePermission('role:update'), async (req: AuthRequest, res, next) => {
  try {
    const id = parseInt(req.params['id'] || '0');
    const role = await roleService.update(id, req.body);
    res.json({ success: true, data: role });
  } catch (error: any) {
    next(error);
  }
});

router.delete('/:id', authMiddleware, requirePermission('role:delete'), async (req: AuthRequest, res, next) => {
  try {
    const id = parseInt(req.params['id'] || '0');
    await roleService.delete(id);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    next(error);
  }
});

export default router;
