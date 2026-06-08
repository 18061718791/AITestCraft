// 生产环境WebSocket连接修复测试
const io = require('socket.io-client');

async function testWebSocketConnection() {
  console.log('🚀 开始测试生产环境WebSocket连接修复效果...\n');
  
  const sessionId = 'test-session-' + Date.now();
  const serverUrl = 'http://120.55.187.125:9000';
  
  console.log('📡 测试配置:');
  console.log('  服务器URL:', serverUrl);
  console.log('  Session ID:', sessionId);
  console.log('  超时时间: 10秒');
  console.log('  传输方式: websocket\n');
  
  try {
    console.log('🔗 尝试WebSocket连接...');
    
    const socket = io(serverUrl, {
      query: { sessionId },
      transports: ['websocket'],
      timeout: 10000, // 10秒超时
      reconnection: false,
      forceNew: true,
      upgrade: true,
      rememberUpgrade: true
    });
    
    // 连接成功处理
    socket.on('connect', () => {
      console.log('✅ WebSocket连接成功!');
      console.log('   Socket ID:', socket.id);
      console.log('   连接状态: connected');
      
      // 测试事件发送
      socket.emit('test-event', { message: '测试消息' });
      console.log('📤 发送测试事件: test-event');
      
      // 断开连接
      setTimeout(() => {
        socket.disconnect();
        console.log('🔌 断开连接');
        process.exit(0);
      }, 2000);
    });
    
    // 连接错误处理
    socket.on('connect_error', (error) => {
      console.log('❌ WebSocket连接失败:');
      console.log('   错误类型:', error.type);
      console.log('   错误信息:', error.message);
      console.log('   详细错误:', error);
      process.exit(1);
    });
    
    // 超时处理
    setTimeout(() => {
      if (!socket.connected) {
        console.log('⏰ WebSocket连接超时 (10秒)');
        socket.disconnect();
        process.exit(1);
      }
    }, 11000);
    
  } catch (error) {
    console.log('💥 连接过程中发生异常:');
    console.log('   错误信息:', error.message);
    console.log('   堆栈信息:', error.stack);
    process.exit(1);
  }
}

// 运行测试
testWebSocketConnection();