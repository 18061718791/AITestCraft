const axios = require('axios');

const BASE_URL = 'http://localhost:9000/api';

async function login() {
  try {
    console.log('=== 开始验证数据隔离 ===\n');

    // 1. 登录获取token
    console.log('1. 登录 testuser/111111...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'testuser',
      password: '111111'
    });

    console.log('登录响应:', JSON.stringify(loginRes.data, null, 2));

    const token = loginRes.data.data.token;
    console.log('\n✓ 登录成功');
    console.log('Token:', token.substring(0, 50) + '...\n');

    // 2. 测试用例列表 - 不带认证（应该401）
    console.log('2. 测试用例列表 - 不带认证...');
    try {
      const res = await axios.get(`${BASE_URL}/test-cases/by-hierarchy`, {
        params: { page: 1, limit: 10 }
      });
      console.log('   意外成功:', res.data);
    } catch (e) {
      console.log('   预期结果: 401未认证');
    }

    // 3. 测试用例列表 - 带认证
    console.log('\n3. 测试用例列表 - 带认证...');
    try {
      const res = await axios.get(`${BASE_URL}/test-cases/by-hierarchy`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { page: 1, limit: 10 }
      });
      const testCases = res.data.data?.testCases || [];
      console.log(`   用例数量: ${testCases.length}`);
      if (testCases.length === 0) {
        console.log('   ✓ 数据隔离生效（显示为空）');
      } else {
        console.log('   ✗ 数据隔离未生效（仍显示数据）');
        console.log('   第一条用例:', JSON.stringify(testCases[0], null, 2).substring(0, 200));
      }
    } catch (e) {
      console.log(`   ✗ 调用失败: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
    }

    // 4. 缺陷列表 - 带认证
    console.log('\n4. 缺陷列表 - 带认证...');
    try {
      const res = await axios.get(`${BASE_URL}/defects/list`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { page: 1, pageSize: 10 }
      });
      const defects = res.data.data?.list || [];
      console.log(`   缺陷数量: ${defects.length}`);
      if (defects.length === 0) {
        console.log('   ✓ 数据隔离生效（显示为空）');
      } else {
        console.log('   ✗ 数据隔离未生效（仍显示数据）');
      }
    } catch (e) {
      console.log(`   ✗ 调用失败: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
    }

    console.log('\n=== 验证完成 ===');

  } catch (error) {
    console.error('验证失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

login();
