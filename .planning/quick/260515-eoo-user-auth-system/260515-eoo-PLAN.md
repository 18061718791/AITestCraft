# Quick Task 260515-eoo: 增加用户管理、权限管理及用户登录认证功能

**Mode:** quick
**Directory:** .planning/quick/260515-eoo-user-auth-system

## Task 1: 后端 — 用户与权限数据模型及认证服务

**Files:**
- `backend/prisma/schema.prisma` — 新增 User、Role、Permission、UserRole 模型
- `backend/src/types/auth.ts` — 认证相关类型定义
- `backend/src/services/authService.ts` — 注册、登录、Token 服务
- `backend/src/services/userService.ts` — 用户 CRUD、角色分配
- `backend/src/services/roleService.ts` — 角色与权限管理
- `backend/src/middleware/auth.ts` — JWT 认证中间件、权限校验中间件
- `backend/src/utils/password.ts` — 密码哈希与校验工具
- `backend/src/utils/jwt.ts` — JWT 签发与校验工具

**Action:**
1. 在 Prisma schema 中定义用户、角色、权限相关模型（包含字段、关系、索引）。
2. 生成并运行数据库迁移 `npx prisma migrate dev --name add_user_auth`。
3. 实现密码哈希（bcrypt）与 JWT 工具函数。
4. 实现 authService：注册、登录、刷新 Token、修改密码。
5. 实现 userService：用户增删改查、启用/禁用、分配角色。
6. 实现 roleService：角色增删改查、权限绑定。
7. 实现 auth 中间件：解析 JWT、注入 req.user，以及 `requirePermission(permissionCode)` 权限守卫。

**Verify:**
- Prisma Client 能正常生成且不报错。
- 数据库迁移成功执行，新表结构正确。
- 单元测试：密码哈希不可逆、JWT 签发与校验正常、注册/登录逻辑正确。

**Done:**
- 数据库模型已创建并迁移
- 认证与用户服务可用
- 中间件可保护路由

---

## Task 2: 后端 — 认证与管理 REST API

**Files:**
- `backend/src/routes/authRoutes.ts` — 注册、登录、刷新 Token、获取当前用户
- `backend/src/routes/userRoutes.ts` — 用户 CRUD、重置密码
- `backend/src/routes/roleRoutes.ts` — 角色 CRUD、权限列表
- `backend/src/index.ts` — 挂载新路由

**Action:**
1. 创建 authRoutes：`POST /api/auth/register`、`POST /api/auth/login`、`POST /api/auth/refresh`、`GET /api/auth/me`。
2. 创建 userRoutes：`GET /api/users`、`POST /api/users`、`GET /api/users/:id`、`PUT /api/users/:id`、`DELETE /api/users/:id`、`POST /api/users/:id/reset-password`。
3. 创建 roleRoutes：`GET /api/roles`、`POST /api/roles`、`PUT /api/roles/:id`、`DELETE /api/roles/:id`、`GET /api/permissions`。
4. 在 `index.ts` 中 `app.use` 挂载以上路由，并为管理类路由添加认证/权限中间件。

**Verify:**
- 使用 curl/Postman 测试注册、登录接口返回正常。
- 未携带 Token 访问管理接口返回 401。
- 携带 Token 但无权限访问返回 403。

**Done:**
- 所有认证与管理 API 可正常访问
- 路由权限控制生效

---

## Task 3: 前端 — 登录页、用户/角色管理页面与权限控制

**Files:**
- `frontend/src/services/authApi.ts` — 登录、注册、Token 刷新 API
- `frontend/src/services/userApi.ts` — 用户管理 API
- `frontend/src/services/roleApi.ts` — 角色管理 API
- `frontend/src/contexts/AuthContext.tsx` — 全局认证状态（用户、Token、权限）
- `frontend/src/hooks/useAuth.ts` — 认证相关 Hook
- `frontend/src/components/ProtectedRoute.tsx` — 路由守卫组件
- `frontend/src/pages/LoginPage.tsx` — 登录页面
- `frontend/src/pages/UserManagementPage.tsx` — 用户管理页面
- `frontend/src/pages/RoleManagementPage.tsx` — 角色管理页面
- `frontend/src/App.tsx` — 集成路由与权限

**Action:**
1. 封装 axios 请求拦截器，自动携带 `Authorization: Bearer <token>`，并在 401 时跳转登录页。
2. 创建 AuthContext，提供登录、登出、当前用户信息、权限判断方法。
3. 实现 ProtectedRoute，未登录跳转 `/login`，无权限展示 403 页面。
4. 开发 LoginPage：表单登录、记住我、错误提示。
5. 开发 UserManagementPage：用户列表、新增/编辑/删除用户、分配角色、重置密码。
6. 开发 RoleManagementPage：角色列表、新增/编辑/删除角色、配置权限。
7. 在 App.tsx 中配置路由：`/login`、`/users`、`/roles`，并包装权限控制。

**Verify:**
- 前端可正常登录并跳转首页。
- Token 过期自动跳转登录页。
- 用户管理页面可完成增删改查。
- 角色管理页面可完成增删改查及权限配置。
- 无权限菜单/按钮不展示或被禁用。

**Done:**
- 前端登录与权限体系完整
- 用户/角色管理页面可用
