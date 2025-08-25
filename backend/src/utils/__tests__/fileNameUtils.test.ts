import { generateSafeFileName, sanitizeFileName, formatTimestamp, generateTestCaseExportFileName } from '../fileNameUtils';

describe('fileNameUtils', () => {
  describe('sanitizeFileName', () => {
    it('should remove invalid characters', () => {
      expect(sanitizeFileName('test<file>:name')).toBe('test_file__name');
      expect(sanitizeFileName('test\\file/name')).toBe('test_file_name');
      expect(sanitizeFileName('test|file?name')).toBe('test_file_name');
    });

    it('should handle empty input', () => {
      expect(sanitizeFileName('')).toBe('untitled');
      expect(sanitizeFileName(null as any)).toBe('untitled');
      expect(sanitizeFileName(undefined as any)).toBe('untitled');
    });

    it('should trim and normalize spaces', () => {
      expect(sanitizeFileName('  test  file  ')).toBe('test_file');
      expect(sanitizeFileName('test    file')).toBe('test_file');
    });

    it('should handle special characters', () => {
      expect(sanitizeFileName('test*file')).toBe('test_file');
      expect(sanitizeFileName('test<file>name')).toBe('test_file_name');
    });
  });

  describe('formatTimestamp', () => {
    it('should format date correctly', () => {
      const date = new Date(2024, 0, 15, 14, 30, 45); // 2024-01-15 14:30:45
      expect(formatTimestamp(date)).toBe('20240115_143045');
    });

    it('should handle invalid date', () => {
      expect(formatTimestamp(null as any)).toMatch(/^\d{8}_\d{6}$/);
    });
  });

  describe('generateSafeFileName', () => {
    it('should generate safe filename', () => {
      const filename = generateSafeFileName('test file', '.xlsx');
      expect(filename).toMatch(/^test_file_\d{8}_\d{6}\.xlsx$/);
    });

    it('should handle long base names', () => {
      const longName = 'a'.repeat(300);
      const filename = generateSafeFileName(longName, '.xlsx');
      expect(filename.length).toBeLessThanOrEqual(200);
      expect(filename.endsWith('.xlsx')).toBe(true);
    });

    it('should handle special characters in base name', () => {
      const filename = generateSafeFileName('test<file>name', '.xlsx');
      expect(filename).toMatch(/^test_file_name_\d{8}_\d{6}\.xlsx$/);
    });
  });

  describe('generateTestCaseExportFileName', () => {
    it('should generate test case export filename', () => {
      const filename = generateTestCaseExportFileName();
      expect(filename).toMatch(/^test_cases_export_\d{8}_\d{6}\.xlsx$/);
    });
  });
});