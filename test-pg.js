const { query } = require('./backend/src/utils/database');

async function test() {
  try {
    console.log('测试PostgreSQL连接...');
    const result = await query('SELECT COUNT(*) as count FROM users');
    console.log('连接成功，用户数:', result.rows[0].count);
  } catch (error) {
    console.error('连接失败:', error.message);
  }
}

test();
