const axios = require('axios');

const BASE_URL = 'http://localhost:9000/api';

async function verify() {
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
      console.log('✓ 登录成功\n');
    } catch (e) {
      console.log('✗ 登录失败:', e.response?.status, e.response?.data);
      return;
    }

    const token = loginRes.data.data?.accessToken;
    if (!token) {
      console.log('✗ 未获取到token');
      return;
    }

    const headers = { 'Authorization': `Bearer ${token}` };

    // 2. 测试用例列表
    console.log('2. 测试用例列表数据隔离...');
    try {
      const res = await axios.get(`${BASE_URL}/test-cases/by-hierarchy`, {
        headers,
        params: { page: 1, limit: 10 }
      });
      const testCases = res.data.data?.testCases || [];
      console.log(`   用例数量: ${testCases.length}`);
      if (testCases.length === 0) {
        console.log('   ✓ 数据隔离生效\n');
      } else {
        console.log('   ✗ 数据隔离未生效\n');
      }
    } catch (e) {
      console.log(`   ✗ 调用失败: ${e.response?.status} - ${e.response?.data?.message}\n`);
    }

    // 3. 缺陷列表 - 使用正确的API路径
    console.log('3. 缺陷列表数据隔离...');
    try {
      // 先检查可用的缺陷API
      const res = await axios.get(`${BASE_URL}/defects/list`, {
        headers,
        params: { page: 1, pageSize: 10 }
      });
      const defects = res.data.data?.list || [];
      console.log(`   缺陷数量: ${defects.length}`);
      if (defects.length === 0) {
        console.log('   ✓ 数据隔离生效\n');
      } else {
        console.log('   ✗ 数据隔离未生效\n');
      }
    } catch (e) {
      console.log(`   ✗ 调用失败: ${e.response?.status} - ${JSON.stringify(e.response?.data)}\n`);
    }

    // 4. 部署任务列表
    console.log('4. 部署任务列表数据隔离...');
    try {
      const res = await axios.get(`${BASE_URL}/deployment-tasks`, {
        headers,
        params: { page: 1, pageSize: 10 }
      });
      const tasks = res.data.data?.list || [];
      console.log(`   部署任务数量: ${tasks.length}`);
      if (tasks.length === 0) {
        console.log('   ✓ 数据隔离生效\n');
      } else {
        console.log('   ✗ 数据隔离未生效\n');
      }
    } catch (e) {
      console.log(`   ✗ 调用失败: ${e.response?.status} - ${e.response?.data?.message}\n`);
    }

    // 5. 我的待办
    console.log('5. 我的待办数据隔离...');
    try {
      const res = await axios.get(`${BASE_URL}/defects/my-todo`, {
        headers,
        params: { page: 1, pageSize: 10 }
      });
      const todos = res.data.data?.list || [];
      console.log(`   待办数量: ${todos.length}`);
      if (todos.length === 0) {
        console.log('   ✓ 数据隔离生效\n');
      } else {
        console.log('   ✗ 数据隔离未生效\n');
      }
    } catch (e) {
      console.log(`   ✗ 调用失败: ${e.response?.status} - ${e.response?.data?.message}\n`);
    }

    // 6. 应用配置列表 - 使用正确的API路径
    console.log('6. 应用配置列表数据隔离...');
    try {
      const res = await axios.get(`${BASE_URL}/app-configs`, {
        headers,
        params: { page: 1, pageSize: 10 }
      });
      console.log('   响应结构:', Object.keys(res.data));
      console.log('   data结构:', Object.keys(res.data.data || {}));
      const apps = res.data.data?.items || res.data.data?.list || res.data.data || [];
      const appCount = Array.isArray(apps) ? apps.length : 0;
      console.log(`   应用数量: ${appCount}`);
      if (appCount === 0) {
        console.log('   ✓ 数据隔离生效\n');
      } else {
        console.log('   ✗ 数据隔离未生效\n');
      }
    } catch (e) {
      console.log(`   ✗ 调用失败: ${e.response?.status} - ${JSON.stringify(e.response?.data)}\n`);
    }

    console.log('=== 验证完成 ===');

  } catch (error) {
    console.error('验证失败:', error.message);
  }
}

verify();
