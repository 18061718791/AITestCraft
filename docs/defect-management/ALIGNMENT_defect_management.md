# 缺陷管理功能对齐文档（更新版）

## 1. 原始需求

### 1.1 功能需求
- **缺陷管理菜单**：在现有测试平台上增加一个缺陷管理的功能菜单
- **问题列表展示**：展示从 PostgreSQL 数据库中获取的 issues 表数据
- **目录结构管理**：展示缺陷管理的树状目录结构
- **数据可视化分析**：
  - 折线图：Bug ALLOpen & ALLClose 趋势图、紧急 BUG 解决趋势图
  - 饼图：系统分布图、等级分布图

### 1.2 目录结构
```
缺陷管理（id:2980）
├── 低代码&研发管理平台（id:2981）
│   ├── 低代码工具（id:2989）
│   ├── 研发管理平台（id:2990）
│   └── 客户问题（id:3334）
├── 物联应用（id:2982）
├── 物联平台（id:2983）
└── 大数据平台（id:2984）
```

**说明**：
- 2980 是最上层目录（缺陷管理根目录）
- 2981、2982、2983、2984 是二级子目录
- 2989、2990、3334 是 2981 下的三级子目录
- 二级和三级目录本身不是问题，而是分类目录

### 1.3 数据库信息
- **数据库类型**：PostgreSQL
- **IP 地址**：10.20.42.40
- **端口**：25432
- **用户名**：redmine_ro
- **密码**：readonly_pass
- **数据库名**：redmine_production
- **Schema**：public
- **表名**：issues

### 1.4 状态和优先级定义
- **状态定义**：
  - status_id = 1：新问题（New）
  - status_id = 2：已回复（Replied）
  - status_id = 3：进行中（In Progress）
  - status_id = 4：已解决（Resolved）
  - status_id = 5：已关闭（Closed）
  - status_id = 6：待审（Pending）
  - status_id = 8：待处理（Pending）

- **优先级定义**：
  - priority_id = 2：一般问题
  - priority_id = 4：紧急问题

## 2. 边界确认

### 2.1 明确任务范围

**✅ 任务范围**：
1. 展示缺陷管理目录树结构
2. 全量查看 2980 下除目录外的所有问题（project_id = 2980，排除目录 ID）
3. 支持问题与父任务名称关联展示
4. 支持根据二级和三级子目录关系联合检索
5. 项目汇总分析（缺陷管理 2980 下除目录外的所有缺陷）
   - 折线图：Bug ALLOpen & ALLClose 趋势图
   - 折线图：紧急 BUG 解决趋势图
   - 饼图：系统分布图（BUG ALL）
   - 饼图：系统分布图（BUG 紧急）
   - 饼图：等级分布图
6. 各系统问题分析（二级子目录下的问题，排除三级目录）
   - 折线图：Bug ALLOpen & ALLClose 趋势图
   - 折线图：紧急 BUG 解决趋势图
   - 饼图：等级分布图

**❌ 不在任务范围内**：
1. 缺陷的创建、编辑、删除功能（只读模式）
2. 目录结构的编辑和管理（仅展示）
3. 复杂的工作流管理
4. 实时数据更新（定时刷新可考虑）

### 2.2 目录 ID 清单
- **根目录**：2980（缺陷管理）
- **二级目录**：
  - 2981（低代码&研发管理平台）
  - 2982（物联应用）
  - 2983（物联平台）
  - 2984（大数据平台）
- **三级目录**：
  - 2989（低代码工具）
  - 2990（研发管理平台）
  - 3334（客户问题）

**排除规则**：
- 排除所有二级目录 ID（2981、2982、2983、2984）
- 排除所有三级目录 ID（2989、2990、3334）

## 3. 需求理解

### 3.1 对现有项目的理解

**项目结构**：
- **后端**：Node.js + TypeScript + Express + Prisma ORM
  - 现有数据库：SQLite（用于测试用例管理）
  - 新增：PostgreSQL 连接（用于缺陷数据获取）
  - 目录结构：src/ 包含 controllers、services、routes 等

- **前端**：React + TypeScript + Vite
  - 目录结构：src/ 包含 components、pages、routes、services 等
  - 现有功能：测试用例管理、系统管理等

### 3.2 核心业务逻辑

**问题筛选规则**：
1. **项目汇总查询**：
   - `project_id = 2980`
   - `parent_id` 不为任何目录 ID（2981、2982、2983、2984、2989、2990、3334）
   - 但需要关联查询 parent_id 对应的问题标题

