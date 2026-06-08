-- ============================================
-- AITestCraft 用户角色权限初始化脚本
-- 执行时机: MySQL容器首次启动时自动执行
-- 注意: 如果数据库已有数据，请先清空再执行
-- ============================================

-- 1. 插入默认权限
INSERT IGNORE INTO permissions (name, code, description, module, status, created_at, updated_at) VALUES
('用户查看', 'user:view', '查看用户列表和详情', 'user', 'ACTIVE', NOW(), NOW()),
('用户创建', 'user:create', '创建新用户', 'user', 'ACTIVE', NOW(), NOW()),
('用户编辑', 'user:update', '编辑用户信息', 'user', 'ACTIVE', NOW(), NOW()),
('用户删除', 'user:delete', '删除用户', 'user', 'ACTIVE', NOW(), NOW()),
('角色查看', 'role:view', '查看角色列表和详情', 'role', 'ACTIVE', NOW(), NOW()),
('角色创建', 'role:create', '创建新角色', 'role', 'ACTIVE', NOW(), NOW()),
('角色编辑', 'role:update', '编辑角色信息', 'role', 'ACTIVE', NOW(), NOW()),
('角色删除', 'role:delete', '删除角色', 'role', 'ACTIVE', NOW(), NOW()),
('系统配置', 'system:config', '管理系统配置', 'system', 'ACTIVE', NOW(), NOW()),
('系统监控', 'system:monitor', '查看系统监控', 'system', 'ACTIVE', NOW(), NOW());

-- 2. 创建 admin 角色（系统管理员）
INSERT IGNORE INTO roles (name, code, description, status, created_at, updated_at)
VALUES ('系统管理员', 'admin', '拥有所有权限', 'ACTIVE', NOW(), NOW());

-- 3. 创建 user 角色（普通用户）
INSERT IGNORE INTO roles (name, code, description, status, created_at, updated_at)
VALUES ('普通用户', 'user', '仅可查看', 'ACTIVE', NOW(), NOW());

-- 4. 为 admin 角色分配所有权限
INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.code = 'admin';

-- 5. 为 user 角色分配 user:view + role:view 权限
INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.code = 'user' AND p.code IN ('user:view', 'role:view');

-- 6. 创建 admin 用户（密码: admin）
INSERT IGNORE INTO users (username, email, password, nickname, status, created_at, updated_at)
VALUES (
  'admin',
  'admin@example.com',
  '$2b$12$rLZixdaJ4MypAug5MQvm3e5XrxnpC0Uby.zB5q6LtwwgEeAqL0hWi',
  '系统管理员',
  'ACTIVE',
  NOW(),
  NOW()
);

-- 7. 为 admin 用户分配 admin 角色
INSERT IGNORE INTO user_roles (user_id, role_id, created_at)
SELECT u.id, r.id, NOW()
FROM users u, roles r
WHERE u.username = 'admin' AND r.code = 'admin';
