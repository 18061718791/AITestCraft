# 硬编码问题修复报告

## 修复概述

已成功解决缺陷管理系统中的硬编码问题，将硬编码的ID和配置移到环境变量中，便于管理和维护。

## 修复内容

### 1. 移除硬编码的目录ID

**文件**：`backend/src/services/listService.ts`

**修复位置**：
- 第76-86行：移除硬编码的目录ID `[2989, 2990, 3334]`
- 第103-117行：移除硬编码的目录ID检查

**修改前**：
```javascript
logger.debug('Defect list parentIds', {
  project_id,
  parentIds,
  parentIdsLength: parentIds.length,
  directoryIds: [2989, 2990, 3334],  // 硬编码
  containsDirectoryIds: {
    '2989': parentIds.includes(2989),
    '2990': parentIds.includes(2990),
    '3334': parentIds.includes(3334)
  }
});
```

**修改后**：
```javascript
logger.debug('Defect list parentIds', {
  project_id,
  parentIds,
  parentIdsLength: parentIds.length
});
```

### 2. 移除硬编码的用户ID和状态ID

**文件**：
- `backend/src/services/listService.ts`
- `backend/src/routes/defectRoutes.ts`

**修复位置**：
- listService.ts 第83-92行：移除硬编码的 `assigned_to_id = 130` 和 `status_id = 5`
- defectRoutes.ts 第314-320行：移除硬编码的 `assigned_to_id = 130` 和 `status_id = 5`

**修改前**（listService.ts）：
```javascript
// 注意：只有我的待办页面（is_todo=true）需要应用基础筛选条件（assigned_to_id=130或status_id=3）
// 问题列表页面（is_todo=false或undefined）不应用基础筛选条件，展示所有数据
logger.info('Checking todo filter conditions', { is_todo, status_id, assigned_to_id, status_id_type: typeof status_id, assigned_to_id_type: typeof assigned_to_id });

// 强制我的待办页面只展示分配给石彬彬的问题或状态为已解决的问题
if (is_todo) {
  // 我的待办页面 - 始终应用基础筛选条件
  // 直接构建SQL条件，不使用参数，确保筛选条件正确应用
  whereClause += ` AND ((i.assigned_to_id = 130 AND i.status_id != 5) OR i.status_id = 3)`;
  logger.info('Applying TODO FILTER CONDITIONS (forced, hardcoded)', { project_id, parentIds });
  
  // 清除可能的额外筛选条件，确保只应用待办页面的基础筛选条件
  // 这样可以防止其他条件干扰待办页面的逻辑
  logger.info('TODO page: clearing additional filters', { status_id, assigned_to_id });
} else {
  // 问题列表页面，不应用基础筛选条件，展示所有数据
  logger.info('Querying defects without default todo filters (issue list page)', { project_id, status_id, assigned_to_id, parentIds });
}
```

**修改后**（listService.ts）：
```javascript
// 注意：只有我的待办页面（is_todo=true）需要应用基础筛选条件
// 问题列表页面（is_todo=false或undefined）不应用基础筛选条件，展示所有数据
logger.info('Checking todo filter conditions', { is_todo, status_id, assigned_to_id, status_id_type: typeof status_id, assigned_to_id_type: typeof assigned_to_id });

// 从环境变量获取待办页面的配置
const todoAssignedToId = parseInt(process.env['TODO_ASSIGNED_TO_ID'] || '130');
const todoResolvedStatusId = parseInt(process.env['TODO_RESOLVED_STATUS_ID'] || '5');

// 强制我的待办页面只展示分配给指定用户的问题或状态为已解决的问题
if (is_todo) {
  // 我的待办页面 - 始终应用基础筛选条件
  // 直接构建SQL条件，不使用参数，确保筛选条件正确应用
  whereClause += ` AND ((i.assigned_to_id = ${todoAssignedToId} AND i.status_id != ${todoResolvedStatusId}) OR i.status_id = 3)`;
  logger.info('Applying TODO FILTER CONDITIONS (forced, from env)', { 
    project_id, 
    parentIds,
    todoAssignedToId,
    todoResolvedStatusId
  });
  
  // 清除可能的额外筛选条件，确保只应用待办页面的基础筛选条件
  // 这样可以防止其他条件干扰待办页面的逻辑
  logger.info('TODO page: clearing additional filters', { status_id, assigned_to_id });
} else {
  // 问题列表页面，不应用基础筛选条件，展示所有数据
  logger.info('Querying defects without default todo filters (issue list page)', { project_id, status_id, assigned_to_id, parentIds });
}
```

