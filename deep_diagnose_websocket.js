const WebSocket = require('ws');

console.log('=== 深度WebSocket握手诊断 ===');

// 测试直接WebSocket连接（绕过Socket.IO）
console.log('\n1. 测试直接WebSocket连接:');

const wsUrl = 'ws://120.55.187.125:9000';
console.log('连接URL:', wsUrl);

try {
  const ws = new WebSocket(wsUrl, {
    headers: {
      'Origin': 'http://120.55.187.125:5175',
      'User-Agent': 'Node-WebSocket-Diagnostic/1.0'
    }
  });

  ws.on('open', () => {
    console.log('✅ 直接WebSocket连接成功');
    ws.close();
  });

  ws.on('error', (error) => {
    console.error('❌ 直接WebSocket连接错误:', error.message);
    console.error('错误详情:', error);
    
    // 测试Socket.IO特定的WebSocket路径
    testSocketIOWebSocket();
  });

  ws.on('close', (code, reason) => {
    console.log('连接关闭，代码:', code, '原因:', reason.toString());
  });

} catch (error) {
  console.error('创建WebSocket时异常:', error.message);
}

function testSocketIOWebSocket() {
  console.log('\n2. 测试Socket.IO WebSocket路径:');
  
  const socketIOWsUrl = 'ws://120.55.187.125:9000/socket.io/?EIO=4&transport=websocket';
  console.log('连接URL:', socketIOWsUrl);
  
  try {
    const ws = new WebSocket(socketIOWsUrl, {
      headers: {
        'Origin': 'http://120.55.187.125:5175',
        'User-Agent': 'Node-WebSocket-Diagnostic/1.0'
      }
    });

    ws.on('open', () => {
      console.log('✅ Socket.IO WebSocket连接成功');
      ws.close();
    });

    ws.on('error', (error) => {
      console.error('❌ Socket.IO WebSocket连接错误:', error.message);
      
      // 测试TCP连接
      testTCPConnection();
    });

    ws.on('close', (code, reason) => {
      console.log('Socket.IO连接关闭，代码:', code, '原因:', reason.toString());
    });

  } catch (error) {
    console.error('创建Socket.IO WebSocket时异常:', error.message);
  }
}

function testTCPConnection() {
  console.log('\n3. 测试原始TCP连接:');
  
  const net = require('net');
  
  const client = new net.Socket();
  
  client.connect(9000, '120.55.187.125', () => {
    console.log('✅ TCP连接成功');
    
    // 发送WebSocket握手请求
    const handshake = 'GET /socket.io/?EIO=4&transport=websocket HTTP/1.1\r\n' +
                     'Host: 120.55.187.125:9000\r\n' +
                     'Upgrade: websocket\r\n' +
                     'Connection: Upgrade\r\n' +
                     'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n' +
                     'Sec-WebSocket-Version: 13\r\n' +
                     'Origin: http://120.55.187.125:5175\r\n' +
                     '\r\n';
    
    client.write(handshake);
  });

  client.on('data', (data) => {
    console.log('收到服务器响应:', data.toString());
    client.destroy();
  });

  client.on('error', (error) => {
    console.error('❌ TCP连接错误:', error.message);
  });

  client.on('close', () => {
    console.log('TCP连接关闭');
  });

  // 设置超时
  setTimeout(() => {
    if (!client.destroyed) {
      console.log('TCP连接超时');
      client.destroy();
    }
  }, 5000);
}

// 测试HTTP连接以确保基础通信正常
console.log('\n4. 测试基础HTTP连接:');

const http = require('http');
const req = http.request({
  hostname: '120.55.187.125',
  port: 9000,
  path: '/',
  method: 'GET',
  headers: {
    'User-Agent': 'Node-HTTP-Diagnostic/1.0'
  }
}, (res) => {
  console.log(`HTTP状态码: ${res.statusCode}`);
  console.log('HTTP响应头:', res.headers);
});

req.on('error', (error) => {
  console.error('❌ HTTP连接错误:', error.message);
});

req.end();