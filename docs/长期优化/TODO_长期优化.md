# TODO - 缺陷管理助手长期优化

## 待办事项

### 立即执行（优先级：高）

#### 1. 数据库迁移
- [ ] 执行数据库迁移脚本：`backend/prisma/migrations/20260205_add_plugin_tables.sql`
- [ ] 验证数据库表是否正确创建
- [ ] 检查外键约束是否正确

**操作指引**：
```bash
# 连接到MySQL数据库
mysql -u root -p

# 执行迁移脚本
source backend/prisma/migrations/20260205_add_plugin_tables.sql

# 验证表是否创建
SHOW TABLES LIKE 'plugin%';

# 查看表结构
DESCRIBE plugins;
DESCRIBE plugin_versions;
DESCRIBE plugin_dependencies;
```

#### 2. 生成Prisma客户端
- [ ] 运行 `npx prisma generate` 生成Prisma客户端
- [ ] 验证客户端是否正确生成
- [ ] 检查生成的类型定义

**操作指引**：
```bash
cd backend
npx prisma generate
```

#### 3. 运行测试
- [ ] 运行插件系统测试：`npm test`
- [ ] 验证所有测试通过
- [ ] 检查测试覆盖率

**操作指引**：
```bash
cd backend
npm test

# 查看测试覆盖率
npm test -- --coverage
```

#### 4. 启动后端服务
- [ ] 启动后端开发服务器：`npm run dev`
- [ ] 验证插件API是否正常工作
- [ ] 检查日志是否有错误

**操作指引**：
```bash
cd backend
npm run dev
```

#### 5. 启动前端服务
- [ ] 启动前端开发服务器：`npm run dev`
- [ ] 访问插件管理页面：`http://localhost:5173/admin/plugins`
- [ ] 验证插件管理功能是否正常

**操作指引**：
```bash
cd frontend
npm run dev
```

### 近期执行（优先级：中）

#### 6. 测试插件加载
- [ ] 使用示例插件测试插件加载功能
- [ ] 验证插件验证功能
- [ ] 验证插件依赖检查

**操作指引**：
1. 访问插件管理页面
2. 点击"加载插件"按钮
3. 输入插件路径：`backend/plugins/example-plugin/index.ts`
4. 点击确定
5. 验证插件是否成功加载

#### 7. 测试插件管理
- [ ] 测试插件启用/禁用功能
- [ ] 测试插件卸载功能
- [ ] 测试插件重载功能
- [ ] 测试插件配置更新功能

**操作指引**：
1. 在插件列表中找到已加载的插件
2. 点击"启用"或"禁用"按钮
3. 点击"卸载"按钮（需要确认）
4. 点击"重载"按钮
5. 点击"详情"按钮，查看插件详情
6. 在详情页面更新插件配置

#### 8. 测试版本管理
- [ ] 测试插件升级功能
- [ ] 测试插件回滚功能
- [ ] 测试版本历史查询功能

**操作指引**：
1. 在插件详情页面，切换到"版本历史"标签
2. 查看版本历史
3. 点击"回滚"按钮回滚到旧版本
4. 验证回滚是否成功

### 中期执行（优先级：低）

#### 9. 开发自定义插件
- [ ] 根据业务需求开发自定义插件
- [ ] 实现插件接口
- [ ] 实现插件技能
- [ ] 测试插件功能

**操作指引**：
1. 参考示例插件：`backend/plugins/example-plugin/index.ts`
2. 创建新的插件目录：`backend/plugins/your-plugin/`
3. 实现插件类，继承BasePlugin
4. 实现必要的生命周期方法
5. 实现插件技能
6. 在插件管理页面加载插件

#### 10. 完善插件文档
- [ ] 编写插件开发指南
- [ ] 编写插件API文档
- [ ] 编写插件示例
- [ ] 编写插件最佳实践