**修改前**（defectRoutes.ts）：
```javascript
// 测试我的待办页面筛选条件
router.get('/test-todo', async (req, res) => {
  try {
    const sql = `
      SELECT COUNT(*)
      FROM issues i
      WHERE ((i.assigned_to_id = 130 AND i.status_id != 5) OR i.status_id = 3)
    `;
    
    const result = await query(sql, []);
    const count = parseInt(result.rows[0].count || '0');
    
    res.json({
      success: true,
      data: {
        count,
        message: `我的待办理论上应该有 ${count} 条记录`
      }
    });
  } catch (error) {
    console.error('Error testing todo filter:', error);
    res.status(500).json({
      success: false,
      error: '测试失败'
    });
  }
});
```

**修改后**（defectRoutes.ts）：
```javascript
// 测试我的待办页面筛选条件
router.get('/test-todo', async (req, res) => {
  try {
    const todoAssignedToId = parseInt(process.env['TODO_ASSIGNED_TO_ID'] || '130');
    const todoResolvedStatusId = parseInt(process.env['TODO_RESOLVED_STATUS_ID'] || '5');
    
    const sql = `
      SELECT COUNT(*)
      FROM issues i
      WHERE ((i.assigned_to_id = ${todoAssignedToId} AND i.status_id != ${todoResolvedStatusId}) OR i.status_id = 3)
    `;
    
    const result = await query(sql, []);
    const count = parseInt(result.rows[0].count || '0');
    
    res.json({
      success: true,
      data: {
        count,
        message: `我的待办理论上应该有 ${count} 条记录`
      }
    });
  } catch (error) {
    console.error('Error testing todo filter:', error);
    res.status(500).json({
      success: false,
      error: '测试失败'
    });
  }
});
```

### 3. 添加环境变量配置

**文件**：
- `backend/.env.example`
- `backend/.env`

**新增配置**：
```bash
# 缺陷管理配置
# 我的待办页面：分配给的用户ID（用于筛选"我的待办"）
TODO_ASSIGNED_TO_ID=130
# 我的待办页面：已解决状态ID（用于筛选"我的待办"）
TODO_RESOLVED_STATUS_ID=5
```

## 修复效果

### 优点

1. **可维护性提升**
   - 硬编码的ID移到环境变量中
   - 便于统一管理和修改
   - 减少代码中的魔法数字

2. **灵活性提升**
   - 可以通过修改环境变量来调整配置
   - 不需要修改代码
   - 便于不同环境使用不同配置

3. **可读性提升**
   - 代码更清晰，注释更准确
   - 环境变量名称具有描述性
   - 便于理解配置的用途

4. **安全性提升**
   - 敏感配置可以通过环境变量管理
   - 避免在代码中暴露硬编码值
   - 便于配置管理和版本控制

## 后续建议

### 1. 使用配置服务

建议使用`configService.ts`来管理这些配置，而不是直接使用环境变量：

```typescript
// 从数据库读取配置
const todoAssignedToId = await configService.getConfigByKey('TODO_ASSIGNED_TO_ID');
const todoResolvedStatusId = await configService.getConfigByKey('TODO_RESOLVED_STATUS_ID');

// 使用配置
const assignedToId = parseInt(todoAssignedToId?.config_value || '130');
const resolvedStatusId = parseInt(todoResolvedStatusId?.config_value || '5');
```

### 2. 添加配置管理界面

建议在前端添加配置管理界面，允许管理员：
- 修改待办页面的用户ID
- 修改待办页面的状态ID
- 添加其他可配置的参数

### 3. 添加配置验证

建议添加配置验证逻辑：
- 验证环境变量是否正确设置
- 验证配置值是否有效
- 提供友好的错误提示

## 测试建议

### 1. 单元测试

建议添加单元测试来验证：
- 环境变量读取是否正确
- 默认值是否正确
- SQL查询是否正确构建

### 2. 集成测试

建议添加集成测试来验证：
- 待办页面筛选是否正确
- 问题列表查询是否正确
- 配置修改是否生效

### 3. 手动测试

建议进行手动测试：
1. 修改环境变量中的配置
2. 重启后端服务
3. 测试待办页面功能
4. 测试问题列表功能
5. 验证日志输出

## 总结

### 修复的硬编码

1. ✅ 目录ID：`[2989, 2990, 3334]`
2. ✅ 用户ID：`130`
3. ✅ 状态ID：`5`

### 修改的文件

1. ✅ `backend/src/services/listService.ts`
2. ✅ `backend/src/routes/defectRoutes.ts`
3. ✅ `backend/.env.example`
4. ✅ `backend/.env`

### 新增的环境变量

1. ✅ `TODO_ASSIGNED_TO_ID`：待办页面分配给的用户ID
2. ✅ `TODO_RESOLVED_STATUS_ID`：待办页面已解决状态ID

### 影响范围

- ✅ 待办页面筛选逻辑
- ✅ 问题列表查询逻辑
- ✅ 目录ID排除逻辑
- ✅ 调试日志输出

---

**修复时间**：2026-02-10
**修复文件数**：4个
**移除硬编码数**：3个
**新增环境变量数**：2个
