import ExcelJS from 'exceljs';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { PrismaClient } from '../generated/prisma';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

interface ImportProgress {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total: number;
  processed: number;
  success: number;
  failed: number;
  errors: ValidationError[];
  reportUrl?: string;
}

interface ValidationError {
  row: number;
  column: string;
  message: string;
  value?: any;
}

interface TestCaseRow {
  title: string;
  preconditions?: string;
  steps: string;
  expectedResult: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  status?: 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';
  tags?: string[];
  systemName?: string;
  moduleName?: string;
  scenarioName?: string;
}

export class BatchImportService {
  private progressMap: Map<string, ImportProgress> = new Map();

  /**
   * 验证导入文件
   */
  async validateFile(file: Express.Multer.File): Promise<{
    valid: boolean;
    errors: ValidationError[];
    preview: TestCaseRow[];
    totalRows: number;
  }> {
    const rows = await this.parseFile(file);
    const errors: ValidationError[] = [];
    const preview: TestCaseRow[] = [];

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i];
      if (row) {
        const rowErrors = this.validateRow(row, i + 2); // +2 因为标题行是第1行
        errors.push(...rowErrors);
        if (rowErrors.length === 0) {
          preview.push(row);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      preview,
      totalRows: rows.length,
    };
  }

  /**
   * 批量导入测试用例
   */
  async importTestCases(
    file: Express.Multer.File,
    conflictStrategy: 'skip' | 'overwrite' | 'new_version'
  ): Promise<ImportProgress> {
    const jobId = uuidv4();
    
    // 初始化进度
    this.progressMap.set(jobId, {
      jobId,
      status: 'pending',
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      errors: [],
    });

    // 异步处理导入
    this.processImport(jobId, file, conflictStrategy);

    return this.progressMap.get(jobId)!;
  }

  /**
   * 获取导入进度
   */
  getImportProgress(jobId: string): ImportProgress | null {
    return this.progressMap.get(jobId) || null;
  }

  /**
   * 解析文件
   */
  private async parseFile(file: Express.Multer.File): Promise<TestCaseRow[]> {
    if (file.mimetype.includes('sheet') || file.originalname.endsWith('.xlsx')) {
      return this.parseExcel(file);
    } else if (file.mimetype.includes('csv') || file.originalname.endsWith('.csv')) {
      return this.parseCSV(file);
    } else {
      throw new Error('不支持的文件格式');
    }
  }

