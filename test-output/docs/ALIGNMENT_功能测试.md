# ALIGNMENT - AITestCraft 功能测试项目分析

## 1. 原始需求

用户希望对AITestCraft平台进行全面的功能测试，分三个阶段进行：
1. **产品经理角色**：分析项目前后端实现，生成专业PRD文档
2. **测试经理角色**：基于PRD文档和项目界面，生成测试点和测试用例（Excel格式，含详细测试数据）
3. **多角色评审**：产品经理、测试经理、研发角色共同评审测试用例，分析覆盖度和可行性，生成评审报告

**约束条件**：
- 所有执行过程不允许修改项目代码
- 过程文件存储在全新文件夹中
- 最好能生成标准化的agent或skill以便后续复用

---

## 2. 项目上下文分析

### 2.1 项目概述

**项目名称**：AITestCraft（AI测试用例生成器）  
**项目定位**：基于DeepSeek AI的自动化测试用例生成工具  
**技术架构**：前后端分离架构

### 2.2 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React + TypeScript | 18.2.0 |
| 前端构建 | Vite | 4.5.0 |
| UI组件库 | Ant Design | 5.27.0 |
| 图表库 | Chart.js / Recharts | 4.5.1 / 3.7.0 |
| 后端框架 | Express.js + TypeScript | 4.18.2 |
| 数据库 | MySQL + Prisma ORM | 6.14.0 |
| 实时通信 | Socket.io | 4.7.4 |
| AI服务 | DeepSeek API | - |
| 测试框架 | Jest | 29.7.0 |

### 2.3 项目结构

```
AITestCraft/
├── frontend/          # 前端应用 (React + Vite)
│   ├── src/
│   │   ├── components/    # 组件
│   │   ├── pages/         # 页面
│   │   ├── services/      # API服务
│   │   ├── hooks/         # 自定义Hooks
│   │   ├── contexts/      # React上下文
│   │   ├── layouts/       # 布局组件
│   │   └── utils/         # 工具函数
│   └── package.json
├── backend/           # 后端API (Express.js)
│   ├── src/
│   │   ├── controllers/   # 控制器
│   │   ├── routes/        # 路由
│   │   ├── services/      # 业务服务
│   │   ├── middleware/    # 中间件
│   │   ├── utils/         # 工具函数
│   │   └── types/         # 类型定义
│   ├── prisma/
│   │   └── schema.prisma  # 数据库模型
│   └── package.json
├── shared/            # 共享类型定义
└── docs/             # 项目文档
```

### 2.4 核心功能模块

#### 2.4.1 测试用例管理模块
- **功能描述**：测试用例的CRUD操作、批量导入导出
- **前端页面**：TestCaseManagementPage.tsx, TestCaseAssistantPage.tsx
- **后端路由**：testCaseRoutes.ts
- **数据库表**：test_cases, systems, modules, scenarios

#### 2.4.2 缺陷管理模块
- **功能描述**：缺陷记录、分析、统计、紧急问题跟踪
- **前端页面**：
  - DefectHomePage.tsx - 缺陷管理首页
  - DefectListPage.tsx - 缺陷列表
  - DefectAnalysisPage.tsx - 缺陷分析
  - UrgentIssueTrackerPage.tsx - 紧急问题跟踪
  - MyTodoPage.tsx - 我的待办
- **后端路由**：defectRoutes.ts
- **数据库表**：projects, directories

#### 2.4.3 缺陷管理助手模块
- **功能描述**：AI驱动的缺陷查询助手，支持自然语言交互
- **前端页面**：DefectAssistantPage.tsx
- **后端路由**：defectAssistantRoutes.ts
- **核心服务**：
  - DefectAssistantService.ts - 助手主服务
  - IntentParser.ts - 意图解析
  - EntityExtractor.ts - 实体提取
  - QueryExecutor.ts - 查询执行
- **数据库表**：learning_records, synonyms, intent_patterns, learning_evaluations

#### 2.4.4 项目管理模块
- **功能描述**：项目信息管理、目录结构管理
- **前端页面**：ProjectManagementPage.tsx
- **后端路由**：projectRoutes.ts
- **数据库表**：projects, directories

#### 2.4.5 系统配置模块
- **功能描述**：系统配置、LLM配置、数据库配置、插件管理
- **前端页面**：
  - AdminHomePage.tsx - 管理首页
  - DatabaseConfigPage.tsx - 数据库配置
  - LLMConfigPage.tsx - LLM配置
  - PluginManagementPage.tsx - 插件管理
  - SystemMonitoringPage.tsx - 系统监控
- **后端路由**：systemRoutes.ts, system.ts
- **数据库表**：system_configs, system_metrics, plugins, plugin_versions, plugin_dependencies

