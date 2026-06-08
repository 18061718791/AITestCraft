const axios = require('axios');

async function testProjectRecognition() {
  console.log('========== 测试项目识别修复效果 ==========\n');
  
  try {
    // 测试场景1: 用户输入"智能物联项目整体的问题情况"
    console.log('========== 测试场景1: 智能物联项目 ==========');
    console.log('用户输入: "智能物联项目整体的问题情况"\n');
    
    const response1 = await axios.post('http://localhost:9000/api/intelligent-qa/query', {
      query: '智能物联项目整体的问题情况',
      context: []
    });
    
    console.log('响应结果:');
    console.log({
      success: response1.data.success,
      message: response1.data.message,
      intent: response1.data.qaMeta?.intent,
      hasProjectId: !!response1.data.qaMeta?.entities?.projectId,
      projectId: response1.data.qaMeta?.entities?.projectId,
      project: response1.data.qaMeta?.entities?.project,
      hasSystemId: !!response1.data.qaMeta?.entities?.systemId,
      systemId: response1.data.qaMeta?.entities?.systemId,
      system: response1.data.qaMeta?.entities?.system
    });
    
    if (response1.data.qaMeta?.intent === 'get_project_defects' && 
        response1.data.qaMeta?.entities?.projectId === '2980' &&
        response1.data.qaMeta?.entities?.project === '智能物联') {
      console.log('✅ 意图识别正确: 正确识别为项目级别的查询');
    } else {
      console.log('❌ 意图识别失败: 未正确识别为项目级别的查询');
    }
    
    if (response1.data.success && response1.data.message !== '项目智能物联下没有找到系统数据') {
      console.log('✅ 数据查询成功');
    } else {
      console.log('❌ 数据查询失败:', response1.data.message);
    }
    
    console.log('\n');
    
    // 测试场景2: 用户输入"查看物联平台的问题情况"
    console.log('========== 测试场景2: 物联平台系统 ==========');
    console.log('用户输入: "查看物联平台的问题情况"\n');
    
    const response2 = await axios.post('http://localhost:9000/api/intelligent-qa/query', {
      query: '查看物联平台的问题情况',
      context: []
    });
    
    console.log('响应结果:');
    console.log({
      success: response2.data.success,
      message: response2.data.message,
      intent: response2.data.qaMeta?.intent,
      hasSystemId: !!response2.data.qaMeta?.entities?.systemId,
      systemId: response2.data.qaMeta?.entities?.systemId,
      system: response2.data.qaMeta?.entities?.system,
      hasProjectId: !!response2.data.qaMeta?.entities?.projectId,
      projectId: response2.data.qaMeta?.entities?.projectId,
      project: response2.data.qaMeta?.entities?.project
    });
    
    if (response2.data.qaMeta?.intent === 'get_defect_situation' && 
        response2.data.qaMeta?.entities?.systemId === '2983' &&
        response2.data.qaMeta?.entities?.system === '物联平台') {
      console.log('✅ 意图识别正确: 正确识别为系统级别的查询');
    } else {
      console.log('❌ 意图识别失败: 未正确识别为系统级别的查询');
    }
    
    console.log('\n');
    
    // 测试场景3: 用户输入"查看低代码的问题情况"
    console.log('========== 测试场景3: 低代码平台系统 ==========');
    console.log('用户输入: "查看低代码的问题情况"\n');
    
    const response3 = await axios.post('http://localhost:9000/api/intelligent-qa/query', {
      query: '查看低代码的问题情况',
      context: []
    });
    
    console.log('响应结果:');
    console.log({
      success: response3.data.success,
      message: response3.data.message,
      intent: response3.data.qaMeta?.intent,
      hasSystemId: !!response3.data.qaMeta?.entities?.systemId,
      systemId: response3.data.qaMeta?.entities?.systemId,
      system: response3.data.qaMeta?.entities?.system,
      hasProjectId: !!response3.data.qaMeta?.entities?.projectId,
      projectId: response3.data.qaMeta?.entities?.projectId,
      project: response3.data.qaMeta?.entities?.project
    });
    
    if (response3.data.qaMeta?.intent === 'get_defect_situation' && 
        response3.data.qaMeta?.entities?.systemId === '2981' &&
        response3.data.qaMeta?.entities?.system === '低代码') {
      console.log('✅ 意图识别正确: 正确识别为系统级别的查询');
    } else {
      console.log('❌ 意图识别失败: 未正确识别为系统级别的查询');
    }
    
    console.log('\n========== 测试总结 ==========');
    console.log('所有测试场景已完成，请查看上方结果');
    
  } catch (error) {
    console.error('测试过程中出现错误:', error.message);
    if (error.response) {
      console.error('错误详情:', error.response.data);
    }
  }
}

testProjectRecognition()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
