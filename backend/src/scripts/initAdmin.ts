import { PrismaClient } from '../generated/prisma';
import { hashPassword } from '../utils/password';

const prisma = new PrismaClient();

async function initAdmin() {
  console.log('开始初始化管理员账号...');

  try {
    // 1. 初始化默认权限
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
    console.log('✓ 默认权限已初始化');

    // 2. 获取所有权限
    const allPerms = await prisma.permissions.findMany({ where: { status: 'ACTIVE' } });
    const adminPermIds = allPerms.map((p) => p.id);

    // 3. 创建/更新 admin 角色
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
    console.log('✓ admin 角色已创建/更新');

    // 4. 为 admin 角色分配所有权限
    await prisma.role_permissions.deleteMany({
      where: { role_id: adminRole.id },
    });

    if (adminPermIds.length > 0) {
      await prisma.role_permissions.createMany({
        data: adminPermIds.map((pid) => ({ role_id: adminRole.id, permission_id: pid })),
      });
    }
    console.log('✓ admin 角色权限已分配');

    // 5. 创建普通用户角色（可选）
    const userViewPerm = allPerms.find((p) => p.code === 'user:view');
    const roleViewPerm = allPerms.find((p) => p.code === 'role:view');
    const userPermIds = [userViewPerm?.id, roleViewPerm?.id].filter(Boolean) as number[];

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
      where: { role_id: userRole.id },
    });

    if (userPermIds.length > 0) {
      await prisma.role_permissions.createMany({
        data: userPermIds.map((pid) => ({ role_id: userRole.id, permission_id: pid })),
      });
    }
    console.log('✓ user 角色已创建/更新');

    // 6. 创建 admin 用户
    const existingAdmin = await prisma.users.findFirst({
      where: { username: 'admin' },
    });

    let adminUser;
    if (existingAdmin) {
      // 更新密码
      const hashedPassword = await hashPassword('111111');
      adminUser = await prisma.users.update({
        where: { id: existingAdmin.id },
        data: { password: hashedPassword, status: 'ACTIVE' },
      });
      console.log('✓ admin 用户已存在，密码已更新为 111111');
    } else {
      // 创建新用户
      const hashedPassword = await hashPassword('111111');
      adminUser = await prisma.users.create({
        data: {
          username: 'admin',
          email: 'admin@example.com',
          password: hashedPassword,
          nickname: '系统管理员',
          status: 'ACTIVE',
        },
      });
      console.log('✓ admin 用户已创建');
    }

    // 7. 为 admin 用户分配 admin 角色
    await prisma.user_roles.upsert({
      where: {
        user_id_role_id: {
          user_id: adminUser.id,
          role_id: adminRole.id,
        },
      },
      update: {},
      create: {
        user_id: adminUser.id,
        role_id: adminRole.id,
      },
    });
    console.log('✓ admin 用户已分配 admin 角色');

    console.log('\n========================================');
    console.log('初始化完成！');
    console.log('管理员账号: admin');
    console.log('管理员密码: 111111');
    console.log('========================================');

  } catch (error) {
    console.error('初始化失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initAdmin();
