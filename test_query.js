const axios = require('axios');

async function testQuery() {
  try {
    console.log('Testing query with Chinese input...');
    
    const response = await axios.post('http://localhost:9000/api/intelligent-qa/query', {
      query: '查看低代码本周创建的问题',
      choice: 'week'
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testQuery();
