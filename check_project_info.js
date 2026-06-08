const projectMappingService = require('./backend/src/services/intelligentQa/ProjectMappingService').default;

async function checkProjectInfo() {
  try {
    console.log('Getting project info...');
    const projectInfo = await projectMappingService.getLLMProjectInfo();
    console.log('Project info returned:');
    console.log(projectInfo);
    
    // 检查是否包含低代码系统
    if (projectInfo.includes('低代码')) {
      console.log('\n✅ Project info contains "低代码" system');
    } else {
      console.log('\n❌ Project info does NOT contain "低代码" system');
    }
    
    // 检查是否包含物联平台系统
    if (projectInfo.includes('物联平台')) {
      console.log('✅ Project info contains "物联平台" system');
    } else {
      console.log('❌ Project info does NOT contain "物联平台" system');
    }
    
  } catch (error) {
    console.error('Error getting project info:', error);
  }
}

checkProjectInfo();