**操作指引**：
1. 创建文档目录：`docs/plugins/`
2. 编写插件开发指南：`docs/plugins/development-guide.md`
3. 编写插件API文档：`docs/plugins/api-reference.md`
4. 编写插件示例：`docs/plugins/examples/`
5. 编写插件最佳实践：`docs/plugins/best-practices.md`

## 缺少的配置

### 环境变量
- [ ] 确认 `.env` 文件包含所有必要的环境变量
- [ ] 确认数据库连接配置正确
- [ ] 确认LLM API配置正确

**操作指引**：
```bash
# 检查.env文件
cat backend/.env

# 确保包含以下配置
DATABASE_URL=mysql://user:password@localhost:3306/database
LLM_API_KEY=your_api_key
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_TYPE=deepseek-chat
```

### 数据库配置
- [ ] 确认MySQL数据库已创建
- [ ] 确认数据库用户权限正确
- [ ] 确认数据库字符集为utf8mb4

**操作指引**：
```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS aitestcraft CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户并授权
CREATE USER IF NOT EXISTS 'aitestcraft'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON aitestcraft.* TO 'aitestcraft'@'localhost';
FLUSH PRIVILEGES;
```

### Prisma配置
- [ ] 确认 `prisma/schema.prisma` 配置正确
- [ ] 确认数据库连接URL正确
- [ ] 确认客户端生成路径正确

**操作指引**：
```bash
# 检查Prisma配置
cat backend/prisma/schema.prisma

# 确认datasource配置
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

# 确认generator配置
generator client {
  provider   = "prisma-client-js"
  output     = "../src/generated/prisma"
  engineType = "binary"
}
```

### 测试配置
- [ ] 确认 `jest.config.js` 配置正确
- [ ] 确认测试环境变量正确
- [ ] 确认测试数据库配置正确

**操作指引**：
```bash
# 检查Jest配置
cat backend/jest.config.js

# 确认测试环境变量
cat backend/.env.test
```

## 已知问题

### 1. 测试未完全执行
**问题描述**：由于环境限制，测试尚未完全执行

**解决方案**：
1. 配置完整的测试环境
2. 安装必要的依赖
3. 运行完整测试套件

**操作指引**：
```bash
cd backend
npm install
npm test
```

### 2. 数据库迁移未执行
**问题描述**：数据库迁移脚本已创建，但未执行

**解决方案**：
1. 连接到MySQL数据库
2. 执行迁移脚本
3. 验证表是否正确创建

**操作指引**：
```bash
mysql -u root -p < backend/prisma/migrations/20260205_add_plugin_tables.sql
```

### 3. Prisma客户端未生成
**问题描述**：Prisma客户端尚未生成

**解决方案**：
1. 运行Prisma生成命令
2. 验证客户端是否正确生成
3. 检查生成的类型定义

**操作指引**：
```bash
cd backend
npx prisma generate
```

## 后续任务

### 任务3.2：自动学习系统
- [ ] 设计学习数据表
- [ ] 增强反馈收集器
- [ ] 实现学习引擎
- [ ] 实现模型更新器
- [ ] 实现学习管理API
- [ ] 实现学习管理前端
- [ ] 测试学习系统

### 任务3.3：智能推荐系统
- [ ] 设计推荐数据表
- [ ] 实现行为分析器
- [ ] 实现推荐引擎
- [ ] 实现推荐API
- [ ] 增强智能问答页面
- [ ] 测试推荐系统

### 任务3.4：全面监控系统
- [ ] 设计监控数据表
- [ ] 实现指标收集器
- [ ] 实现监控系统
- [ ] 实现监控API
- [ ] 实现监控仪表盘
- [ ] 测试监控系统

## 联系信息

### 技术支持
- **邮箱**：support@example.com
- **文档**：https://docs.example.com
- **问题跟踪**：https://github.com/example/issues

### 开发团队
- **项目负责人**：张三
- **后端开发**：李四
- **前端开发**：王五
- **测试工程师**：赵六

---

**文档更新日期**：2026-02-05  
**文档版本**：1.0  
**文档状态**：待办
