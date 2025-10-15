const io = require('socket.io-client');
const axios = require('axios');

// 测试配置
const BACKEND_URL = 'http://localhost:9000';
const TEST_SESSION_ID = 'test-session-' + Date.now();

console.log('=== 事件流测试脚本 ===');
console.log('后端地址:', BACKEND_URL);
console.log('测试会话ID:', TEST_SESSION_ID);
console.log('');

// 创建Socket连接
const socket = io(BACKEND_URL, {
  query: { sessionId: TEST_SESSION_ID },
  transports: ['websocket', 'polling'],
  timeout: 10000,
  reconnection: true,
  forceNew: true
});

let eventLog = [];
let taskId = null;

// 记录事件
function logEvent(eventName, data, direction = '收到') {
  const timestamp = new Date().toISOString();
  const log = {
    timestamp,
    event: eventName,
    direction,
    data: data ? JSON.stringify(data).substring(0, 200) : '无数据',
    dataSize: data ? JSON.stringify(data).length : 0
  };
  eventLog.push(log);
  console.log(`[${timestamp}] ${direction}事件: ${eventName}`, data ? JSON.stringify(data).substring(0, 100) + '...' : '');
}

// Socket事件监听
socket.on('connect', () => {
  logEvent('connect', { socketId: socket.id }, '发送');
});

socket.on('disconnect', (reason) => {
  logEvent('disconnect', { reason }, '收到');
});

socket.on('connect_error', (error) => {
  logEvent('connect_error', { message: error.message }, '收到');
});

socket.on('joined-session', (data) => {
  logEvent('joined-session', data, '收到');
});

socket.on('points-generated', (data) => {
  logEvent('points-generated', data, '收到');
  console.log('✅ 测试点事件详细数据:');
  console.log('  - Task ID:', data.taskId);
  console.log('  - 测试点数量:', data.points?.length || 0);
  console.log('  - 第一个测试点:', data.points?.[0]);
});

socket.on('error', (data) => {
  logEvent('error', data, '收到');
});

// 监听所有事件
socket.onAny((eventName, ...args) => {
  if (!['connect', 'disconnect', 'connect_error', 'joined-session', 'points-generated', 'error'].includes(eventName)) {
    logEvent(eventName, args[0], '收到');
  }
});

// 发送join-session事件
function joinSession() {
  console.log('\n📤 发送join-session事件...');
  socket.emit('join-session', { sessionId: TEST_SESSION_ID });
  logEvent('join-session', { sessionId: TEST_SESSION_ID }, '发送');
}

// 调用生成测试点API
async function generatePoints() {
  const testData = {
    requirement: '用户登录功能测试：验证用户名密码登录、验证码登录、密码找回功能',
    sessionId: TEST_SESSION_ID,
    system: '用户系统',
    module: '登录模块',
    scenario: '登录功能'
  };
  
  console.log('\n📤 调用生成测试点API...');
  logEvent('generate-points-request', testData, '发送');
  
  try {
    const response = await axios.post(`${BACKEND_URL}/api/test/generate-points`, testData, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    taskId = response.data?.data?.taskId;
    logEvent('generate-points-response', response.data, '收到');
    
    console.log('✅ API调用成功:');
    console.log('  - Task ID:', taskId);
    console.log('  - 状态:', response.data?.data?.status);
    console.log('  - 消息:', response.data?.data?.message);
    
    return taskId;
    
  } catch (error) {
    logEvent('generate-points-error', { message: error.message }, '收到');
    console.log('❌ API调用失败:', error.message);
    throw error;
  }
}

// 等待特定事件
function waitForEvent(eventName, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`等待事件超时: ${eventName}`));
    }, timeout);
    
    socket.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// 显示事件流分析
function analyzeEventFlow() {
  console.log('\n=== 事件流分析 ===');
  
  const connectEvents = eventLog.filter(log => log.event === 'connect');
  const joinEvents = eventLog.filter(log => log.event === 'joined-session');
  const pointsEvents = eventLog.filter(log => log.event === 'points-generated');
  
  console.log('事件统计:');
  console.log('  - 连接事件:', connectEvents.length);
  console.log('  - 加入会话事件:', joinEvents.length);
  console.log('  - 测试点生成事件:', pointsEvents.length);
  console.log('  - 总事件数:', eventLog.length);
  
  if (connectEvents.length === 0) {
    console.log('❌ 问题：未检测到Socket连接');
  }
  
  if (joinEvents.length === 0) {
    console.log('⚠️  警告：未收到joined-session事件');
    console.log('  可能原因：');
    console.log('  1. 后端未正确处理join-session事件');
    console.log('  2. 事件发送时机问题');
    console.log('  3. 房间机制配置问题');
  }
  
  if (pointsEvents.length === 0) {
    console.log('❌ 问题：未收到points-generated事件');
    console.log('  可能原因：');
    console.log('  1. 后端未正确发送事件');
    console.log('  2. Session ID不匹配');
    console.log('  3. 事件名称不匹配');
    console.log('  4. 房间机制问题');
    console.log('  5. 事件监听时机问题');
  } else {
    console.log('✅ 成功收到测试点事件');
    const event = pointsEvents[0];
    console.log('  - 数据大小:', event.dataSize, '字节');
    console.log('  - 时间戳:', event.timestamp);
  }
  
  // 显示时间线
  console.log('\n事件时间线:');
  eventLog.forEach((log, index) => {
    console.log(`${index + 1}. [${log.timestamp}] ${log.direction} ${log.event}`);
  });
}

// 主测试流程
async function runTest() {
  try {
    console.log('等待Socket连接...');
    await waitForEvent('connect', 10000);
    
    console.log('\n加入会话...');
    joinSession();
    
    // 等待joined-session事件或超时
    try {
      await waitForEvent('joined-session', 5000);
    } catch (error) {
      console.log('⚠️  未收到joined-session事件，继续测试...');
    }
    
    console.log('\n调用生成测试点API...');
    await generatePoints();
    
    console.log('\n等待测试点事件...');
    try {
      await waitForEvent('points-generated', 20000);
    } catch (error) {
      console.log('⚠️  未收到测试点事件');
    }
    
    // 等待额外的事件
    console.log('\n等待额外5秒观察更多事件...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    analyzeEventFlow();
    
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    socket.disconnect();
    console.log('\n测试完成，Socket连接已关闭');
  }
}

// 启动测试
console.log('开始事件流测试...');
runTest();