  /**
   * 解析Excel文件
   */
  private async parseExcel(file: Express.Multer.File): Promise<TestCaseRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Excel文件中没有找到工作表');
    }
    const rows: TestCaseRow[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过标题行

      const values = row.values as any[];
      rows.push({
        title: values[2]?.toString() || '',           // 用例标题 (列2)
        preconditions: values[6]?.toString(),         // 前置条件 (列6)
        steps: values[7]?.toString() || '',          // 测试步骤 (列7)
        expectedResult: values[8]?.toString() || '',  // 预期结果 (列8)
        status: this.parseStatus(values[9]?.toString()),      // 状态 (列9)
        priority: this.parsePriority(values[10]?.toString()), // 优先级 (列10)
        tags: values[11] ? values[11].toString().split(',').map((tag: string) => tag.trim()) : undefined, // 标签 (列11)
        systemName: values[3]?.toString(),            // 系统 (列3)
        moduleName: values[4]?.toString(),           // 功能模块 (列4)
        scenarioName: values[5]?.toString(),        // 功能场景 (列5)
      });
    });

    return rows;
  }

  /**
   * 解析CSV文件
   */
  private async parseCSV(file: Express.Multer.File): Promise<TestCaseRow[]> {
    return new Promise((resolve, reject) => {
      const rows: TestCaseRow[] = [];
      const buffer = Buffer.from(file.buffer);
      const stream = Readable.from(buffer);

      stream
        .pipe(csv())
        .on('data', (data) => {
          rows.push({
            title: data['用例标题'] || data.title || '',
            preconditions: data['前置条件'] || data.preconditions,
            steps: data['测试步骤'] || data.steps || '',
            expectedResult: data['预期结果'] || data.expectedResult || '',
            priority: this.parsePriority(data['优先级'] || data.priority),
            status: this.parseStatus(data['状态'] || data.status),
            tags: data['标签'] || data.tags ? data['标签']?.split(',').map((tag: string) => tag.trim()) : undefined,
            systemName: data['系统'] || data.systemName,
            moduleName: data['功能模块'] || data.moduleName,
            scenarioName: data['功能场景'] || data.scenarioName,
          });
        })
        .on('end', () => resolve(rows))
        .on('error', reject);
    });
  }

  /**
   * 验证单行数据
   */
  private validateRow(row: TestCaseRow, rowNumber: number): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!row.title?.trim()) {
      errors.push({
        row: rowNumber,
        column: '用例标题',
        message: '用例标题不能为空',
      });
    }

    if (!row.steps?.trim()) {
      errors.push({
        row: rowNumber,
        column: '测试步骤',
        message: '测试步骤不能为空',
      });
    }

    if (!row.expectedResult?.trim()) {
      errors.push({
        row: rowNumber,
        column: '预期结果',
        message: '预期结果不能为空',
      });
    }

    if (!row.systemName?.trim()) {
      errors.push({
        row: rowNumber,
        column: '系统',
        message: '系统名称不能为空',
      });
    }

    if (!row.moduleName?.trim()) {
      errors.push({
        row: rowNumber,
        column: '功能模块',
        message: '功能模块不能为空',
      });
    }

    if (row.priority && !['LOW', 'MEDIUM', 'HIGH'].includes(row.priority)) {
      errors.push({
        row: rowNumber,
        column: '优先级',
        message: '优先级必须是LOW、MEDIUM或HIGH',
      });
    }

    if (row.status && !['PENDING', 'PASSED', 'FAILED', 'SKIPPED'].includes(row.status)) {
      errors.push({
        row: rowNumber,
        column: '状态',
        message: '状态必须是PENDING、PASSED、FAILED或SKIPPED',
      });
    }

    return errors;
  }

  /**
   * 处理导入
   */
  private async processImport(
    jobId: string,
    file: Express.Multer.File,
    conflictStrategy: string
  ): Promise<void> {
    const progress = this.progressMap.get(jobId)!;
    progress.status = 'processing';

    try {
      const rows = await this.parseFile(file);
      progress.total = rows.length;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        
        try {
          await this.importSingleTestCase(row, conflictStrategy);
          progress.success++;
        } catch (error) {
          progress.failed++;
          progress.errors.push({
            row: i + 2,
            column: '导入',
            message: error instanceof Error ? error.message : '导入失败',
          });
        }

        progress.processed = i + 1;

        // 每处理10条记录更新一次进度
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      progress.status = 'completed';
    } catch (error) {
      progress.status = 'failed';
      progress.errors.push({
        row: 0,
        column: '系统',
        message: error instanceof Error ? error.message : '导入失败',
      });
    }
  }

  /**
   * 导入单个测试用例
   */
  private async importSingleTestCase(
    row: TestCaseRow,
    conflictStrategy: string
  ): Promise<void> {
    return await prisma.$transaction(async (tx: any) => {
      // 查找或创建系统
      let systemId: number | null = null;
      if (row.systemName?.trim()) {
        const system = await tx.system.upsert({
          where: { name: row.systemName.trim() },
          update: {},
          create: { name: row.systemName.trim() },
        });
        systemId = system.id;
      }

      // 查找或创建模块
      let moduleId: number | null = null;
      if (row.moduleName?.trim() && systemId) {
        const module = await tx.module.upsert({
          where: { 
            name_systemId: { 
              name: row.moduleName.trim(), 
              systemId 
            } 
          },
          update: {},
          create: { 
            name: row.moduleName.trim(), 
            systemId 
          },
        });
        moduleId = module.id;
      }

      // 查找或创建场景
      let scenarioId: number | null = null;
      if (row.scenarioName?.trim() && moduleId) {
        const scenario = await tx.scenario.upsert({
          where: { 
            name_moduleId: { 
              name: row.scenarioName.trim(), 
              moduleId 
            } 
          },
          update: {},
          create: { 
            name: row.scenarioName.trim(), 
            moduleId 
          },
        });
        scenarioId = scenario.id;
      }

      // 检查是否已存在相同标题的用例
      const existing = await tx.testCase.findFirst({
        where: { title: row.title },
      });

      if (existing) {
        switch (conflictStrategy) {
          case 'skip':
            throw new Error(`用例"${row.title}"已存在，已跳过`);
          case 'overwrite':
            await tx.testCase.update({
              where: { id: existing.id },
              data: {
                title: row.title,
                preconditions: row.preconditions,
                steps: row.steps,
                expectedResult: row.expectedResult,
                priority: row.priority || 'MEDIUM',
                status: row.status || 'PENDING',
                tags: row.tags || [],
                systemId,
                moduleId,
                scenarioId,
              },
            });
            break;
          case 'new_version':
            await tx.testCase.create({
              data: {
                title: `${row.title} (副本)`,
                preconditions: row.preconditions,
                steps: row.steps,
                expectedResult: row.expectedResult,
                priority: row.priority || 'MEDIUM',
                status: row.status || 'PENDING',
                tags: row.tags || [],
                systemId,
                moduleId,
                scenarioId,
              },
            });
            break;
        }
      } else {
        await tx.testCase.create({
          data: {
            title: row.title,
            preconditions: row.preconditions,
            steps: row.steps,
            expectedResult: row.expectedResult,
            priority: row.priority || 'MEDIUM',
            status: row.status || 'PENDING',
            tags: row.tags || [],
            systemId,
            moduleId,
            scenarioId,
          },
        });
      }
    });
  }

  /**
   * 解析优先级
   */
  private parsePriority(value?: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (!value) return 'MEDIUM';
    const upper = value.toUpperCase();
    if (upper === 'LOW' || value === '低') return 'LOW';
    if (upper === 'HIGH' || value === '高') return 'HIGH';
    return 'MEDIUM';
  }

  /**
   * 解析状态
   */
  private parseStatus(value?: string): 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED' {
    if (!value) return 'PENDING';
    const upper = value.toUpperCase();
    if (upper === 'PASSED' || value === '已通过' || value === '通过') return 'PASSED';
    if (upper === 'FAILED' || value === '已失败' || value === '失败') return 'FAILED';
    if (upper === 'SKIPPED' || value === '已跳过' || value === '跳过') return 'SKIPPED';
    if (value === '待执行' || value === '待测试') return 'PENDING';
    return 'PENDING';
  }
}