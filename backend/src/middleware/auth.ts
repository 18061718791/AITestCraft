import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    username: string;
    roles: string[];
    permissions: string[];
  };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '缺少认证 Token' },
      });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    req.user = {
      userId: payload.userId,
      username: payload.username,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token 无效或已过期' },
    });
  }
}

export function requirePermission(...requiredPermissions: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未登录' },
      });
      return;
    }

    if (req.user.roles.includes('admin')) {
      next();
      return;
    }

    const hasPermission = requiredPermissions.some((perm) =>
      req.user!.permissions.includes(perm)
    );

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: '没有操作权限' },
      });
      return;
    }

    next();
  };
}

export async function loadUserFromToken(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);

      const user = await prisma.users.findUnique({
        where: { id: payload.userId },
        include: {
          user_roles: {
            include: {
              role: {
                include: {
                  role_permissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      });

      if (user && user.status === 'ACTIVE') {
        const roles = user.user_roles.map((ur) => ur.role.code);
        const permissions = new Set<string>();
        user.user_roles.forEach((ur) => {
          ur.role.role_permissions.forEach((rp) => {
            if (rp.permission.status === 'ACTIVE') {
              permissions.add(rp.permission.code);
            }
          });
        });

        req.user = {
          userId: user.id,
          username: user.username,
          roles,
          permissions: Array.from(permissions),
        };
      }
    }
    next();
  } catch {
    next();
  }
}
