import axios from 'axios';

/**
 * 优化效果测试套件
 * 用于验证智能问答系统的优化效果
 */
class OptimizationTestSuite {
  private baseUrl: string;
  private testResults: Array<{
    testCase: string;
    input: string;
    expected: any;
    actual: any;
    passed: boolean;
    performance: {
      responseTime: number;
      confidence: number;
    };
  }> = [];

  constructor(baseUrl: string = 'http://localhost:9000') {
    this.baseUrl = baseUrl;
  }

  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 开始运行优化效果测试...\n');

    // 测试用例分类
    const testCategories = {
      '意图识别精度测试': this.getIntentAccuracyTests(),
      '动态置信度测试': this.getDynamicThresholdTests(),
      '系统项目识别测试': this.getEntityRecognitionTests(),
      '智能时间解析测试': this.getTimeParsingTests(),
      '对话状态机测试': this.getDialogStateTests(),
      '结果融合测试': this.getResultFusionTests()
    };

    for (const [category, tests] of Object.entries(testCategories)) {
      console.log(`📋 ${category}`);
      console.log('─'.repeat(50));
      
      for (const test of tests) {
        await this.runSingleTest(test, category);
      }
      
      console.log('\n');
    }

    this.generateTestReport();
  }

  /**
   * 运行单个测试
   */
  private async runSingleTest(test: any, category: string): Promise<void> {
    try {
      const startTime = Date.now();
      
      const response = await axios.post(`${this.baseUrl}/api/intelligent-qa/query`, {
        query: test.input,
        userId: 'test_user',
        sessionId: 'test_session'
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      const result = {
        testCase: test.name,
        input: test.input,
        expected: test.expected,
        actual: response.data,
        passed: this.evaluateTestResult(test, response.data),
        performance: {
          responseTime,
          confidence: response.data.qaMeta?.confidence || 0
        }
      };
      
      this.testResults.push(result);
      
      const status = result.passed ? '✅' : '❌';
      console.log(`  ${status} ${test.name}`);
      console.log(`     输入: "${test.input}"`);
      console.log(`     响应时间: ${responseTime}ms, 置信度: ${result.performance.confidence.toFixed(2)}`);
      
      if (!result.passed) {
        console.log(`     预期: ${JSON.stringify(test.expected)}`);
        console.log(`     实际: ${JSON.stringify(response.data)}`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ❌ ${test.name} - 请求失败: ${errorMessage}`);
      
      this.testResults.push({
        testCase: test.name,
        input: test.input,
        expected: test.expected,
        actual: { error: errorMessage },
        passed: false,
        performance: { responseTime: 0, confidence: 0 }
      });
    }
  }

  /**
   * 评估测试结果
   */
  private evaluateTestResult(test: any, actual: any): boolean {
    // 基本成功检查
    if (!actual.success && test.expected.success) {
      return false;
    }

    // 意图检查
    if (test.expected.intent && actual.qaMeta?.intent !== test.expected.intent) {
      return false;
    }

    // 置信度检查
    if (test.expected.minConfidence && actual.qaMeta?.confidence < test.expected.minConfidence) {
      return false;
    }

    // 实体检查
    if (test.expected.entities) {
      for (const [key, value] of Object.entries(test.expected.entities)) {
        if (actual.qaMeta?.entities?.[key] !== value) {
          return false;
        }
      }
    }

    // 结果类型检查
    if (test.expected.resultType && actual.resultType !== test.expected.resultType) {
      return false;
    }

    // 响应时间检查
    if (test.expected.maxResponseTime && performance.now() > test.expected.maxResponseTime) {
      return false;
    }

    return true;
  }

  /**
   * 意图识别精度测试用例
   */
  private getIntentAccuracyTests(): any[] {
    return [
      {
        name: '简单缺陷列表查询',
        input: '获取低代码系统的问题列表',
        expected: {
          success: true,
          intent: 'get_defect_list',
          minConfidence: 0.7,
          entities: { system: '低代码', systemId: 2981 }
        }
      },
      {
        name: '复杂分析查询',
        input: '智能物联项目过去一个月的缺陷趋势分析',
        expected: {
          success: true,
          intent: 'analyze_defects',
          minConfidence: 0.7,
          entities: { project: '智能物联', projectId: 2980 }
        }
      },
      {
        name: '待办任务查询',
        input: '我想查看我的待办任务',
        expected: {
          success: true,
          intent: 'get_todo_list',
          minConfidence: 0.8
        }
      },
      {
        name: '导出数据请求',
        input: '导出物联平台的问题数据为Excel',
        expected: {
          success: true,
          intent: 'export_data',
          minConfidence: 0.7,
          entities: { system: '物联平台', systemId: 2983 }
        }
      },
      {
        name: '模糊查询测试',
        input: '看看低代码最近的问题',
        expected: {
          success: true,
          intent: 'get_defect_list',
          minConfidence: 0.6,
          entities: { system: '低代码' }
        }
      }
    ];
  }

  /**
   * 动态置信度测试用例
   */
  private getDynamicThresholdTests(): any[] {
    return [
      {
        name: '短查询低阈值测试',
        input: '低代码问题',
        expected: {
          success: true,
          minConfidence: 0.4 // 短查询应该有更低的阈值
        }
      },
      {
        name: '长查询标准阈值测试',
        input: '我想要查看低代码系统过去一个月内所有状态为已解决的高优先级问题的详细列表',
        expected: {
          success: true,
          minConfidence: 0.6
        }
      },
      {
        name: '实体完整高置信度测试',
        input: '获取物联应用系统上周新建的紧急问题列表',
        expected: {
          success: true,
          minConfidence: 0.8
        }
      }
    ];
  }

  /**
   * 系统项目识别测试用例
   */
  private getEntityRecognitionTests(): any[] {
    return [
      {
        name: '低代码系统识别',
        input: '查看低代码系统的问题',
        expected: {
          success: true,
          entities: { system: '低代码', systemId: 2981 }
        }
      },
      {
        name: '智能物联项目识别',
        input: '智能物联项目的整体情况',
        expected: {
          success: true,
          entities: { project: '智能物联', projectId: 2980 }
        }
      },
      {
        name: '物联平台系统识别',
        input: '物联平台的缺陷分析',
        expected: {
          success: true,
          entities: { system: '物联平台', systemId: 2983 }
        }
      },
      {
        name: '避免混淆测试',
        input: '智能物联项目的问题', // 应该识别为项目，不是物联平台系统
        expected: {
          success: true,
          entities: { project: '智能物联', projectId: 2980 }
        }
      }
    ];
  }

  /**
   * 智能时间解析测试用例
   */
  private getTimeParsingTests(): any[] {
    return [
      {
        name: '相对时间解析',
        input: '3天前的问题',
        expected: {
          success: true,
          entities: { timeRange: 'relative_day' }
        }
      },
      {
        name: '工作日解析',
        input: '本周工作日的问题',
        expected: {
          success: true,
          entities: { timeRange: 'workdays' }
        }
      },
      {
        name: '具体日期解析',
        input: '2024-01-15的问题',
        expected: {
          success: true,
          entities: { timeRange: 'specific_date' }
        }
      },
      {
        name: '模糊时间解析',
        input: '最近创建的问题',
        expected: {
          success: true,
          entities: { timeRange: 'week' }
        }
      }
    ];
  }

  /**
   * 对话状态机测试用例
   */
  private getDialogStateTests(): any[] {
    return [
      {
        name: '低置信度澄清测试',
        input: '看看数据', // 模糊查询
        expected: {
          success: true,
          resultType: 'choice'
        }
      },
      {
        name: '缺失实体处理测试',
        input: '查看问题列表', // 缺少系统信息
        expected: {
          success: true,
          resultType: 'choice'
        }
      },
      {
        name: '时间范围选择测试',
        input: '分析低代码的问题趋势', // 缺少时间范围
        expected: {
          success: true,
          resultType: 'choice'
        }
      }
    ];
  }

  /**
   * 结果融合测试用例
   */
  private getResultFusionTests(): any[] {
    return [
      {
        name: '规则与LLM一致测试',
        input: '获取低代码的问题列表',
        expected: {
          success: true,
          minConfidence: 0.8 // 融合后应该提高置信度
        }
      },
      {
        name: '复杂查询LLM优先测试',
        input: '分析智能物联项目在复杂环境下的整体表现趋势',
        expected: {
          success: true,
          minConfidence: 0.6
        }
      }
    ];
  }

  /**
   * 生成测试报告
   */
  private generateTestReport(): void {
    console.log('📊 测试报告');
    console.log('='.repeat(50));
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过测试: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`失败测试: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
    
    // 性能统计
    const avgResponseTime = this.testResults
      .filter(r => r.performance.responseTime > 0)
      .reduce((sum, r) => sum + r.performance.responseTime, 0) / 
      this.testResults.filter(r => r.performance.responseTime > 0).length;
    
    const avgConfidence = this.testResults
      .filter(r => r.performance.confidence > 0)
      .reduce((sum, r) => sum + r.performance.confidence, 0) / 
      this.testResults.filter(r => r.performance.confidence > 0).length;
    
    console.log(`平均响应时间: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`平均置信度: ${avgConfidence.toFixed(2)}`);
    
    // 失败测试详情
    if (failedTests > 0) {
      console.log('\n❌ 失败测试详情:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.testCase}: "${r.input}"`);
        });
    }
    
    // 分类统计
    const categoryStats: Record<string, { total: number; passed: number }> = {};
    
    this.testResults.forEach(result => {
      const category = result.testCase.split('_')[0] || '其他';
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, passed: 0 };
      }
      categoryStats[category].total++;
      if (result.passed) {
        categoryStats[category].passed++;
      }
    });
    
    console.log('\n📈 分类统计:');
    Object.entries(categoryStats).forEach(([category, stats]) => {
      const rate = ((stats.passed / stats.total) * 100).toFixed(1);
      console.log(`  ${category}: ${stats.passed}/${stats.total} (${rate}%)`);
    });
    
    console.log('\n✨ 优化效果评估:');
    if (passedTests / totalTests >= 0.8) {
      console.log('🎉 优化效果良好！系统性能显著提升。');
    } else if (passedTests / totalTests >= 0.6) {
      console.log('👍 优化效果一般，还有改进空间。');
    } else {
      console.log('⚠️  优化效果不佳，需要进一步调整。');
    }
  }

  /**
   * 保存测试结果到文件
   */
  async saveTestResults(filePath: string = './test-results.json'): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.passed).length,
        failed: this.testResults.filter(r => !r.passed).length,
        avgResponseTime: this.testResults
          .filter(r => r.performance.responseTime > 0)
          .reduce((sum, r) => sum + r.performance.responseTime, 0) / 
          this.testResults.filter(r => r.performance.responseTime > 0).length,
        avgConfidence: this.testResults
          .filter(r => r.performance.confidence > 0)
          .reduce((sum, r) => sum + r.performance.confidence, 0) / 
          this.testResults.filter(r => r.performance.confidence > 0).length
      },
      results: this.testResults
    };
    
    require('fs').writeFileSync(filePath, JSON.stringify(report, null, 2));
    console.log(`\n📄 测试结果已保存到: ${filePath}`);
  }
}

// 导出测试套件
export default OptimizationTestSuite;

// 如果直接运行此文件，执行测试
if (require.main === module) {
  const testSuite = new OptimizationTestSuite();
  testSuite.runAllTests()
    .then(() => testSuite.saveTestResults())
    .catch(console.error);
}