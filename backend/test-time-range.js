// 测试时间范围计算逻辑

function calculateTimeRange(timeRange) {
  const now = new Date();
  let start = new Date();
  let endDate = now.toISOString();
  let startDate;
  
  switch (timeRange) {
    case 'week':
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'quarter':
      start.setMonth(now.getMonth() - 3);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'day':
    case '今天':
      start.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
    case '昨天':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(0, 0, 0, 0);
      break;
    case 'current_week':
    case '本周':
      const dayOfWeek = now.getDay() || 7; // 将周日从0改为7
      start.setDate(now.getDate() - dayOfWeek + 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'current_month':
    case '本月':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case '本季度':
      start.setMonth(now.getMonth() - 3);
      start.setHours(0, 0, 0, 0);
      break;
    case '本年':
      start.setFullYear(now.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      break;
  }
  
  startDate = start.toISOString();
  
  return { timeRange, startDate, endDate };
}

// 测试各种时间范围
const testCases = ['week', 'month', 'quarter', 'year', 'day', 'yesterday', 'current_week', 'current_month', '本周', '本月', '本季度', '本年', '今天', '昨天'];

console.log('=== 测试时间范围计算逻辑 ===');
console.log('当前日期:', new Date().toISOString());
console.log('');

testCases.forEach(testCase => {
  const result = calculateTimeRange(testCase);
  console.log(`时间范围: ${testCase}`);
  console.log(`开始日期: ${result.startDate}`);
  console.log(`结束日期: ${result.endDate}`);
  console.log('');
});

console.log('=== 测试完成 ===');