2. **二级目录查询**：
   - `project_id = 2980`
   - `parent_id` 不为任何三级目录 ID（2989、2990、3334）
   - 支持按 `parent_id` 分组统计

**时间周期定义**：
- 起始日期：2025年12月8日（周一）
- 统计周期：每7天（一周）
- 结束日期：当前日期

## 4. 疑问澄清

### 4.1 已确认信息

✅ **数据库连接信息**：
- 用户名：redmine_ro
- 密码：readonly_pass

✅ **目录结构**：
- 已提供完整的目录树结构

✅ **状态和优先级定义**：
- status_id 的含义已明确
- priority_id 的含义已明确

✅ **时间周期**：
- 起始日期：2025年12月8日
- 统计周期：7天

### 4.2 仍需确认的问题

⚠️ **状态 ID 对应的中文名称**：
- 建议获取 issue_statuses 表的数据，以获取状态的中文名称

⚠️ **优先级 ID 对应的中文名称**：
- 建议获取 enumerations 表的数据，以获取优先级的中文名称

⚠️ **parent_id 问题标题的关联查询**：
- 确认是否可以通过自连接查询获取 parent_id 对应的问题标题



## 5. 初步设计思路

### 5.1 后端设计

**数据库连接**：
- 使用 `pg` 模块连接 PostgreSQL 数据库
- 配置数据库连接池，提高性能
- 实现数据库连接错误处理

**API 设计**：
- `GET /api/defects` - 获取缺陷列表（支持分页和过滤）
- `GET /api/defects/tree` - 获取目录树结构
- `GET /api/defects/statistics/overview` - 获取项目汇总统计数据
- `GET /api/defects/statistics/system/:systemId` - 获取指定系统统计数据
- `GET /api/defects/statistics/trend` - 获取时间趋势数据
- `GET /api/defects/statistics/status` - 获取状态分布数据
- `GET /api/defects/statistics/priority` - 获取优先级分布数据

**SQL 查询设计**：

1. **全量问题列表查询**：
```sql
SELECT * FROM issues
WHERE project_id = 2980
AND id NOT IN (2981, 2982, 2983, 2984, 2989, 2990, 3334)
AND id NOT IN (SELECT id FROM issues WHERE parent_id IN (2981, 2982, 2983, 2984, 2989, 2990, 3334))
LIMIT 20 OFFSET 0
```

2. **带父任务标题的查询**：
```sql
SELECT i.*, p.subject as parent_subject
FROM issues i
LEFT JOIN issues p ON i.parent_id = p.id
WHERE i.project_id = 2980
AND i.id NOT IN (2981, 2982, 2983, 2984, 2989, 2990, 3334)
```

3. **时间趋势统计查询**：
```sql
SELECT
  DATE_TRUNC('week', created_on) as week,
  COUNT(*) as total_open
FROM issues
WHERE project_id = 2980
AND created_on >= '2025-12-08'
GROUP BY DATE_TRUNC('week', created_on)
ORDER BY week
```

### 5.2 前端设计

**页面设计**：
- **缺陷管理首页**：展示目录树和统计概览
- **问题列表页面**：展示问题清单，支持筛选和分页
- **数据分析页面**：展示各类图表分析结果
  - 项目汇总分析
  - 各系统问题分析

**组件设计**：
- **目录树组件**：展示缺陷管理的树状目录结构
- **问题列表组件**：展示问题清单，支持分页和排序
- **筛选器组件**：支持多条件筛选
- **折线图组件**：展示时间趋势分析
- **饼图组件**：展示分布分析

**导航设计**：
- 在现有菜单中添加"缺陷管理"选项
- 实现子菜单：目录结构、问题列表、数据分析

### 5.3 技术选型

**后端**：
- `pg` 模块（PostgreSQL 连接）
- Express 框架
- TypeScript

**前端**：
- React 框架
- Chart.js 或 ECharts（数据可视化）
- Ant Design（UI 组件库，可选）

## 6. 后续步骤

1. **详细设计**：
   - API 接口详细设计
   - SQL 查询优化设计
   - 前端页面详细设计

2. **实现开发**：
   - 后端服务实现
   - 前端页面开发
   - 数据可视化集成

3. **测试验证**：
   - 数据库连接测试
   - API 功能测试
   - 前端展示测试
   - 性能测试

4. **部署上线**：
   - 集成到现有平台
   - 验证功能完整性
   - 监控系统性能

5. **文档更新**：
   - 技术实现文档
   - 用户操作指南
   - 故障排查手册