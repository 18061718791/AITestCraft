---
name: "task-verification"
description: "验证代码修改后的逻辑是否正确。在修改核心业务逻辑、复杂算法、数据处理代码后自动生成测试脚本验证修复结果。"
---

# 任务结果验证

## 触发条件

当满足以下任一条件时，应主动执行此技能：

1. **修改了核心业务逻辑代码**（如数据处理、统计计算、权限验证等）
2. **修改了复杂的算法或递归逻辑**
3. **修改了数据库查询逻辑**
4. **用户反馈修改后结果不正确，需要排查问题**
5. **涉及多文件联动的修改**

## 执行步骤

### 第一步：分析修改内容

1. 识别修改的代码文件和函数
2. 理解修改的业务目的
3. 确定输入参数和预期输出

### 第二步：生成测试脚本

在项目根目录创建测试脚本 `test-verification.js`（或 `.ts`），包含：

```javascript
// 1. 导入必要的依赖
// 2. 复制修改后的核心逻辑函数
// 3. 设计测试用例
//    - 正常情况测试
//    - 边界条件测试
//    - 异常情况测试
// 4. 执行测试并输出结果
// 5. 对比预期结果与实际结果
```

### 第三步：执行测试

```bash
node test-verification.js
```

### 第四步：分析测试结果

1. 检查测试是否通过
2. 如果失败，分析失败原因
3. 返回修改代码或调整测试用例

### 第五步：清理

验证通过后，删除测试脚本文件。

## 测试脚本模板

```javascript
const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

// === 复制被测试的核心函数 ===
async function targetFunction(...args) {
  // 复制修改后的逻辑代码
}

// === 测试用例 ===
const testCases = [
  {
    name: '测试用例1：正常情况',
    input: { ... },
    expected: { ... }
  },
  {
    name: '测试用例2：边界条件',
    input: { ... },
    expected: { ... }
  }
];

// === 执行测试 ===
async function runTests() {
  console.log('=== 开始验证测试 ===\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log(`测试: ${testCase.name}`);
    const result = await targetFunction(testCase.input);
    
    if (JSON.stringify(result) === JSON.stringify(testCase.expected)) {
      console.log('  ✓ 通过\n');
      passed++;
    } else {
      console.log('  ✗ 失败');
      console.log(`  预期: ${JSON.stringify(testCase.expected)}`);
      console.log(`  实际: ${JSON.stringify(result)}\n`);
      failed++;
    }
  }
  
  console.log(`=== 测试结果 ===`);
  console.log(`通过: ${passed}, 失败: ${failed}`);
  
  await prisma.$disconnect();
}

runTests();
```

## 最佳实践

1. **测试数据要真实**：使用实际数据库中的数据进行测试
2. **覆盖关键场景**：重点测试用户反馈的问题场景
3. **添加详细日志**：在测试脚本中添加调试日志，便于定位问题
4. **对比修改前后**：如果可能，对比修改前后的结果差异
5. **验证关联影响**：检查修改是否影响其他相关功能

## 示例：验证统计逻辑修复

```javascript
// 测试场景：验证目录ID统计逻辑
// 问题：二级目录有子模块时，统计重复

async function testDirectoryIdLogic() {
  // 测试智能物联项目 (id=2980)
  const ids2980 = await getAllChildDirectoryIds('2980', false);
  const expected2980 = [2989, 2990, 3334, 2982, 2983, 2984, 2985];
  
  console.log('实际结果:', ids2980.sort());
  console.log('预期结果:', expected2980.sort());
  console.log('是否匹配:', 
    JSON.stringify(ids2980.sort()) === JSON.stringify(expected2980.sort()) 
      ? '✓ 通过' : '✗ 失败'
  );
}
```

## 注意事项

- 此技能不替代单元测试框架，而是快速验证修改的即时效果
- 测试脚本应在验证完成后删除，避免污染代码库
- 对于复杂项目，建议后续补充正式的单元测试
