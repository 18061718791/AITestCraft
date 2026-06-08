# 缺陷管理功能共识文档（更新版）

## 1. 明确的需求描述

### 1.1 功能需求

**核心功能**：
1. **缺陷管理菜单**：在现有测试平台上增加一个缺陷管理的功能菜单
2. **目录结构展示**：展示缺陷管理的树状目录结构，支持展开/折叠
3. **问题列表展示**：展示从 PostgreSQL 数据库中获取的 issues 表数据
4. **数据可视化分析**：生成折线图和饼图，支持项目汇总和各系统分析

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

**目录层级定义**：
- **根目录**：2980（缺陷管理）
- **二级目录**：2981、2982、2983、2984
- **三级目录**：2989、2990、3334（在 2981 下）

**目录排除规则**：
- 查询问题清单时，排除所有目录 ID（2981、2982、2983、2984、2989、2990、3334）
- 但需要通过 parent_id 关联查询问题的父任务标题

### 1.3 状态和优先级定义

**状态定义**：
| status_id | 状态名称 | 说明 |
|-----------|----------|------|
| 1 | 新问题 | New |
| 2 | 已回复 | Replied |
| 3 | 进行中 | In Progress |
| 4 | 已解决 | Resolved |
| 5 | 已关闭 | Closed |
| 6 | 待审 | Pending |
| 8 | 待处理 | Pending |

**优先级定义**：
| priority_id | 优先级名称 | 说明 |
|-------------|------------|------|
| 2 | 一般问题 | Normal |
| 4 | 紧急问题 | Urgent |

### 1.4 数据库信息

- **数据库类型**：PostgreSQL
- **IP 地址**：10.20.42.40
- **端口**：25432
- **用户名**：redmine_ro
- **密码**：readonly_pass
- **数据库名**：redmine_production
- **Schema**：public
- **表名**：issues

## 2. 验收标准

### 2.1 功能验收标准

#### 2.1.1 目录结构展示
- ✅ 正确展示缺陷管理的树状目录结构
- ✅ 支持目录的展开/折叠功能
- ✅ 点击目录节点可以筛选对应的问题

#### 2.1.2 问题列表展示
- ✅ 全量查看 2980 下除目录外的所有问题
- ✅ 问题列表正确展示，字段包括：ID、标题、状态、优先级、创建时间、更新时间等
- ✅ 支持问题与父任务名称关联展示
- ✅ 支持分页功能（每页 20 条）
- ✅ 支持按状态、优先级、创建时间等条件筛选
- ✅ 支持按创建时间、更新时间排序

#### 2.1.3 联合检索功能
- ✅ 支持根据二级子目录关系检索
- ✅ 支持根据三级子目录关系检索
- ✅ 支持二级和三级子目录的联合检索

#### 2.1.4 数据分析 - 项目汇总

**折线图**：
1. **Bug ALLOpen & ALLClose 趋势图**：
   - 拆线 1（ALLOpen）：创建日期从 2025年12月8日开始，每7天为一个统计周期
   - 拆线 2（ALLClose）：更新日期从 2025年12月8日开始，每7天为一个统计周期，status_id = 5

2. **紧急 BUG 解决趋势图**：
   - 拆线 1（打开）：创建日期从 2025年12月8日开始，每7天为一个统计周期，priority_id = 4
   - 拆线 2（关闭）：更新日期从 2025年12月8日开始，每7天为一个统计周期，priority_id = 4，status_id = 5

**饼图**：
1. **系统分布图 - BUG（ALL）**：创建日期从 2025年12月8日开始到当前日期，按二级子目录名称分布
2. **系统分布图 - BUG（紧急）**：筛选 priority_id = 4，按二级子目录名称分布
3. **等级分布图**：按优先级分布

#### 2.1.5 数据分析 - 各系统问题分析

