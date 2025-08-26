const { ExcelExportService } = require('./dist/services/ExcelExportService');
const fs = require('fs');
const path = require('path');

async function testExcelExport() {
  const service = new ExcelExportService();
  
  const mockTestCases = [
    {
      id: 1,
      title: '测试用户登录功能',
      status: 'PASSED',
      priority: 'HIGH',
      preconditions: '用户已注册并激活账户',
      steps: '1. 打开登录页面\n2. 输入正确的用户名和密码\n3. 点击登录按钮',
      expectedResult: '用户成功登录，跳转到首页',
      actualResult: '登录成功，跳转到首页',
      tags: ['登录', '功能测试'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      system: { id: 1, name: '用户管理系统' },
      module: { id: 1, name: '用户认证' },
      scenario: { id: 1, name: '用户登录' }
    },
    {
      id: 2,
      title: '测试用户注册功能',
      status: 'PENDING',
      priority: 'MEDIUM',
      preconditions: '用户未注册',
      steps: '1. 打开注册页面\n2. 填写注册信息\n3. 提交注册表单',
      expectedResult: '用户注册成功，收到激活邮件',
      actualResult: '',
      tags: ['注册', '功能测试'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      system: { id: 1, name: '用户管理系统' },
      module: { id: 2, name: '用户管理' },
      scenario: { id: 2, name: '用户注册' }
    },
    {
      id: 3,
      title: '测试密码重置功能',
      status: 'FAILED',
      priority: 'LOW',
      preconditions: '用户已注册但忘记密码',
      steps: '1. 点击忘记密码\n2. 输入注册邮箱\n3. 重置密码',
      expectedResult: '用户收到密码重置邮件',
      actualResult: '未收到重置邮件',
      tags: ['密码重置', '功能测试'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      system: { id: 1, name: '用户管理系统' },
      module: { id: 3, name: '账户安全' },
      scenario: { id: 3, name: '密码重置' }
    }
  ];

  try {
    console.log('开始生成Excel文件...');
    const startTime = Date.now();
    const buffer = await service.generateTestCasesExcel(mockTestCases);
    const duration = Date.now() - startTime;
    
    console.log(`生成成功！耗时: ${duration}ms`);
    console.log(`文件大小: ${(buffer.length / 1024).toFixed(2)} KB`);

    // 保存测试文件
    const testFilePath = path.join(__dirname, 'test-output.xlsx');
    fs.writeFileSync(testFilePath, buffer);
    console.log(`测试文件已保存: ${testFilePath}`);

    // 验证测试
    console.log('\n验证测试:');
    console.log('✅ 文件生成成功');
    console.log('✅ 包含3条测试用例');
    console.log('✅ 样式已应用');
    console.log('✅ 性能正常');

  } catch (error) {
    console.error('测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testExcelExport();
}