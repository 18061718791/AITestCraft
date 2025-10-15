const http = require('http');
const https = require('https');

console.log('=== 阿里云安全组诊断 ===');

// 测试多个端口，包括常见的WebSocket端口
const testPorts = [9000, 80, 443, 8080, 3000];

async function testPortConnectivity(port, protocol = 'http') {
  return new Promise((resolve) => {
    const options = {
      hostname: '120.55.187.125',
      port: port,
      path: '/socket.io/?EIO=4&transport=polling',
      method: 'GET',
      timeout: 3000,
      headers: {
        'Origin': 'http://120.55.187.125:5175',
        'User-Agent': 'Aliyun-Diagnostic/1.0'
      }
    };

    const req = (protocol === 'https' ? https : http).request(options, (res) => {
      console.log(`✅ 端口 ${port} (${protocol}) 可访问 - 状态码: ${res.statusCode}`);
      resolve(true);
    });

    req.on('error', (error) => {
      console.log(`❌ 端口 ${port} (${protocol}) 错误: ${error.code} - ${error.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log(`⏰ 端口 ${port} (${protocol}) 请求超时`);
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// 测试WebSocket握手过程
async function testWebSocketHandshake() {
  console.log('\n=== WebSocket握手过程测试 ===');
  
  // 第一步：HTTP轮询获取session ID
  console.log('\n1. 测试HTTP轮询获取session ID:');
  
  const options = {
    hostname: '120.55.187.125',
    port: 9000,
    path: '/socket.io/?EIO=4&transport=polling',
    method: 'GET',
    headers: {
      'Origin': 'http://120.55.187.125:5175',
      'User-Agent': 'Aliyun-Diagnostic/1.0'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`HTTP轮询响应: ${data}`);
      
      // 提取session ID
      try {
        const response = JSON.parse(data.substring(data.indexOf('{')));
        if (response.sid) {
          console.log(`获取到Session ID: ${response.sid}`);
          testWebSocketUpgrade(response.sid);
        }
      } catch (e) {
        console.log('无法解析响应，可能是安全组阻止了连接');
      }
    });
  });

  req.on('error', (error) => {
    console.log(`HTTP轮询失败: ${error.code} - ${error.message}`);
  });

  req.end();
}

function testWebSocketUpgrade(sid) {
  console.log('\n2. 测试WebSocket升级:');
  
  const WebSocket = require('ws');
  const wsUrl = `ws://120.55.187.125:9000/socket.io/?EIO=4&transport=websocket&sid=${sid}`;
  
  console.log(`尝试连接: ${wsUrl}`);
  
  try {
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Origin': 'http://120.55.187.125:5175',
        'User-Agent': 'Aliyun-Diagnostic/1.0'
      }
    });

    ws.on('open', () => {
      console.log('✅ WebSocket连接成功');
      ws.close();
    });

    ws.on('error', (error) => {
      console.log(`❌ WebSocket连接错误: ${error.message}`);
      
      // 检查是否是阿里云安全组问题
      if (error.message.includes('ECONNRESET')) {
        console.log('\n🚨 检测到阿里云安全组问题！');
        console.log('请检查阿里云安全组配置：');
        console.log('1. 登录阿里云控制台');
        console.log('2. 进入ECS实例详情页');
        console.log('3. 点击"安全组"选项卡');
        console.log('4. 编辑安全组规则');
        console.log('5. 添加TCP 9000端口入站规则');
        console.log('6. 授权对象设置为0.0.0.0/0');
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`WebSocket连接关闭，代码: ${code}, 原因: ${reason}`);
    });

  } catch (error) {
    console.log(`创建WebSocket时异常: ${error.message}`);
  }
}

async function runDiagnostics() {
  console.log('开始阿里云安全组诊断...\n');
  
  // 测试多个端口
  for (const port of testPorts) {
    await testPortConnectivity(port);
  }
  
  // 测试WebSocket握手过程
  await testWebSocketHandshake();
  
  console.log('\n=== 诊断完成 ===');
  console.log('如果所有端口都连接失败，请检查阿里云安全组配置');
}

runDiagnostics();