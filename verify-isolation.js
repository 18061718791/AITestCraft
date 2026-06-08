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

    const token = loginRes.data.data.token;
    console.log('✓ 登录成功，获取到token\n');

    const headers = {
      'Authorization': `Bearer ${token}`
    };

    // 2. 验证用例列表 - 应该返回空或只显示当前用户的数据
    console.log('2. 测试用例列表数据隔离...');
    try {
      const testCaseRes = await axios.get(`${BASE_URL}/test-cases/by-hierarchy`, {
        headers,
        params: { page: 1, limit: 10 }
      });
      const testCases = testCaseRes.data.data?.testCases || [];
      console.log(`   用例数量: ${testCases.length}`);
      if (testCases.length === 0) {
        console.log('   ✓ 用例列表数据隔离生效（显示为空）\n');
      } else {
        console.log('   ✗ 用例列表数据隔离未生效（仍显示数据）\n');
      }
    } catch (e) {
      console.log(`   ✗ 调用失败: ${e.message}\n`);
    }

    // 3. 验证缺陷列表 - 应该返回空或只显示当前用户的数据
    console.log('3. 缺陷列表数据隔离...');
    try {
      const defectRes = await axios.get(`${BASE_URL}/defects/list`, {
        headers,
        params: { page: 1, pageSize: 10 }
      });
      const defects = defectRes.data.data?.list || [];
      console.log(`   缺陷数量: ${defects.length}`);
      if (defects.length === 0) {
        console.log('   ✓ 缺陷列表数据隔离生效（显示为空）\n');
      } else {
        console.log('   ✗ 缺陷列表数据隔离未生效（仍显示数据）\n');
      }
    } catch (e) {
      console.log(`   ✗ 调用失败: ${e.message}\n`);
    }

    // 4. 验证应用列表 - 应该返回空或只显示当前用户的数据
    console.log('4. 应用列表数据隔离...');
    try {
      const appRes = await axios.get(`${BASE_URL}/applications`, {
        headers,
        params: { page: 1, pageSize: 10 }
      });
      const apps = appRes.data.data?.list || [];
      console.log(`   应用数量: ${apps.length}`);
      if (apps.length === 0) {
        console.log('   ✓ 应用列表数据隔离生效（显示为空）\n');
      } else {
        console.log('   ✗ 应用列表数据隔离未生效（仍显示数据）\n');
      }
    } catch (e) {
      console.log(`   ✗ 调用失败: ${e.message}\n`);
    }

    // 5. 验证部署任务列表
    console.log('5. 部署任务列表数据隔离...');
    try {
      const deployRes = await axios.get(`${BASE_URL}/deployment-tasks`, {
        headers,
        params: { page: 1, pageSize: 10 }
      });
      const tasks = deployRes.data.data?.list || [];
      console.log(`   部署任务数量: ${tasks.length}`);
      if (tasks.length === 0) {
        console.log('   ✓ 部署任务列表数据隔离生效（显示为空）\n');
      } else {
        console.log('   ✗ 部署任务列表数据隔离未生效（仍显示数据）\n');
      }
    } catch (e) {
      console.log(`   ✗ 调用失败: ${e.message}\n`);
    }

    // 6. 验证我的待办
    console.log('6. 我的待办数据隔离...');
    try {
      const todoRes = await axios.get(`${BASE_URL}/defects/my-todo`, {
        headers,
        params: { page: 1, pageSize: 10 }
      });
      const todos = todoRes.data.data?.list || [];
      console.log(`   待办数量: ${todos.length}`);
      if (todos.length === 0) {
        console.log('   ✓ 我的待办数据隔离生效（显示为空）\n');
      } else {
        console.log('   ✗ 我的待办数据隔离未生效（仍显示数据）\n');
      }
    } catch (e) {
      console.log(`   ✗ 调用失败: ${e.message}\n`);
    }

    console.log('=== 验证完成 ===');

  } catch (error) {
    console.error('验证失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

login();