**折线图**：
1. **Bug ALLOpen & ALLClose 趋势图**：
   - 拆线 1（ALLOpen）：创建日期从 2025年12月8日开始，每7天为一个统计周期，二级子目录下所有问题
   - 拆线 2（ALLClose）：更新日期从 2025年12月8日开始，每7天为一个统计周期，status_id = 5

2. **紧急 BUG 解决趋势图**：
   - 拆线 1（打开）：创建日期从 2025年12月8日开始，每7天为一个统计周期，priority_id = 4
   - 拆线 2（关闭）：更新日期从 2025年12月8日开始，每7天为一个统计周期，priority_id = 4，status_id = 5

**饼图**：
1. **等级分布图**：按优先级分布

### 2.2 技术验收标准

1. **代码质量**：符合项目现有代码规范，无语法错误
2. **数据库连接**：使用安全的数据库连接方式，密码不硬编码
3. **前端性能**：图表渲染流畅，无明显卡顿
4. **错误处理**：对数据库连接失败等异常情况有合理的错误处理
5. **响应性能**：页面加载和数据刷新响应时间不超过 5 秒
6. **SQL 性能**：优化 SQL 查询，避免全表扫描

### 2.3 时间周期定义

- **起始日期**：2025年12月8日（周一）
- **统计周期**：每7天（一周）
- **结束日期**：当前日期

## 3. 技术实现方案

### 3.1 后端实现方案

#### 3.1.1 数据库连接
- 使用 `pg` 模块连接 PostgreSQL 数据库
- 配置数据库连接池（最大连接数：10，空闲超时：30000ms）
- 实现数据库连接错误处理和重连机制

#### 3.1.2 API 设计

**目录结构相关**：
- `GET /api/defects/tree` - 获取目录树结构

**问题列表相关**：
- `GET /api/defects` - 获取缺陷列表（支持分页和过滤）
- `GET /api/defects/:id` - 获取缺陷详情

**项目汇总统计**：
- `GET /api/defects/statistics/overview/trend` - 获取项目汇总折线图数据
- `GET /api/defects/statistics/overview/pie/system` - 获取项目汇总系统分布饼图数据
- `GET /api/defects/statistics/overview/pie/priority` - 获取项目汇总优先级分布饼图数据
- `GET /api/defects/statistics/overview/pie/emergency` - 获取项目汇总紧急问题系统分布饼图数据

**各系统统计**：
- `GET /api/defects/statistics/system/:systemId/trend` - 获取指定系统折线图数据
- `GET /api/defects/statistics/system/:systemId/pie/priority` - 获取指定系统优先级分布饼图数据

**辅助接口**：
- `GET /api/defects/statuses` - 获取状态列表
- `GET /api/defects/priorities` - 获取优先级列表

#### 3.1.3 SQL 查询设计

**全量问题列表查询（带父任务标题）**：
```sql
SELECT
  i.*,
  p.subject as parent_subject,
  ps.name as status_name,
  pp.name as priority_name
FROM issues i
LEFT JOIN issues p ON i.parent_id = p.id
LEFT JOIN issue_statuses ps ON i.status_id = ps.id
LEFT JOIN enumerations pp ON i.priority_id = pp.id
WHERE i.project_id = 2980
AND i.id NOT IN (2981, 2982, 2983, 2984, 2989, 2990, 3334)
ORDER BY i.created_on DESC
LIMIT :limit OFFSET :offset
```

**项目汇总 ALLOpen 趋势统计**：
```sql
SELECT
  DATE_TRUNC('week', created_on)::date as week_start,
  COUNT(*) as count
FROM issues
WHERE project_id = 2980
AND created_on >= '2025-12-08'
AND id NOT IN (2981, 2982, 2983, 2984, 2989, 2990, 3334)
GROUP BY DATE_TRUNC('week', created_on)::date
ORDER BY week_start
```

**项目汇总 ALLClose 趋势统计**：
```sql
SELECT
  DATE_TRUNC('week', updated_on)::date as week_start,
  COUNT(*) as count
FROM issues
WHERE project_id = 2980
AND updated_on >= '2025-12-08'
AND status_id = 5
AND id NOT IN (2981, 2982, 2983, 2984, 2989, 2990, 3334)
GROUP BY DATE_TRUNC('week', updated_on)::date
ORDER BY week_start
```

