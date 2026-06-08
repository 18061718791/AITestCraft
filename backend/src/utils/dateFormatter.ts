/**
 * 时间格式化工具
 * 统一将时间格式化为 yyyy-mm-dd hh:mm:ss 格式
 */

export class DateFormatter {
  /**
   * 将Date对象格式化为 yyyy-mm-dd hh:mm:ss 格式
   */
  static formatDateTime(date: Date): string {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * 将时间字符串或时间戳格式化为 yyyy-mm-dd hh:mm:ss 格式
   */
  static formatDateTimeFromString(dateString: string | number): string {
    if (!dateString) {
      return '';
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }

    return this.formatDateTime(date);
  }

  /**
   * 格式化测试用例对象中的时间字段
   */
  static formatTestCaseDates(testCase: any): any {
    if (!testCase) return testCase;

    return {
      ...testCase,
      createdAt: this.formatDateTimeFromString(testCase.createdAt || testCase.created_at),
      updatedAt: this.formatDateTimeFromString(testCase.updatedAt || testCase.updated_at)
    };
  }

  /**
   * 格式化测试用例数组中的时间字段
   */
  static formatTestCasesDates(testCases: any[]): any[] {
    if (!Array.isArray(testCases)) return testCases;

    return testCases.map(testCase => this.formatTestCaseDates(testCase));
  }
}

export default DateFormatter;