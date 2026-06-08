const axios = require('axios');

const BASE_URL = 'http://localhost:9000/api';

async function test() {
  try {
    // 登录
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'testuser',
      password: '111111'
    });
    const token = loginRes.data.data?.accessToken;
    const headers = { 'Authorization': `Bearer ${token}` };

    console.log('测试缺陷列表API...');

    // 测试不同的参数组合
    const testCases = [
      { params: { page: 1, pageSize: 10 }, desc: '基础参数' },
      { params: { page: 1, pageSize: 10, project_id: '2980' }, desc: '带项目ID' },
      { params: { page: 1, pageSize: 10, is_todo: 'true' }, desc: '我的待办' },
    ];

    for (const tc of testCases) {
      console.log(`\n测试: ${tc.desc}`);
      console.log(`参数: ${JSON.stringify(tc.params)}`);
      try {
        const res = await axios.get(`${BASE_URL}/defects`, {
          headers,
          params: tc.params
        });
        console.log(`结果: 成功，返回 ${res.data.data?.list?.length || 0} 条数据`);
      } catch (e) {
        console.log(`结果: 失败 - ${e.response?.status} - ${JSON.stringify(e.response?.data)}`);
      }
    }

  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

test();
