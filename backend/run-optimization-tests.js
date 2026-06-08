#!/usr/bin/env node

const OptimizationTestSuite = require('./src/tests/OptimizationTestSuite.ts').default;

/**
 * 优化测试运行器
 */
async function runOptimizationTests() {
  console.log('🔧 缺陷管理助手优化效果测试');
  console.log('=====================================\n');

  const testSuite = new OptimizationTestSuite();
  
  try {
    await testSuite.runAllTests();
    await testSuite.saveTestResults();
    
    console.log('\n🎉 测试完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  }
}

// 检查服务器是否运行
async function checkServerHealth() {
  try {
    const axios = require('axios');
    await axios.get('http://localhost:9000/health');
    return true;
  } catch (error) {
    return false;
  }
}

// 主函数
async function main() {
  const serverRunning = await checkServerHealth();
  
  if (!serverRunning) {
    console.log('❌ 服务器未运行，请先启动后端服务:');
    console.log('   cd backend && npm run dev');
    process.exit(1);
  }
  
  await runOptimizationTests();
}

main();