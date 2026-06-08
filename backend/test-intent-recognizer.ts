import intentRecognizer from './src/services/intelligentQa/IntentRecognizer';

// 测试用例
const testCases = [
  // 基本查询测试
  '获取物联平台系统下状态为已解决的问题列表',
  '物联应用系统过去一个月的缺陷分析',
  '我想获取我的待办任务列表',
  '生成物联平台系统过去一个月的缺陷分析报告，格式为PPT',
  '导出大数据平台的问题列表为Excel',
  
  // 变体测试 - 同义词
  '查询物联平台系统下状态为解决的问题清单',
  '物联应用系统最近一个月的缺陷统计',
  '我想查看我的待处理任务',
  '创建物联平台系统过去一个月的缺陷分析报告，格式为幻灯片',
  '下载大数据平台的问题清单为表格',
  
  // 变体测试 - 不同表达方式
  '物联平台的已解决问题有哪些',
  '过去一个月物联应用系统的缺陷情况',
  '我的待办事项',
  '我需要一个物联平台系统过去一个月的缺陷分析报告，要PPT格式',
  '把大数据平台的问题列表导出来，用Excel格式',
  
  // 复杂查询测试
  '物联平台系统过去一个月的缺陷趋势分析',
  '物联应用系统按系统分布的缺陷饼图',
  '项目整体的缺陷情况分析',
  '大数据平台系统高优先级缺陷的趋势分析',
  '低代码平台系统过去一周的缺陷分布',
  
  // 模糊查询测试
  '物联平台的问题',
  '缺陷分析',
  '待办',
  '生成报告',
  '导出数据',
  
  // 上下文测试
  '物联平台的问题列表',
  '已解决的',
  '过去一个月的',
];

// 运行测试
async function runTests() {
  console.log('开始测试意图识别系统...');
  console.log('================================');
  
  let correctCount = 0;
  let totalCount = testCases.length;
  
  for (let i = 0; i < testCases.length; i++) {
    const query = testCases[i];
    console.log(`\n测试 ${i + 1}/${totalCount}: ${query}`);
    
    try {
      const result = intentRecognizer.recognizeIntent(query as string, 'test_user');
      console.log('识别结果:', JSON.stringify(result, null, 2));
      
      // 简单的验证：只要不是unknown意图就算成功
      if (result.intent !== 'unknown') {
        correctCount++;
      }
    } catch (error) {
      console.error('测试失败:', error);
    }
  }
  
  console.log('================================');
  console.log(`测试完成: ${correctCount}/${totalCount} 个测试用例通过`);
  console.log(`准确率: ${(correctCount / totalCount * 100).toFixed(2)}%`);
  
  // 测试上下文理解
  console.log('\n测试上下文理解...');
  console.log('================================');
  
  // 重置上下文
  intentRecognizer.clearContext('context_test_user');
  
  // 第一个查询
  const firstQuery = '物联平台的问题列表';
  const firstResult = intentRecognizer.recognizeIntent(firstQuery, 'context_test_user');
  console.log(`第一个查询: ${firstQuery}`);
  console.log('识别结果:', JSON.stringify(firstResult, null, 2));
  
  // 第二个查询（依赖上下文）
  const secondQuery = '已解决的';
  const secondResult = intentRecognizer.recognizeIntent(secondQuery, 'context_test_user');
  console.log(`\n第二个查询: ${secondQuery}`);
  console.log('识别结果:', JSON.stringify(secondResult, null, 2));
  
  // 第三个查询（继续依赖上下文）
  const thirdQuery = '过去一个月的';
  const thirdResult = intentRecognizer.recognizeIntent(thirdQuery, 'context_test_user');
  console.log(`\n第三个查询: ${thirdQuery}`);
  console.log('识别结果:', JSON.stringify(thirdResult, null, 2));
}

// 运行测试
runTests().catch(console.error);
