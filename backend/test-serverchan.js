// 测试ServerChan服务的待办事项统计功能
const { serverChanService } = require('./dist/services/serverChanService');

async function testTodoStats() {
  console.log('开始测试ServerChan待办事项统计...');
  
  try {
    // 获取待办事项统计
    const stats = await serverChanService.getTodoStats();
    console.log('待办事项统计结果:', JSON.stringify(stats, null, 2));
    
    // 生成待办提醒消息
    const message = await serverChanService.generateTodoMessage();
    console.log('生成的提醒消息:', message);
    
    // 发送测试通知
    const success = await serverChanService.sendTestNotification();
    console.log('测试通知发送结果:', success ? '成功' : '失败');
    
    console.log('测试完成！');
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
testTodoStats();