#### 2.4.6 消息通知模块
- **功能描述**：消息推送配置、待办提醒
- **前端页面**：NotificationConfigPage.tsx, TodoReminderConfigPage.tsx
- **后端路由**：notificationRoutes.ts
- **数据库表**：notification_recipients, notification_settings

#### 2.4.7 快捷键模块
- **功能描述**：快捷键配置和管理
- **前端页面**：ShortcutConfigPage.tsx
- **后端路由**：shortcutRoutes.ts

#### 2.4.8 Prompt管理模块
- **功能描述**：Prompt模板管理
- **前端页面**：PromptManagementPage.tsx, PromptDetailPage.tsx, PromptEditPage.tsx
- **后端路由**：prompts.ts

### 2.5 数据库模型概览

| 模型 | 用途 | 核心字段 |
|------|------|----------|
| test_cases | 测试用例 | title, steps, expectedResults, priority, status |
| systems | 系统 | name, description |
| modules | 模块 | name, system_id |
| scenarios | 测试场景 | name, module_id, content |
| projects | 项目 | id, name |
| directories | 目录 | id, name, project_id, parent_id |
| plugins | 插件 | plugin_id, name, enabled |
| system_configs | 系统配置 | config_key, config_value, config_type |
| notification_settings | 通知设置 | enabled, start_time, end_time, interval |
| learning_records | 学习记录 | query, intent, confidence |
| async_tasks | 异步任务 | task_type, status, progress |

---

## 3. 需求边界确认

### 3.1 任务范围

**包含**：
1. 完整分析项目所有功能模块
2. 生成标准化的PRD文档
3. 生成详细的测试用例（Excel格式）
4. 生成多角色评审报告
5. 创建可复用的标准化技能

**不包含**：
1. 不修改任何项目源代码
2. 不执行实际的测试运行
3. 不部署或配置测试环境
4. 不涉及性能测试和安全测试（仅功能测试）

### 3.2 交付物清单

| 阶段 | 交付物 | 格式 |
|------|--------|------|
| 阶段1 | PRD文档 | Markdown |
| 阶段2 | 测试用例文档 | Excel (.xlsx) |
| 阶段3 | 评审报告 | Markdown |
| 技能 | 三个标准化技能 | SKILL.md |

---

## 4. 需求理解

### 4.1 项目理解

AITestCraft是一个AI驱动的测试用例生成平台，主要面向测试工程师和QA团队。平台的核心价值在于：

1. **AI辅助测试设计**：利用DeepSeek AI自动生成测试点和测试用例
2. **缺陷全生命周期管理**：从缺陷记录到分析统计的完整流程
3. **智能助手**：通过自然语言交互查询缺陷数据
4. **灵活配置**：支持多种配置和插件扩展

### 4.2 测试重点识别

根据项目特点，测试应重点关注：

1. **核心业务流**：测试用例生成 → 保存 → 导出
2. **AI交互功能**：自然语言输入 → 意图识别 → 结果返回
3. **数据一致性**：前后端数据同步、状态管理
4. **边界条件**：空数据、大数据量、特殊字符处理
5. **权限控制**：不同角色的功能访问限制

---

## 5. 疑问澄清

### 5.1 已确认问题

| 问题 | 答案 |
|------|------|
| 是否需要测试所有历史功能？ | 是，测试当前版本所有功能 |
| 测试数据如何准备？ | 使用模拟数据，不依赖真实环境 |
| 是否需要考虑浏览器兼容性？ | 是，主流浏览器（Chrome, Firefox, Edge）|
| 移动端是否需要测试？ | 响应式布局需要测试 |

### 5.2 假设条件

1. 项目代码已完整可用，无需补充开发
2. 测试用例设计基于当前代码实现，而非需求规格
3. 评审基于生成的测试用例进行，不涉及人工评审
4. 技能创建遵循项目现有技能格式（.trae/skills/）

---

## 6. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 项目代码复杂度高 | 分析不全面 | 按模块逐个分析，确保覆盖 |
| 测试用例数量庞大 | 文档过大 | 按模块组织，分级展示 |
| Excel格式要求复杂 | 生成困难 | 使用exceljs库，标准化模板 |
| 评审主观性强 | 标准不统一 | 制定明确的评审检查清单 |

---

## 7. 下一步行动

1. 创建CONSENSUS文档，明确技术方案和验收标准
2. 设计三个标准化技能（产品经理、测试经理、评审）
3. 按模块执行分析和测试用例生成
4. 生成最终评审报告

---

**文档版本**：v1.0  
**创建时间**：2026-02-28  
**作者**：AI Assistant
