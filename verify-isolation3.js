const axios = require('axios');

const BASE_URL = 'http://localhost:9000/api';

async function login() {
  try {
    console.log('=== 开始验证数据隔离 ===\n');

    // 1. 登录获取token
    console.log('1. 登录 testuser/111111...');
    let loginRes;
    try {
      loginRes = await axios.post(`${BASE_URL}/auth/login`, {
        username: 'testuser',
        password: '111111'
      });
      console.log('登录成功');
    } catch (e) {
      console.log('登录失败:', e.response?.status, e.response?.data);
      return;
    }

    console.log('响应结构:', Object.keys(loginRes.data));
    console.log('data字段:', Object.keys(loginRes.data.data || {}));

    const token = loginRes.data.data?.token;
    if (!token) {
      console.log('未获取到token');
      return;
    }
    console.log('Token前50字符:', token.substring(0, 50));

    // 2. 测试用例列表 - 带认证
    console.log('\n2. 测试用例列表 - 带认证...');
    try {
      const res = await axios.get(`${BASE_URL}/test-cases/by-hierarchy`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { page: 1, limit: 10 }
      });
      console.log('响应状态:', res.status);
      console.log('响应数据结构:', Object.keys(res.data));
      const testCases = res.data.data?.testCases || [];
      console.log(`用例数量: ${testCases.length}`);
      if (testCases.length === 0) {
        console.log('✓ 数据隔离生效（显示为空）');
      } else {
        console.log('✗ 数据隔离未生效（仍显示数据）');
        console.log('第一条用例ID:', testCases[0]?.id);
      }
    } catch (e) {
      console.log(`调用失败: ${e.response?.status} - ${JSON.stringify(e.response?.data)}`);
    }

    console.log('\n=== 验证完成 ===');

  } catch (error) {
    console.error('验证失败:', error.message);
    console.error(error.stack);
  }
}

login();
