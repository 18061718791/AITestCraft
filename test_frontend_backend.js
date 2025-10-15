const axios = require('axios');

// 测试配置
const BACKEND_URL = 'http://localhost:9000';
const FRONTEND_URL = 'http://localhost:5173';
const TEST_SESSION_ID = 'test-session-' + Date.now();

console.log('=== 前后端集成测试脚本 ===');
console.log('后端地址:', BACKEND_URL);
console.log('前端地址:', FRONTEND_URL);
console.log('测试会话ID:', TEST_SESSION_ID);
console.log('');

let testResults = {
  backendConnected: false,
  apiWorking: false,
  socketConnected: false,
  pointsGenerated: false,
  errors: []
};

// 测试后端连接
async function testBackendConnection() {
  try {
    console.log('1. 测试后端连接...');
    const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
    console.log('✅ 后端连接成功，状态:', response.status);
    testResults.backendConnected = true;
  } catch (error) {
    console.log('❌ 后端连接失败:', error.message);
    testResults.errors.push(`后端连接: ${error.message}`);
  }
}

// 测试API端点
async function testAPIEndpoints() {
  try {
    console.log('\n2. 测试API端点...');
    
    // 测试生成测试点API
    const testData = {
      requirement: '用户登录功能测试',
      sessionId: TEST_SESSION_ID,
      system: '用户系统',
      module: '登录模块',
      scenario: '登录功能'
    };
    
    console.log('调用生成测试点API...');
    const response = await axios.post(`${BACKEND_URL}/api/test/generate-points`, testData, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ API响应:', {
      status: response.status,
      data: response.data
    });
    
    testResults.apiWorking = true;
    return response.data?.data?.taskId;
    
  } catch (error) {
    console.log('❌ API测试失败:', error.message);
    if (error.response) {
      console.log('响应状态:', error.response.status);
      console.log('响应数据:', error.response.data);
    }
    testResults.errors.push(`API测试: ${error.message}`);
    return null;
  }
}

// 测试Socket连接
async function testSocketConnection() {
  return new Promise((resolve) => {
    console.log('\n3. 测试Socket连接...');
    
    // 使用原生WebSocket测试
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://localhost:9000/socket.io/?EIO=4&transport=websocket');
    
    ws.on('open', () => {
      console.log('✅ WebSocket连接成功');
      testResults.socketConnected = true;
      ws.close();
      resolve(true);
    });
    
    ws.on('error', (error) => {
      console.log('❌ WebSocket连接失败:', error.message);
      testResults.errors.push(`Socket连接: ${error.message}`);
      resolve(false);
    });
    
    ws.on('close', () => {
      console.log('WebSocket连接关闭');
    });
    
    setTimeout(() => {
      ws.close();
      resolve(false);
    }, 5000);
  });
}

// 检查后端日志
async function checkBackendLogs() {
  console.log('\n4. 检查后端服务状态...');
  
  try {
    // 检查后端端口是否监听
    const { exec } = require('child_node');
    
    return new Promise((resolve) => {
      exec('netstat -ano | findstr :9000', (error, stdout) => {
        if (stdout) {
          console.log('✅ 端口9000正在监听');
          console.log('监听信息:', stdout.trim());
        } else {
          console.log('❌ 端口9000未监听');
        }
        resolve();
      });
    });
  } catch (error) {
    console.log('无法检查端口状态:', error.message);
  }
}

// 显示测试结果和建议
function showTestResults() {
  console.log('\n=== 测试结果 ===');
  console.log('后端连接:', testResults.backendConnected ? '✅ 正常' : '❌ 失败');
  console.log('API功能:', testResults.apiWorking ? '✅ 正常' : '❌ 失败');
  console.log('Socket连接:', testResults.socketConnected ? '✅ 正常' : '❌ 失败');
  
  if (testResults.errors.length > 0) {
    console.log('\n错误汇总:');
    testResults.errors.forEach(error => console.log('  -', error));
  }
  
  console.log('\n=== 问题诊断 ===');
  
  if (!testResults.backendConnected) {
    console.log('🔍 主要问题：后端服务未启动');
    console.log('  建议:');
    console.log('  1. 检查后端服务是否运行');
    console.log('  2. 检查端口9000是否被占用');
    console.log('  3. 查看后端日志获取错误信息');
    console.log('  4. 确认后端依赖是否正确安装');
  } else if (!testResults.apiWorking) {
    console.log('🔍 主要问题：API功能异常');
    console.log('  建议:');
    console.log('  1. 检查后端路由配置');
    console.log('  2. 查看后端API日志');
    console.log('  3. 确认数据库连接正常');
    console.log('  4. 检查API请求格式');
  } else if (!testResults.socketConnected) {
    console.log('🔍 主要问题：Socket连接失败');
    console.log('  建议:');
    console.log('  1. 检查Socket.IO配置');
    console.log('  2. 确认端口9000支持WebSocket');
    console.log('  3. 检查防火墙设置');
    console.log('  4. 验证Socket.IO版本兼容性');
  } else {
    console.log('✅ 基础连接测试通过');
    console.log('  建议进行更详细的事件监听测试');
  }
  
  console.log('\n=== 下一步操作 ===');
  console.log('1. 根据诊断结果修复问题');
  console.log('2. 重启后端服务');
  console.log('3. 使用浏览器开发者工具检查前端日志');
  console.log('4. 确认前后端事件名称是否匹配');
}

// 主测试流程
async function runTest() {
  try {
    await testBackendConnection();
    await testAPIEndpoints();
    await testSocketConnection();
    await checkBackendLogs();
    showTestResults();
    
  } catch (error) {
    console.error('测试过程错误:', error);
    testResults.errors.push(`测试过程: ${error.message}`);
    showTestResults();
  }
}

// 启动测试
console.log('开始前后端集成测试...\n');
runTest();