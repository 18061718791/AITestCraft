const axios = require('axios');

// 验证脚本：测试时间范围选择功能
async function testTimeRangeSelection() {
  console.log('开始测试时间范围选择功能...');
  
  try {
    // 步骤1：模拟用户查询"查看智能物联项目的问题情况"
    console.log('步骤1：模拟用户查询"查看智能物联项目的问题情况"');
    const response1 = await axios.post('http://localhost:9000/api/intelligent-qa/query', {
      query: '查看智能物联项目的问题情况',
      context: []
    });
    
    console.log('步骤1响应：', {
      success: response1.data.success,
      message: response1.data.message,
      resultType: response1.data.resultType
    });
    
    if (response1.data.resultType !== 'choice') {
      console.error('步骤1失败：系统没有返回问题类型选择');
      return false;
    }
    
    // 步骤2：模拟用户选择"问题列表"
    console.log('\n步骤2：模拟用户选择"问题列表"');
    const response2 = await axios.post('http://localhost:9000/api/intelligent-qa/query', {
      query: '查看智能物联项目的问题情况',
      choice: '问题列表',
      context: []
    });
    
    console.log('步骤2响应：', {
      success: response2.data.success,
      message: response2.data.message,
      resultType: response2.data.resultType,
      dataCount: response2.data.data ? response2.data.data.length : 0,
      options: response2.data.options ? response2.data.options.map(option => option.label) : []
    });
    
    if (response2.data.resultType === 'choice') {
      console.log('步骤2成功：系统返回了时间范围选择');
      console.log('时间范围选项：', response2.data.options.map(option => option.label));
      
      // 步骤3：模拟用户选择"全部数据"
      console.log('\n步骤3：模拟用户选择"全部数据"');
      const response3 = await axios.post('http://localhost:9000/api/intelligent-qa/query', {
        query: '查看智能物联项目的问题情况',
        choice: 'all',
        context: []
      });
      
      console.log('步骤3响应：', {
        success: response3.data.success,
        message: response3.data.message,
        resultType: response3.data.resultType,
        dataCount: response3.data.data ? response3.data.data.length : 0
      });
      
      if (response3.data.resultType !== 'list') {
        console.error('步骤3失败：系统没有返回缺陷列表');
        return false;
      }
      
      // 检查返回的数据数量是否正确（由于pageSize限制，最多返回100条数据）
    const dataCount = response3.data.data ? response3.data.data.length : 0;
    console.log(`返回的数据数量：${dataCount}`);
    
    if (dataCount < 1) {
      console.error(`步骤3失败：返回的数据数量不足，期望至少1条，实际返回${dataCount}条`);
      return false;
    } else {
      console.log(`步骤3成功：返回了${dataCount}条数据，符合预期（由于pageSize限制，最多返回100条数据）`);
    }
      
      console.log('\n测试通过！时间范围选择功能正常工作。');
      return true;
    } else {
      console.error('步骤2失败：系统没有返回时间范围选择');
      console.log('详细响应数据：', JSON.stringify(response2.data, null, 2));
      return false;
    }
    
  } catch (error) {
    console.error('测试过程中出现错误：', error.message);
    console.error('错误详情：', error);
    return false;
  }
}

// 运行测试
testTimeRangeSelection()
  .then(success => {
    if (success) {
      console.log('\n🎉 所有测试通过！');
    } else {
      console.log('\n❌ 测试失败！');
    }
  })
  .catch(error => {
    console.error('测试运行失败：', error);
  });
