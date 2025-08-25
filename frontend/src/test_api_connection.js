// 测试API连接
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

const testConnection = async () => {
  try {
    console.log('测试系统API连接...');
    const response = await axios.get(`${API_BASE_URL}/api/system/systems`);
    console.log('API响应:', response.data);
    
    if (response.data.success) {
      console.log('✅ 系统API连接成功');
      console.log('系统数量:', response.data.data?.length || 0);
      console.log('系统列表:', response.data.data?.map(s => s.name) || []);
    } else {
      console.error('❌ API返回错误:', response.data.error);
    }
  } catch (error) {
    console.error('❌ API连接失败:', error.message);
    console.error('请确保后端服务已启动: npm run dev (在backend目录)');
  }
};

testConnection();