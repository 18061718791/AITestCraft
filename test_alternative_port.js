const http = require('http');

console.log('=== 测试替代端口方案 ===');

// 测试其他常用WebSocket端口
const testPorts = [3000, 3001, 8080, 8081, 8000, 8001, 9001, 9002];

async function testPort(port) {
  return new Promise((resolve) => {
    console.log(`\n测试端口 ${port}:`);
    
    const req = http.request({
      hostname: '120.55.187.125',
      port: port,
      path: '/socket.io/?EIO=4&transport=polling',
      method: 'GET',
      timeout: 3000,
      headers: {
        'Origin': 'http://120.55.187.125:5175',
        'User-Agent': 'Port-Test/1.0'
      }
    }, (res) => {
      console.log(`✅ 端口 ${port} 可访问 - 状态码: ${res.statusCode}`);
      resolve(true);
    });

    req.on('error', (error) => {
      if (error.code === 'ECONNREFUSED') {
        console.log(`❌ 端口 ${port} 拒绝连接`);
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`⏰ 端口 ${port} 连接超时`);
      } else {
        console.log(`❌ 端口 ${port} 错误: ${error.code}`);
      }
      resolve(false);
    });

    req.on('timeout', () => {
      console.log(`⏰ 端口 ${port} 请求超时`);
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function runTests() {
  console.log('测试其他端口的可访问性...');
  
  for (const port of testPorts) {
    await testPort(port);
  }
  
  console.log('\n=== 测试完成 ===');
  console.log('如果其他端口可以访问但9000端口不行，说明是云服务商安全组限制了9000端口');
}

runTests();