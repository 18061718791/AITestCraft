const io = require('socket.io-client');

// 测试socket.io连接
const socket = io('ws://120.55.187.125:9000', {
  transports: ['websocket'],
  timeout: 5000
});

socket.on('connect', () => {
  console.log('✅ Socket.io连接成功！Socket ID:', socket.id);
  socket.disconnect();
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket.io连接错误:', error.message);
  console.error('错误详情:', error);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket.io连接断开:', reason);
});

// 设置超时
setTimeout(() => {
  if (!socket.connected) {
    console.log('⏰ 连接超时');
    socket.disconnect();
  }
}, 10000);