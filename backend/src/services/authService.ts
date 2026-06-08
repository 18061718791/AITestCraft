import { prisma } from '../utils/prisma';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt';
import type { LoginInput, RegisterInput, TokenPayload, AuthUser } from '../types/auth';

export class AuthService {
  async register(input: RegisterInput): Promise<AuthUser> {
    const whereConditions: any[] = [{ username: input.username }];
    if (input.email) {
      whereConditions.push({ email: input.email });
    }

    const existing = await prisma.users.findFirst({
      where: {
        OR: whereConditions,
      },
    });

    if (existing) {
      const field = existing.username === input.username ? '用户名' : '邮箱';
      throw new Error(`${field}已被使用`);
    }

    const hashedPassword = await hashPassword(input.password);

    // 查找默认普通用户角色
    const defaultRole = await prisma.roles.findFirst({
      where: { code: 'user', status: 'ACTIVE' },
    });

    const userData: any = {
      username: input.username,
      email: input.email || null,
      password: hashedPassword,
      nickname: input.nickname || input.username,
      status: 'ACTIVE',
    };

    // 如果存在默认角色，关联该角色
    if (defaultRole) {
      userData.user_roles = {
        create: {
          role: { connect: { id: defaultRole.id } },
        },
      };
    }

    const user = await prisma.users.create({
      data: userData,
      include: {
        user_roles: {
          include: {
            role: {
              include: {
                role_permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return this.buildAuthUser(user);
  }

  async login(input: LoginInput): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> {
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { username: input.username },
          { email: input.username },
        ],
      },
      include: {
        user_roles: {
          include: {
            role: {
              include: {
                role_permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    if (user.status !== 'ACTIVE') {
      throw new Error('账号已被禁用或锁定');
    }

    const valid = await verifyPassword(input.password, user.password);
    if (!valid) {
      throw new Error('密码错误');
    }

    await prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const authUser = this.buildAuthUser(user);
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      roles: authUser.roles.map((r) => r.code),
      permissions: authUser.permissions,
    };

    return {
      user: authUser,
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken({ userId: user.id }),
    };
  }

  async refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    const decoded = verifyToken(token);
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        user_roles: {
          include: {
            role: {
              include: {
                role_permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new Error('Token 无效或用户已被禁用');
    }

    const authUser = this.buildAuthUser(user);
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      roles: authUser.roles.map((r) => r.code),
      permissions: authUser.permissions,
    };

    return {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken({ userId: user.id }),
    };
  }

  async me(userId: number): Promise<AuthUser> {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        user_roles: {
          include: {
            role: {
              include: {
                role_permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    return this.buildAuthUser(user);
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    const valid = await verifyPassword(oldPassword, user.password);
    if (!valid) {
      throw new Error('原密码错误');
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.users.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  private buildAuthUser(user: any): AuthUser {
    const roles = user.user_roles?.map((ur: any) => ({
      id: ur.role.id,
      name: ur.role.name,
      code: ur.role.code,
    })) || [];

    const permissions = new Set<string>();
    user.user_roles?.forEach((ur: any) => {
      ur.role.role_permissions?.forEach((rp: any) => {
        if (rp.permission.status === 'ACTIVE') {
          permissions.add(rp.permission.code);
        }
      });
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      status: user.status,
      roles,
      permissions: Array.from(permissions),
    };
  }
}

export const authService = new AuthService();
