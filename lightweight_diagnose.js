const http = require('http');
const net = require('net');
const { exec } = require('child_process');

console.log('🚀 阿里云轻量服务器WebSocket诊断工具');
console.log('=' .repeat(50));

// 检查服务器监听状态
function checkServerStatus() {
  return new Promise((resolve) => {
    const client = net.createConnection(9000, '120.55.187.125');
    
    client.on('connect', () => {
      console.log('✅ 服务器9000端口监听正常');
      client.end();
      resolve(true);
    });
    
    client.on('error', (err) => {
      console.log('❌ 服务器9000端口连接失败:', err.message);
      resolve(false);
    });
  });
}

// 检查服务器绑定地址
function checkServerBinding() {
  return new Promise((resolve) => {
    exec('netstat -an | findstr :9000', (error, stdout, stderr) => {
      if (error) {
        console.log('❌ 无法检查服务器绑定:', error.message);
        resolve(false);
        return;
      }
      
      console.log('🔗 服务器绑定检查:');
      console.log(stdout || '未找到9000端口监听');
      
      // 分析绑定地址
      const lines = stdout.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        if (line.includes('0.0.0.0:9000')) {
          console.log('✅ 服务器绑定到所有网络接口 (0.0.0.0:9000)');
        } else if (line.includes('127.0.0.1:9000')) {
          console.log('⚠️  警告：服务器仅绑定到本地回环 (127.0.0.1:9000)');
          console.log('   这将导致外部无法访问！');
        } else if (line.includes('9000')) {
          console.log(`ℹ️  发现绑定: ${line.trim()}`);
        }
      });
      
      resolve(true);
    });
  });
}

// 测试不同协议的连接
async function testProtocols() {
  console.log('\n🌐 协议测试:');
  
  // HTTP测试
  await new Promise(resolve => {
    http.get('http://120.55.187.125:9000/socket.io/?EIO=4&transport=polling', (res) => {
      console.log(`✅ HTTP轮询测试: ${res.statusCode}`);
      res.on('data', () => {});
      res.on('end', resolve);
    }).on('error', (err) => {
      console.log(`❌ HTTP轮询测试失败: ${err.message}`);
      resolve();
    });
  });
  
  // WebSocket握手测试
  await new Promise(resolve => {
    const options = {
      hostname: '120.55.187.125',
      port: 9000,
      path: '/socket.io/?EIO=4&transport=websocket',
      method: 'GET',
      headers: {
        'Connection': 'Upgrade',
        'Upgrade': 'websocket',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
        'Sec-WebSocket-Version': '13'
      }
    };
    
    const req = http.request(options, (res) => {
      console.log(`🔌 WebSocket握手测试: ${res.statusCode}`);
      if (res.statusCode === 426) {
        console.log('⚠️  需要协议升级');
      }
      res.on('data', () => {});
      res.on('end', resolve);
    });
    
    req.on('error', (err) => {
      console.log(`❌ WebSocket握手测试失败: ${err.message}`);
      resolve();
    });
    
    req.end();
  });
}

// 检查轻量服务器防火墙
function checkLightweightFirewall() {
  console.log('\n🔍 阿里云轻量服务器防火墙检查:');
  console.log('轻量服务器防火墙需要在控制台配置');
  console.log('控制台路径：轻量服务器 -> 网络 -> 防火墙');
  console.log('请确保9000端口已添加到防火墙规则中');
  return Promise.resolve(true);
}

// 主诊断流程
async function runDiagnosis() {
  console.log('开始阿里云轻量服务器WebSocket诊断...\n');
  
  await checkServerStatus();
  await checkServerBinding();
  await checkLightweightFirewall();
  await testProtocols();
  
  console.log('\n' + '='.repeat(50));
  console.log('💡 轻量服务器解决建议:');
  console.log('1. 登录阿里云轻量服务器控制台');
  console.log('2. 进入 网络 -> 防火墙 设置');
  console.log('3. 添加规则：TCP 9000端口');
  console.log('4. 确认服务器绑定地址为0.0.0.0:9000');
  console.log('5. 检查Windows防火墙是否允许9000端口');
}

runDiagnosis().catch(console.error);