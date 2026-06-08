const axios = require('axios');

// 验证脚本：测试时间范围优化功能
async function testTimeRangeOptimization() {
  console.log('开始测试时间范围优化功能...\n');
  
  let passedTests = 0;
  let failedTests = 0;
  
  try {
    // 测试场景1: 用户明确指定时间范围(上周)
    console.log('========== 测试场景1: 用户明确指定时间范围(上周) ==========');
    console.log('用户输入: "查看物联平台上周的问题情况"\n');
    
    const response1 = await axios.post('http://localhost:9000/api/intelligent-qa/query', {
      query: '查看物联平台上周的问题情况',
      context: []
    });
    
    console.log('步骤1响应:', {
      success: response1.data.success,
      message: response1.data.message,
      resultType: response1.data.resultType,
      hasTimeRange: !!response1.data.qaMeta?.entities?.timeRange,
      timeRange: response1.data.qaMeta?.entities?.timeRange
    });
    
    if (response1.data.resultType !== 'choice') {
      console.error('步骤1失败: 系统没有返回问题类型选择');
      failedTests++;
      return false;
    }
    
    // 步骤2: 用户选择"问题列表"
    console.log('\n步骤2: 用户选择"问题列表"');
    const response2 = await axios.post('http://localhost:9000/api/intelligent-qa/query', {
      query: '查看物联平台上周的问题情况',
      choice: '问题列表',
      context: []
    });
    
    console.log('步骤2响应:', {
      success: response2.data.success,
      message: response2.data.message,
      resultType: response2.data.resultType,
      dataCount: response2.data.data?.length || 0
    });
    
    if (response2.data.resultType === 'choice') {
      console.error('❌ 测试失败: 用户已明确指定时间范围(上周),系统仍然询问时间范围');
      console.log('期望: 直接返回缺陷列表');
      console.log('实际: 返回时间范围选择');
      failedTests++;
    } else if (response2.data.resultType === 'list') {
      console.log('✅ 测试通过: 用户已明确指定时间范围(上周),系统直接返回缺陷列表');
      passedTests++;
    } else {
      console.error('❌ 测试失败: 返回了意外的resultType:', response2.data.resultType);
      failedTests++;
    }
    
    console.log('\n');
    
    // 测试场景2: 用户未指定时间范围
    console.log('========== 测试场景2: 用户未指定时间范围 ==========');
    console.log('用户输入: "查看物联平台的问题情况"\n');
    
    const response3 = await axios.post('http://localhost:9000/api/intelligent-qa/query', {
      query: '查看物联平台的问题情况',
      context: []
    });
    
    console.log('步骤1响应:', {
      success: response3.data.success,
      message: response3.data.message,
      resultType: response3.data.resultType
    });
    
    if (response3.data.resultType !== 'choice') {
      console.error('步骤1失败: 系统没有返回问题类型选择');
      failedTests++;
      return false;
    }
    
    // 步骤2: 用户选择"问题列表"
    console.log('\n步骤2: 用户选择"问题列表"');
    const response4 = await axios.post('http://localhost:9000/api/intelligent-qa/query', {
      query: '查看物联平台的问题情况',
      choice: '问题列表',
      context: []
    });
    
    console.log('步骤2响应:', {
      success: response4.data.success,
      message: response4.data.message,
      resultType: response4.data.resultType,
      hasOptions: !!response4.data.options,
      optionsCount: response4.data.options?.length || 0
    });
    
    if (response4.data.resultType === 'choice' && response4.data.options) {
      console.log('✅ 测试通过: 用户未指定时间范围,系统询问时间范围');
      console.log('时间范围选项:', response4.data.options.map(o => o.label));
      passedTests++;
    } else {
      console.error('❌ 测试失败: 用户未指定时间范围,系统没有询问时间范围');
      console.log('期望: 返回时间范围选择');
      console.log('实际:', response4.data.resultType);
      failedTests++;
    }
    
    console.log('\n');
    
    // 测试场景3: 用户明确指定时间范围(上个月) + 问题趋势分析
    console.log('========== 测试场景3: 用户明确指定时间范围(上个月) + 问题趋势分析 ==========');
    console.log('用户输入: "查看物联平台上个月的问题情况"\n');
    
    const response5 = await axios.post('http://localhost:9000/api/intelligent-qa/query', {
      query: '查看物联平台上个月的问题情况',
      context: []
    });
    
    console.log('步骤1响应:', {
      success: response5.data.success,
      message: response5.data.message,
      resultType: response5.data.resultType,
      hasTimeRange: !!response5.data.qaMeta?.entities?.timeRange,
      timeRange: response5.data.qaMeta?.entities?.timeRange
    });
    
    if (response5.data.resultType !== 'choice') {
      console.error('步骤1失败: 系统没有返回问题类型选择');
      failedTests++;
      return false;
    }
    
    // 步骤2: 用户选择"问题趋势分析"
    console.log('\n步骤2: 用户选择"问题趋势分析"');
    const response6 = await axios.post('http://localhost:9000/api/intelligent-qa/query', {
      query: '查看物联平台上个月的问题情况',
      choice: '问题趋势分析',
      context: []
    });
    
    console.log('步骤2响应:', {
      success: response6.data.success,
      message: response6.data.message,
      resultType: response6.data.resultType,
      dataCount: response6.data.data?.length || 0
    });
    
    if (response6.data.resultType === 'choice') {
      console.error('❌ 测试失败: 用户已明确指定时间范围(上个月),系统仍然询问时间范围');
      console.log('期望: 直接返回趋势分析结果');
      console.log('实际: 返回时间范围选择');
      failedTests++;
    } else if (response6.data.resultType === 'chart' || response6.data.resultType === 'list') {
      console.log('✅ 测试通过: 用户已明确指定时间范围(上个月),系统直接返回趋势分析结果');
      passedTests++;
    } else {
      console.error('❌ 测试失败: 返回了意外的resultType:', response6.data.resultType);
      failedTests++;
    }
    
    console.log('\n');
    
    // 输出测试总结
    console.log('========== 测试总结 ==========');
    console.log(`总测试数: ${passedTests + failedTests}`);
    console.log(`通过: ${passedTests}`);
    console.log(`失败: ${failedTests}`);
    
    if (failedTests === 0) {
      console.log('\n🎉 所有测试通过！');
      return true;
    } else {
      console.log('\n❌ 部分测试失败！');
      return false;
    }
    
  } catch (error) {
    console.error('测试过程中出现错误:', error.message);
    if (error.response) {
      console.error('错误详情:', error.response.data);
    }
    return false;
  }
}

// 运行测试
testTimeRangeOptimization()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
