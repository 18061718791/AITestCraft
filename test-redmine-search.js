const axios = require('axios');

const BASE_URL = 'http://localhost:9000/api';

async function test() {
  try {
    console.log('=== 测试Redmine用户搜索 ===\n');

    // 1. 登录获取token
    console.log('1. 登录 testuser/111111...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'testuser',
      password: '111111'
    });
    const token = loginRes.data.data?.accessToken;
    console.log('✓ 登录成功\n');

    const headers = { 'Authorization': `Bearer ${token}` };

    // 2. 搜索Redmine用户
    console.log('2. 搜索Redmine用户（关键字：石）...');
    try {
      const searchRes = await axios.get(`${BASE_URL}/redmine-users/search`, {
        headers,
        params: { keyword: '石', limit: 20 }
      });
      console.log('✓ 搜索成功');
      console.log('响应:', JSON.stringify(searchRes.data, null, 2));
    } catch (e) {
      console.log('✗ 搜索失败');
      console.log('状态码:', e.response?.status);
      console.log('错误信息:', e.response?.data);
      console.log('详细错误:', e.message);
    }

  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

test();