**系统分布饼图数据**：
```sql
SELECT
  CASE
    WHEN parent_id = 2981 THEN '低代码&研发管理平台'
    WHEN parent_id = 2982 THEN '物联应用'
    WHEN parent_id = 2983 THEN '物联平台'
    WHEN parent_id = 2984 THEN '大数据平台'
    ELSE '其他'
  END as system_name,
  COUNT(*) as count
FROM issues
WHERE project_id = 2980
AND created_on >= '2025-12-08'
AND id NOT IN (2981, 2982, 2983, 2984, 2989, 2990, 3334)
GROUP BY
  CASE
    WHEN parent_id = 2981 THEN '低代码&研发管理平台'
    WHEN parent_id = 2982 THEN '物联应用'
    WHEN parent_id = 2983 THEN '物联平台'
    WHEN parent_id = 2984 THEN '大数据平台'
    ELSE '其他'
  END
ORDER BY count DESC
```

### 3.2 前端实现方案

#### 3.2.1 页面设计

**缺陷管理首页** (`DefectHomePage.tsx`)：
- 左侧：目录树组件
- 右侧：统计概览卡片

**问题列表页面** (`DefectListPage.tsx`)：
- 顶部：筛选器组件
- 中部：问题列表组件（表格形式）
- 底部：分页组件

**数据分析页面** (`DefectAnalysisPage.tsx`)：
- 顶部：分析维度切换（项目汇总 / 各系统分析）
- 中部：图表展示区域
  - 左侧：折线图区域
  - 右侧：饼图区域
- 底部：数据明细表格

#### 3.2.2 组件设计

**目录树组件** (`DefectTree.tsx`)：
- 支持多级目录展示
- 支持展开/折叠
- 支持点击选择
- 显示目录名称和子问题数量

**问题列表组件** (`DefectTable.tsx`)：
- 表格展示问题列表
- 支持排序、筛选
- 显示关联的父任务标题
- 支持分页

**筛选器组件** (`DefectFilter.tsx`)：
- 状态筛选（下拉多选）
- 优先级筛选（下拉多选）
- 时间范围筛选
- 二级目录筛选

**折线图组件** (`TrendChart.tsx`)：
- 支持多条折线
- 支持图例切换
- 支持 Tooltip 提示
- 支持数据点悬停显示详情

**饼图组件** (`DistributionChart.tsx`)：
- 支持数据标签
- 支持图例
- 支持 Tooltip 提示
- 支持点击切片筛选数据

#### 3.2.3 路由配置

```typescript
const routes = [
  {
    path: '/defects',
    component: DefectLayout,
    children: [
      { path: '', component: DefectHomePage },
      { path: 'list', component: DefectListPage },
      { path: 'analysis', component: DefectAnalysisPage },
    ]
  }
];
```

#### 3.2.4 导航菜单配置

```typescript
const menuItems = [
  {
    key: 'defects',
    label: '缺陷管理',
    icon: 'BugOutlined',
    children: [
      { key: 'defects-home', label: '目录结构', path: '/defects' },
      { key: 'defects-list', label: '问题列表', path: '/defects/list' },
      { key: 'defects-analysis', label: '数据分析', path: '/defects/analysis' },
    ]
  }
];
```

## 4. 技术约束和集成方案

### 4.1 技术约束

**数据库访问**：
- 只读模式，不修改原始数据库结构
- 使用指定的只读账号
- 禁止使用动态 SQL 拼接，防止 SQL 注入

**性能约束**：
- 大数据集分页处理
- 图表数据预计算和缓存
- 统计查询优化，避免全表扫描

**安全约束**：
- 数据库密码使用环境变量管理
- 实现请求参数验证
- 实现 API 速率限制

