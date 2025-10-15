// 测试前端实际使用的WebSocket URL
const getSocketUrl = () => {
  // 模拟前端的环境变量检测逻辑
  const isDev = false; // 模拟生产环境
  
  if (isDev) {
    return 'ws://localhost:9000';
  }
  // 生产环境使用配置的URL
  return process.env.VITE_WEBSOCKET_URL || 'ws://120.55.187.125:9000';
};

console.log('模拟前端WebSocket URL检测:');
console.log('环境变量 VITE_WEBSOCKET_URL:', process.env.VITE_WEBSOCKET_URL || '未设置');
console.log('最终使用的WebSocket URL:', getSocketUrl());
console.log('');

// 测试实际连接
const { io } = require('socket.io-client');

const testUrl = getSocketUrl();
console.log('正在测试连接:', testUrl);

const socket = io(testUrl, {
  transports: ['websocket'],
  timeout: 10000,
  forceNew: true
});

socket.on('connect', () => {
  console.log('✅ 连接成功! Socket ID:', socket.id);
  setTimeout(() => {
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on('connect_error', (error) => {
  console.error('❌ 连接失败:', error.message);
  console.error('错误详情:', error);
  process.exit(1);
});

setTimeout(() => {
  console.log('⏰ 连接超时');
  socket.disconnect();
  process.exit(1);
}, 15000);