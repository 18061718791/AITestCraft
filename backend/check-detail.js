const axios = require('axios');

const BASE_URL = 'http://localhost:9000/api';

async function check() {
  try {
    // 登录
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'testuser',
      password: '111111'
    });
    const token = loginRes.data.data?.accessToken;
    const user = loginRes.data.data?.user;

    console.log('当前用户:', user?.username);
    console.log('用户ID:', user?.id);
    console.log('角色:', user?.roles?.map(r => r.code).join(', '));
    console.log('isAdmin:', user?.roles?.some(r => r.code === 'admin'));

    const headers = { 'Authorization': `Bearer ${token}` };

    // 获取应用配置
    const res = await axios.get(`${BASE_URL}/app-configs`, {
      headers,
      params: { page: 1, pageSize: 10 }
    });

    console.log('\n应用配置列表:');
    const items = res.data.data?.items || [];
    items.forEach((app, idx) => {
      console.log(`  ${idx + 1}. ${app.appName} (ID: ${app.id})`);
    });

    console.log('\n说明: 如果显示1条应用，说明该应用是由testuser(ID=3)创建的，数据隔离正常');
    console.log('      如果显示多条应用，说明数据隔离有问题');

  } catch (error) {
    console.error('检查失败:', error.message);
  }
}

check();
