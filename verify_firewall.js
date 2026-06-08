const http = require('http');

console.log('🔍 阿里云轻量服务器防火墙验证工具');
console.log('=' .repeat(50));

function testExternalAccess() {
  console.log('正在测试外部访问...');
  
  // 测试公网IP访问
  const options = {
    hostname: '120.55.187.125',
    port: 9000,
    path: '/socket.io/?EIO=4&transport=polling',
    method: 'GET',
    timeout: 5000
  };
  
  const req = http.request(options, (res) => {
    console.log(`✅ 公网访问成功！状态码: ${res.statusCode}`);
    console.log('说明防火墙规则已生效');
    
    res.on('data', (chunk) => {
      console.log('响应数据:', chunk.toString().substring(0, 100) + '...');
    });
    
    res.on('end', () => {
      console.log('\n🎉 防火墙配置验证完成！');
    });
  });
  
  req.on('error', (err) => {
    console.log(`❌ 公网访问失败: ${err.message}`);
    console.log('\n🔧 请检查:');
    console.log('1. 阿里云轻量服务器防火墙是否已添加9000端口规则');
    console.log('2. Windows防火墙是否允许9000端口');
    console.log('3. 服务器是否仍在运行');
  });
  
  req.on('timeout', () => {
    console.log('⚠️  连接超时，可能是防火墙阻止');
    req.destroy();
  });
  
  req.end();
}

// 检查Windows防火墙
function checkWindowsFirewall() {
  console.log('\n🔥 检查Windows防火墙...');
  
  const { exec } = require('child_process');
  
  exec('netsh advfirewall firewall show rule name=all | findstr 9000', (error, stdout, stderr) => {
    if (error) {
      console.log('无法检查Windows防火墙规则');
      return;
    }
    
    if (stdout.trim()) {
      console.log('发现Windows防火墙规则:');
      console.log(stdout);
    } else {
      console.log('未找到9000端口的Windows防火墙规则');
      console.log('如果需要，可以运行以下命令添加规则:');
      console.log('netsh advfirewall firewall add rule name="WebSocket 9000" dir=in action=allow protocol=TCP localport=9000');
    }
  });
}

// 运行测试
console.log('开始验证测试...\n');
testExternalAccess();
checkWindowsFirewall();