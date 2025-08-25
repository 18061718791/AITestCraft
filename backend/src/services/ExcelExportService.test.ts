import { ExcelExportService } from './ExcelExportService';

// 测试工具函数

describe('ExcelExportService', () => {
  let service: ExcelExportService;

  beforeEach(() => {
    service = new ExcelExportService();
  });

  describe('validateTestCaseIds', () => {
    it('应该验证空数组', () => {
      const result = service.validateTestCaseIds([]);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('请选择要导出的测试用例');
    });

    it('应该验证超过500条记录', () => {
      const ids = Array.from({ length: 501 }, (_, i) => i + 1);
      const result = service.validateTestCaseIds(ids);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('一次最多导出500个测试用例');
    });

    it('应该验证非数字ID', () => {
      const result = service.validateTestCaseIds([1, '2', 3]);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('测试用例ID必须是正整数');
    });

    it('应该验证负数字ID', () => {
      const result = service.validateTestCaseIds([1, -2, 3]);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('测试用例ID必须是正整数');
    });

    it('应该验证有效ID数组', () => {
      const result = service.validateTestCaseIds([1, 2, 3]);
      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });
  });

  describe('getStatusText', () => {
    it('应该转换PENDING状态', () => {
      expect(service['getStatusText']('PENDING')).toBe('待测试');
    });

    it('应该转换PASSED状态', () => {
      expect(service['getStatusText']('PASSED')).toBe('已通过');
    });

    it('应该返回未知状态', () => {
      expect(service['getStatusText']('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('getPriorityText', () => {
    it('应该转换HIGH优先级', () => {
      expect(service['getPriorityText']('HIGH')).toBe('高');
    });

    it('应该转换MEDIUM优先级', () => {
      expect(service['getPriorityText']('MEDIUM')).toBe('中');
    });

    it('应该转换LOW优先级', () => {
      expect(service['getPriorityText']('LOW')).toBe('低');
    });

    it('应该返回未知优先级', () => {
      expect(service['getPriorityText']('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('formatDateTime', () => {
    it('应该正确格式化日期时间', () => {
      const date = new Date('2024-01-15T14:30:00.000Z');
      const result = service['formatDateTime'](date);
      expect(result).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    });
  });

  describe('generateTestCasesExcel', () => {
    it('应该生成有效的Excel文件', async () => {
      const mockTestCases = [
        {
          id: 1,
          title: '测试用例1',
          status: 'ACTIVE',
          priority: 'HIGH',
          preconditions: '前置条件1',
          steps: '步骤1',
          expectedResult: '预期结果1',
          tags: ['标签1'],
          createdAt: new Date('2024-01-15T10:00:00.000Z'),
          updatedAt: new Date('2024-01-15T11:00:00.000Z'),
          system: { id: 1, name: '系统1' },
          module: { id: 1, name: '模块1' },
          scenario: { id: 1, name: '场景1' }
        }
      ];

      const buffer = await service.generateTestCasesExcel(mockTestCases);
      
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('应该处理空数组', async () => {
      await expect(service.generateTestCasesExcel([]))
        .rejects.toThrow('测试用例数据不能为空');
    });

    it('应该处理空值字段', async () => {
      const mockTestCases = [
        {
          id: 1,
          title: '测试用例1',
          status: 'ACTIVE',
          priority: 'HIGH',
          preconditions: '',
          steps: '',
          expectedResult: '',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          system: null,
          module: null,
          scenario: null
        }
      ];

      const buffer = await service.generateTestCasesExcel(mockTestCases);
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });
});