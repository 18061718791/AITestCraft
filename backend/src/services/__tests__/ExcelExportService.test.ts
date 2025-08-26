import { ExcelExportService, TestCaseWithRelations } from '../ExcelExportService';

describe('ExcelExportService', () => {
  let service: ExcelExportService;

  beforeEach(() => {
    service = new ExcelExportService();
  });

  describe('generateTestCasesExcel', () => {
    const mockTestCases: TestCaseWithRelations[] = [
      {
        id: 1,
        title: '测试用户登录功能',
        status: 'PASSED',
        priority: 'HIGH',
        preconditions: '用户已注册并激活账户',
        steps: '1. 打开登录页面\n2. 输入正确的用户名和密码\n3. 点击登录按钮',
        expectedResult: '用户成功登录，跳转到首页',
        actualResult: '登录成功，跳转到首页',
        tags: ['登录', '功能测试'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        system: { id: 1, name: '用户管理系统' },
        module: { id: 1, name: '用户认证' },
        scenario: { id: 1, name: '用户登录' }
      },
      {
        id: 2,
        title: '测试用户注册功能',
        status: 'PENDING',
        priority: 'MEDIUM',
        preconditions: '用户未注册',
        steps: '1. 打开注册页面\n2. 填写注册信息\n3. 提交注册表单',
        expectedResult: '用户注册成功，收到激活邮件',
        actualResult: '',
        tags: ['注册', '功能测试'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        system: { id: 1, name: '用户管理系统' },
        module: { id: 2, name: '用户管理' },
        scenario: { id: 2, name: '用户注册' }
      }
    ];

    test('应该成功生成Excel文件', async () => {
      const buffer = await service.generateTestCasesExcel(mockTestCases);
      
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    test('应该处理空数组', async () => {
      await expect(service.generateTestCasesExcel([]))
        .rejects
        .toThrow('测试用例数据不能为空');
    });

    test('应该验证测试用例ID数组', () => {
      expect(service.validateTestCaseIds([])).toEqual({
        valid: false,
        message: '请选择要导出的测试用例'
      });

      expect(service.validateTestCaseIds([1, 2, 3])).toEqual({
        valid: true
      });

      expect(service.validateTestCaseIds(Array(501).fill(1))).toEqual({
        valid: false,
        message: '一次最多导出500个测试用例'
      });
    });

    test('应该正确转换状态文本', () => {
      expect(service['getStatusText']('PASSED')).toBe('已通过');
      expect(service['getStatusText']('FAILED')).toBe('已失败');
      expect(service['getStatusText']('PENDING')).toBe('待测试');
      expect(service['getStatusText']('UNKNOWN')).toBe('UNKNOWN');
    });

    test('应该正确转换优先级文本', () => {
      expect(service['getPriorityText']('HIGH')).toBe('高');
      expect(service['getPriorityText']('MEDIUM')).toBe('中');
      expect(service['getPriorityText']('LOW')).toBe('低');
      expect(service['getPriorityText']('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('性能测试', () => {
    test('应该处理大量数据', async () => {
      const largeTestCases = Array(100).fill(null).map((_, index) => ({
        id: index + 1,
        title: `测试用例${index + 1}`,
        status: 'PENDING',
        priority: 'MEDIUM',
        preconditions: '前置条件',
        steps: '测试步骤',
        expectedResult: '预期结果',
        actualResult: '',
        tags: ['标签1', '标签2'],
        createdAt: new Date(),
        updatedAt: new Date(),
        system: { id: 1, name: '测试系统' },
        module: { id: 1, name: '测试模块' },
        scenario: { id: 1, name: '测试场景' }
      }));

      const startTime = Date.now();
      const buffer = await service.generateTestCasesExcel(largeTestCases);
      const duration = Date.now() - startTime;

      expect(buffer).toBeInstanceOf(Buffer);
      expect(duration).toBeLessThan(5000); // 5秒内完成
    });
  });
});