const http = require('http');

// 诊断WebSocket握手问题
console.log('=== WebSocket握手诊断 ===');

// 测试1: 直接HTTP请求到Socket.IO路径
console.log('\n1. 测试HTTP请求到Socket.IO路径:');
const req = http.request({
  hostname: '120.55.187.125',
  port: 9000,
  path: '/socket.io/?EIO=4&transport=polling',
  method: 'GET',
  headers: {
    'Origin': 'http://120.55.187.125:5175',
    'User-Agent': 'Diagnostic-Tool/1.0'
  }
}, (res) => {
  console.log(`HTTP状态码: ${res.statusCode}`);
  console.log('响应头:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('响应体:', data);
    
    // 提取sid用于WebSocket升级
    try {
      const response = JSON.parse(data.substring(data.indexOf('{')));
      if (response.sid) {
        console.log(`获取到Session ID: ${response.sid}`);
        testWebSocketUpgrade(response.sid);
      }
    } catch (e) {
      console.log('无法解析响应JSON');
    }
  });
});

req.on('error', (err) => {
  console.error('HTTP请求错误:', err.message);
});

req.end();

// 测试2: WebSocket升级请求
function testWebSocketUpgrade(sid) {
  console.log('\n2. 测试WebSocket升级请求:');
  
  const upgradeReq = http.request({
    hostname: '120.55.187.125',
    port: 9000,
    path: `/socket.io/?EIO=4&transport=websocket&sid=${sid}`,
    method: 'GET',
    headers: {
      'Connection': 'Upgrade',
      'Upgrade': 'websocket',
      'Sec-WebSocket-Version': '13',
      'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
      'Origin': 'http://120.55.187.125:5175',
      'User-Agent': 'Diagnostic-Tool/1.0'
    }
  }, (res) => {
    console.log(`升级响应状态码: ${res.statusCode}`);
    console.log('升级响应头:', res.headers);
    
    if (res.statusCode === 101) {
      console.log('✅ WebSocket升级成功');
    } else {
      console.log('❌ WebSocket升级失败');
    }
  });
  
  upgradeReq.on('error', (err) => {
    console.error('升级请求错误:', err.message);
  });
  
  upgradeReq.end();
}

// 测试3: 检查CORS预检请求
console.log('\n3. 测试CORS预检请求(OPTIONS):');
const optionsReq = http.request({
  hostname: '120.55.187.125',
  port: 9000,
  path: '/socket.io/',
  method: 'OPTIONS',
  headers: {
    'Origin': 'http://120.55.187.125:5175',
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'Content-Type',
    'User-Agent': 'Diagnostic-Tool/1.0'
  }
}, (res) => {
  console.log(`OPTIONS状态码: ${res.statusCode}`);
  console.log('OPTIONS响应头:', res.headers);
});

optionsReq.on('error', (err) => {
  console.error('OPTIONS请求错误:', err.message);
});

optionsReq.end();