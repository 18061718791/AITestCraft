// 测试API连接
import axios from 'axios';

const API_URL = 'http://localhost:9000';

async function testApiConnection() {
  console.log('测试API连接...');
  
  try {
    // 测试系统API
    console.log('1. 测试系统API...');
    const systemsResponse = await axios.get(`${API_URL}/api/system/systems`);
    console.log('✅ 系统API连接成功');
    console.log('系统数量:', systemsResponse.data.data?.length || 0);
    
    // 测试树形API
    console.log('2. 测试树形API...');
    const treeResponse = await axios.get(`${API_URL}/api/system/systems/tree`);
    console.log('✅ 树形API连接成功');
    console.log('树形数据节点数:', treeResponse.data.data?.length || 0);
    
    // 测试健康检查
    console.log('3. 测试健康检查...');
    const healthResponse = await axios.get(`${API_URL}/health`);
    console.log('✅ 健康检查成功:', healthResponse.data.status);
    
  } catch (error) {
    console.error('❌ API连接失败:', error.message);
    if (error.response) {
      console.error('HTTP状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testApiConnection();