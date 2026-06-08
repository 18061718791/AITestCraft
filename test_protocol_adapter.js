// 测试协议适配逻辑
const testProtocolAdapter = () => {
  console.log('=== 测试协议适配逻辑 ===');
  
  // 模拟不同的页面协议场景
  const testScenarios = [
    { protocol: 'http:', expected: 'ws://' },
    { protocol: 'https:', expected: 'wss://' },
    { protocol: 'ftp:', expected: 'ws://' } // 默认回退到ws
  ];
  
  testScenarios.forEach((scenario, index) => {
    // 模拟window.location.protocol
    global.window = { location: { protocol: scenario.protocol } };
    
    // 模拟import.meta.env
    const mockEnv = {
      DEV: false,
      VITE_WEBSOCKET_URL: '120.55.187.125:9000'
    };
    
    // 模拟getSocketUrl函数逻辑
    const pageProtocol = global.window.location.protocol;
    const configuredUrl = mockEnv.VITE_WEBSOCKET_URL || 'ws://120.55.187.125:9000';
    
    let resultUrl;
    if (configuredUrl.startsWith('ws://') || configuredUrl.startsWith('wss://')) {
      resultUrl = configuredUrl;
    } else {
      const wsProtocol = pageProtocol === 'https:' ? 'wss://' : 'ws://';
      
      let hostname = configuredUrl;
      if (hostname.startsWith('ws://')) hostname = hostname.substring(5);
      else if (hostname.startsWith('wss://')) hostname = hostname.substring(6);
      else if (hostname.startsWith('http://')) hostname = hostname.substring(7);
      else if (hostname.startsWith('https://')) hostname = hostname.substring(8);
      
      if (hostname.endsWith('/')) hostname = hostname.slice(0, -1);
      
      resultUrl = `${wsProtocol}${hostname}`;
    }
    
    console.log(`场景 ${index + 1}:`);
    console.log(`  页面协议: ${scenario.protocol}`);
    console.log(`  配置URL: ${mockEnv.VITE_WEBSOCKET_URL}`);
    console.log(`  生成URL: ${resultUrl}`);
    console.log(`  预期协议: ${scenario.expected}`);
    console.log(`  测试结果: ${resultUrl.startsWith(scenario.expected) ? '✅ 通过' : '❌ 失败'}`);
    console.log('---');
  });
};

testProtocolAdapter();