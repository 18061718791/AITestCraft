# Quick Task 260515-eoo Summary

## 任务描述
为 AITestCraft 平台增加用户管理、权限管理及用户登录认证功能。

## 提交记录
- `71c5709` feat(auth): add user management, roles, permissions and JWT auth backend
- `d4e76fe` feat(auth): add login, user and role management frontend pages

## 后端变更

### 数据库模型 (Prisma)
- 新增 `users` 表：用户基本信息（用户名、邮箱、密码、昵称、头像、状态、最后登录时间）
- 新增 `roles` 表：角色信息（名称、编码、描述、状态）
- 新增 `permissions` 表：权限信息（名称、编码、描述、模块、状态）
- 新增 `user_roles` 关联表：用户与角色多对多关系
- 新增 `role_permissions` 关联表：角色与权限多对多关系

### 服务层
- `authService.ts`：注册、登录、Token 刷新、获取当前用户、修改密码
- `userService.ts`：用户列表、查询、创建、更新、删除、重置密码
- `roleService.ts`：角色列表、查询、创建、更新、删除、权限列表、初始化默认角色/权限

### 中间件
- `auth.ts`：JWT 认证中间件、权限校验中间件、Token 自动加载用户

### 路由
- `/api/auth/register` — 用户注册
- `/api/auth/login` — 用户登录
- `/api/auth/refresh` — Token 刷新
- `/api/auth/me` — 获取当前用户
- `/api/auth/change-password` — 修改密码
- `/api/users` — 用户 CRUD（需 `user:view/create/update/delete` 权限）
- `/api/roles` — 角色 CRUD（需 `role:view/create/update/delete` 权限）
- `/api/roles/permissions` — 权限列表
- `/api/roles/init-defaults` — 初始化默认角色和权限

### 工具
- `utils/password.ts` — bcrypt 密码哈希与校验
- `utils/jwt.ts` — JWT 签发与校验

## 前端变更

### 服务层
- `services/authApi.ts` — 登录、注册、获取当前用户、修改密码、Token 刷新拦截器
- `services/userApi.ts` — 用户管理 API 封装
- `services/roleApi.ts` — 角色管理 API 封装

### 状态管理
- `contexts/AuthContext.tsx` — 全局认证状态（用户、Token、权限判断）

### 路由守卫
- `components/ProtectedRoute.tsx` — 未登录跳转登录页、无权限拦截

### 页面
- `pages/LoginPage.tsx` — 登录/注册双 Tab 页面
- `pages/UserManagementPage.tsx` — 用户列表、增删改查、角色分配、密码重置
- `pages/RoleManagementPage.tsx` — 角色列表、增删改查、权限配置（按模块分组）

### 路由集成
- `App.tsx` — 添加 AuthProvider 包裹
- `routes/AppRoutes.tsx` — 添加 `/login`、`/users`、`/roles` 路由

## 默认角色与权限
- 系统管理员（admin）：拥有所有权限
- 普通用户（user）：仅拥有 user:view 和 role:view 查看权限

## 后续建议
1. 首次部署后访问 `/api/roles/init-defaults` 初始化默认角色和权限
2. 生产环境务必修改 `JWT_SECRET` 环境变量
3. 可在菜单组件中集成 `useAuth().hasPermission()` 实现按钮级权限控制
