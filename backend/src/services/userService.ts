import { prisma } from '../utils/prisma';
import { hashPassword } from '../utils/password';
import type { CreateUserInput, UpdateUserInput } from '../types/auth';

export class UserService {
  async list(page = 1, pageSize = 20, keyword?: string) {
    const where: any = {};
    if (keyword) {
      where.OR = [
        { username: { contains: keyword } },
        { email: { contains: keyword } },
        { nickname: { contains: keyword } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.users.count({ where }),
      prisma.users.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'asc' },
        include: {
          user_roles: {
            include: {
              role: {
                select: { id: true, name: true, code: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      rows: rows.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
        status: user.status,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        roles: user.user_roles.map((ur) => ur.role),
        redmine_user_id: user.redmine_user_id,
        redmine_lastname: user.redmine_lastname,
      })),
    };
  }

  async findById(id: number) {
    const user = await prisma.users.findUnique({
      where: { id },
      include: {
        user_roles: {
          include: {
            role: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      status: user.status,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
      roles: user.user_roles.map((ur) => ur.role),
      redmine_user_id: user.redmine_user_id,
      redmine_lastname: user.redmine_lastname,
    };
  }

  async create(input: CreateUserInput) {
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

    const user = await prisma.users.create({
      data: {
        username: input.username,
        email: input.email || null,
        password: hashedPassword,
        nickname: input.nickname || input.username,
        status: (input.status as any) || 'ACTIVE',
        user_roles: {
          create: (input.roleIds || []).map((roleId) => ({
            role: { connect: { id: roleId } },
          })),
        },
      },
      include: {
        user_roles: {
          include: {
            role: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    return user;
  }

  async update(id: number, input: UpdateUserInput) {
    const user = await prisma.users.findUnique({ where: { id } });
    if (!user) throw new Error('用户不存在');

    const data: any = {};
    if (input.username !== undefined) data.username = input.username;
    if (input.email !== undefined) data.email = input.email;
    if (input.nickname !== undefined) data.nickname = input.nickname;
    if (input.status !== undefined) data.status = input.status;
    if (input.avatar !== undefined) data.avatar = input.avatar;

    if (input.roleIds !== undefined) {
      await prisma.user_roles.deleteMany({ where: { user_id: id } });
      if (input.roleIds.length > 0) {
        await prisma.user_roles.createMany({
          data: input.roleIds.map((roleId) => ({
            user_id: id,
            role_id: roleId,
          })),
        });
      }
    }

    const updated = await prisma.users.update({
      where: { id },
      data,
      include: {
        user_roles: {
          include: {
            role: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    return updated;
  }

  async delete(id: number) {
    const user = await prisma.users.findUnique({ where: { id } });
    if (!user) throw new Error('用户不存在');

    await prisma.user_roles.deleteMany({ where: { user_id: id } });
    await prisma.users.delete({ where: { id } });
    return true;
  }

  async resetPassword(id: number, newPassword: string) {
    const user = await prisma.users.findUnique({ where: { id } });
    if (!user) throw new Error('用户不存在');

    const hashedPassword = await hashPassword(newPassword);
    await prisma.users.update({
      where: { id },
      data: { password: hashedPassword },
    });
    return true;
  }

  /**
   * 更新用户Redmine关联
   * @param id 用户ID
   * @param redmineUserId Redmine用户ID
   * @param redmineLastname Redmine用户姓名
   */
  async updateRedmineBinding(id: number, redmineUserId: number, redmineLastname: string) {
    const user = await prisma.users.findUnique({ where: { id } });
    if (!user) throw new Error('用户不存在');

    const updated = await prisma.users.update({
      where: { id },
      data: {
        redmine_user_id: redmineUserId,
        redmine_lastname: redmineLastname,
      },
      include: {
        user_roles: {
          include: {
            role: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    return {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      nickname: updated.nickname,
      avatar: updated.avatar,
      status: updated.status,
      last_login_at: updated.last_login_at,
      created_at: updated.created_at,
      roles: updated.user_roles.map((ur) => ur.role),
      redmine_user_id: updated.redmine_user_id,
      redmine_lastname: updated.redmine_lastname,
    };
  }

  /**
   * 获取用户的Redmine用户ID
   * @param id 用户ID
   * @returns Redmine用户ID，如果未关联则返回null
   */
  async getRedmineUserId(id: number): Promise<number | null> {
    const user = await prisma.users.findUnique({
      where: { id },
      select: { redmine_user_id: true },
    });
    return user?.redmine_user_id || null;
  }
}

export const userService = new UserService();