### 4.2 集成方案

**后端集成**：
- 在现有 Express 应用中添加新的路由
- 使用独立的数据库连接配置
- 实现与现有日志系统的集成

**前端集成**：
- 复用现有布局和样式
- 集成到现有路由系统
- 保持一致的用户体验
- 遵循现有组件风格

## 5. 任务边界限制

### 5.1 功能边界

**✅ 任务范围**：
1. 缺陷管理目录树展示
2. 问题列表展示（带分页和筛选）
3. 问题与父任务标题关联展示
4. 二级和三级目录联合检索
5. 项目汇总分析（折线图和饼图）
6. 各系统问题分析（折线图和饼图）

**❌ 不在任务范围内**：
1. 缺陷的创建、编辑、删除功能
2. 目录结构的编辑和管理
3. 复杂的工作流管理
4. 实时数据更新（仅支持手动刷新）
5. 缺陷的评论和附件管理
6. 用户权限管理

### 5.2 技术边界

**✅ 任务范围**：
1. PostgreSQL 数据库连接
2. 数据统计和分析
3. 前端图表展示
4. 目录树组件开发

**❌ 不在任务范围内**：
1. 实时数据更新（WebSocket）
2. 高级数据挖掘和预测分析
3. 多数据源整合
4. 数据导出功能（可扩展）

## 6. 关键假设

1. **数据库连接**：
   - 数据库服务器可正常访问
   - 提供的用户名和密码正确且有足够的权限
   - issues 表包含所有必要的字段

2. **数据结构**：
   - issues 表结构稳定
   - 状态 ID 和优先级 ID 有明确的业务含义
   - parent_id 字段正确关联到父问题

3. **性能需求**：
   - 数据量在可处理范围内（约 2800+ 条记录）
   - 并发用户数在合理范围内
   - 统计查询可以在 3 秒内完成

4. **集成环境**：
   - 现有平台的技术栈稳定
   - 前端框架支持添加新的图表库
   - 后端框架支持添加新的路由

## 7. 质量门控

### 7.1 需求边界清晰无歧义
- ✅ 功能需求已明确
- ✅ 目录结构已确认
- ✅ 统计规则已明确
- ✅ 技术实现方案已确定

### 7.2 技术方案与现有架构对齐
- ✅ 后端使用现有 Express 框架
- ✅ 前端使用现有 React 框架
- ✅ 数据库连接使用标准 PG 模块
- ✅ 遵循现有代码风格和命名规范

### 7.3 验收标准具体可测试
- ✅ 功能验收标准已量化
- ✅ 技术验收标准已明确
- ✅ 测试方法已设计
- ✅ 验收用例已定义

### 7.4 所有关键假设已确认
- ✅ 数据库连接信息已确认
- ✅ 目录结构已确认
- ✅ 状态和优先级定义已确认
- ✅ 时间周期已确认
- ✅ 统计规则已确认

## 8. 后续步骤

### 8.1 详细设计
- API 接口详细设计
- SQL 查询优化设计
- 前端页面详细设计
- 组件接口设计

### 8.2 实现开发
- 后端服务实现
  - 数据库连接池
  - 目录树数据服务
  - 问题列表服务
  - 统计分析服务
- 前端页面开发
  - 目录树组件
  - 问题列表组件
  - 筛选器组件
  - 图表组件
  - 页面布局
- API 接口集成

### 8.3 测试验证
- 数据库连接测试
- API 功能测试
  - 目录树接口测试
  - 问题列表接口测试
  - 统计接口测试
- 前端展示测试
  - 目录树交互测试
  - 问题列表展示测试
  - 图表渲染测试
- 性能测试
  - API 响应时间测试
  - 前端加载性能测试
  - 图表渲染性能测试

### 8.4 部署上线
- 集成到现有平台
- 环境配置
- 功能完整性验证
- 监控系统性能

### 8.5 文档更新
- 技术实现文档
- API 接口文档
- 用户操作指南
- 故障排查手册