import { prisma } from '../utils/prisma';
import type { CreateRoleInput, UpdateRoleInput } from '../types/auth';

export class RoleService {
  async list() {
    return prisma.roles.findMany({
      orderBy: { id: 'asc' },
      include: {
        role_permissions: {
          include: {
            permission: {
              select: { id: true, name: true, code: true, module: true },
            },
          },
        },
      },
    });
  }

  async findById(id: number) {
    return prisma.roles.findUnique({
      where: { id },
      include: {
        role_permissions: {
          include: {
            permission: {
              select: { id: true, name: true, code: true, module: true },
            },
          },
        },
      },
    });
  }

  async create(input: CreateRoleInput) {
    const existing = await prisma.roles.findFirst({
      where: {
        OR: [
          { name: input.name },
          { code: input.code },
        ],
      },
    });

    if (existing) {
      const field = existing.name === input.name ? '角色名称' : '角色编码';
      throw new Error(`${field}已被使用`);
    }

    return prisma.roles.create({
      data: {
        name: input.name,
        code: input.code,
        description: input.description ?? null,
        status: 'ACTIVE',
        role_permissions: {
          create: (input.permissionIds || []).map((permissionId) => ({
            permission: { connect: { id: permissionId } },
          })),
        },
      },
      include: {
        role_permissions: {
          include: {
            permission: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });
  }

  async update(id: number, input: UpdateRoleInput) {
    const role = await prisma.roles.findUnique({ where: { id } });
    if (!role) throw new Error('角色不存在');

    const data: any = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.code !== undefined) data.code = input.code;
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;

    if (input.permissionIds !== undefined) {
      await prisma.role_permissions.deleteMany({ where: { role_id: id } });
      if (input.permissionIds.length > 0) {
        await prisma.role_permissions.createMany({
          data: input.permissionIds.map((permissionId) => ({
            role_id: id,
            permission_id: permissionId,
          })),
        });
      }
    }

    return prisma.roles.update({
      where: { id },
      data,
      include: {
        role_permissions: {
          include: {
            permission: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });
  }

  async delete(id: number) {
    const role = await prisma.roles.findUnique({ where: { id } });
    if (!role) throw new Error('角色不存在');

    await prisma.role_permissions.deleteMany({ where: { role_id: id } });
    await prisma.user_roles.deleteMany({ where: { role_id: id } });
    await prisma.roles.delete({ where: { id } });
    return true;
  }

  async listPermissions() {
    return prisma.permissions.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ module: 'asc' }, { created_at: 'asc' }],
    });
  }

  async initDefaultPermissions() {
    const defaultPermissions = [
      { name: '用户查看', code: 'user:view', module: 'user' },
      { name: '用户创建', code: 'user:create', module: 'user' },
      { name: '用户编辑', code: 'user:update', module: 'user' },
      { name: '用户删除', code: 'user:delete', module: 'user' },
      { name: '角色查看', code: 'role:view', module: 'role' },
      { name: '角色创建', code: 'role:create', module: 'role' },
      { name: '角色编辑', code: 'role:update', module: 'role' },
      { name: '角色删除', code: 'role:delete', module: 'role' },
      { name: '系统配置', code: 'system:config', module: 'system' },
      { name: '系统监控', code: 'system:monitor', module: 'system' },
    ];

    for (const perm of defaultPermissions) {
      await prisma.permissions.upsert({
        where: { code: perm.code },
        update: {},
        create: {
          name: perm.name,
          code: perm.code,
          module: perm.module,
          status: 'ACTIVE',
        },
      });
    }
  }

  async initDefaultRoles() {
    await this.initDefaultPermissions();

    const allPerms = await prisma.permissions.findMany({ where: { status: 'ACTIVE' } });
    const adminPermIds = allPerms.map((p) => p.id);
    const userViewPerm = allPerms.find((p) => p.code === 'user:view');
    const roleViewPerm = allPerms.find((p) => p.code === 'role:view');
    const userPermIds = [userViewPerm?.id, roleViewPerm?.id].filter(Boolean) as number[];

    const adminRole = await prisma.roles.upsert({
      where: { code: 'admin' },
      update: {},
      create: {
        name: '系统管理员',
        code: 'admin',
        description: '拥有所有权限',
        status: 'ACTIVE',
      },
    });

    const userRole = await prisma.roles.upsert({
      where: { code: 'user' },
      update: {},
      create: {
        name: '普通用户',
        code: 'user',
        description: '仅可查看',
        status: 'ACTIVE',
      },
    });

    await prisma.role_permissions.deleteMany({
      where: { role_id: { in: [adminRole.id, userRole.id] } },
    });

    if (adminPermIds.length > 0) {
      await prisma.role_permissions.createMany({
        data: adminPermIds.map((pid) => ({ role_id: adminRole.id, permission_id: pid })),
      });
    }

    if (userPermIds.length > 0) {
      await prisma.role_permissions.createMany({
        data: userPermIds.map((pid) => ({ role_id: userRole.id, permission_id: pid })),
      });
    }

    return { adminRole, userRole };
  }
}

export const roleService = new RoleService();
