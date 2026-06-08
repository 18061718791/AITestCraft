// 中国法定节假日数据（2025-2026年）
// 格式：YYYY-MM-DD

export const holidays: string[] = [
  // 2025年法定节假日
  '2025-01-01', // 元旦
  '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', // 春节
  '2025-02-01', '2025-02-02', '2025-02-03', '2025-02-04', // 春节
  '2025-04-04', '2025-04-05', '2025-04-06', // 清明节
  '2025-05-01', '2025-05-02', '2025-05-03', '2025-05-04', '2025-05-05', // 劳动节
  '2025-05-31', '2025-06-01', '2025-06-02', // 端午节
  '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', // 国庆节
  '2025-10-06', '2025-10-07', '2025-10-08', // 国庆节

  // 2026年法定节假日
  '2026-01-01', // 元旦
  '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', // 春节
  '2026-02-21', '2026-02-22', '2026-02-23', '2026-02-24', // 春节
  '2026-04-04', '2026-04-05', '2026-04-06', // 清明节
  '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05', // 劳动节
  '2026-06-19', '2026-06-20', '2026-06-21', // 端午节
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', // 国庆节
  '2026-10-06', '2026-10-07', '2026-10-08', // 国庆节
];

// 调休工作日（周末但需要上班）
export const workdays: string[] = [
  // 2025年调休
  '2025-01-26', // 春节调休
  '2025-02-08', // 春节调休
  '2025-04-27', // 劳动节调休
  '2025-09-28', // 国庆节调休
  '2025-10-11', // 国庆节调休

  // 2026年调休
  '2026-02-15', // 春节调休
  '2026-02-28', // 春节调休
  '2026-04-26', // 劳动节调休
  '2026-09-27', // 国庆节调休
  '2026-10-10', // 国庆节调休
];

// 判断某天是否为节假日
export function isHoliday(date: Date): boolean {
  const dateStr = formatDate(date);
  return holidays.includes(dateStr);
}

// 判断某天是否为调休工作日
export function isWorkday(date: Date): boolean {
  const dateStr = formatDate(date);
  return workdays.includes(dateStr);
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 计算工作日天数（排除周末和节假日，包含调休工作日）
export function calculateWorkDaysExcludingHolidays(createdOn: Date): number {
  const created = new Date(createdOn);
  const now = new Date();

  let workDays = 0;
  const current = new Date(created);

  while (current < now) {
    const dayOfWeek = current.getDay();
    const dateStr = formatDate(current);

    // 0=周日, 6=周六
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHolidayDate = holidays.includes(dateStr);
    const isWorkdayDate = workdays.includes(dateStr);

    // 如果是调休工作日，算作工作日
    if (isWorkdayDate) {
      workDays++;
    }
    // 如果是周末但不是调休工作日，不算工作日
    else if (isWeekend) {
      // 周末不算工作日
    }
    // 如果是节假日，不算工作日
    else if (isHolidayDate) {
      // 节假日不算工作日
    }
    // 普通工作日
    else {
      workDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return workDays;
}
