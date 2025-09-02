import ExcelJS from 'exceljs';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { PrismaClient } from '../generated/prisma';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const prisma = new PrismaClient();

// 创建导入专用日志记录器
const importLogger = winston.createLogger({
  level: process.env['LOG_LEVEL'] || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/import-error.log', 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/import-combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  ]
});

// 如果是开发环境，也输出到控制台
if (process.env['NODE_ENV'] !== 'production') {
  importLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

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
  expectedResults?: string;
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
   * 批量导入测试用例（增强版，包含日志信息）
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

    importLogger.info('创建批量导入任务', {
      jobId,
      fileName: file.originalname,
      fileSize: file.size,
      conflictStrategy,
      timestamp: new Date().toISOString()
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
   * 解析Excel文件（跳过前两行：表头+示例行，标题为空时停止）
   */
  private async parseExcel(file: Express.Multer.File): Promise<TestCaseRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Excel文件中没有找到工作表');
    }
    const rows: TestCaseRow[] = [];

    importLogger.info('开始解析Excel文件', {
      fileName: file.originalname,
      fileSize: file.size,
      skipRows: 2
    });

    let stopParsing = false;

    worksheet.eachRow((row, rowNumber): void | boolean => {
      if (rowNumber <= 2 || stopParsing) return; // 跳过前两行（表头和示例行）或已停止

      const values = row.values as any[];
      
      // 检查是否有有效数据（至少有用例标题）
      // 注意：values[1]=A列序号，values[2]=B列用例标题
      const title = values[2]?.toString()?.trim(); // B列：用例标题
      if (!title || title === '') {
        importLogger.debug('检测到空标题，停止解析', {
          lastRowNumber: rowNumber,
          totalParsedRows: rows.length,
          title: title
        });
        stopParsing = true;
        return false; // 立即停止eachRow循环
      }

      // 修正字段映射，与模板列顺序完全一致
      // ExcelJS的values数组索引：values[1]=A列，values[2]=B列，以此类推
      const rowData = {
        title: values[2]?.toString()?.trim() || '',      // 用例标题 (B列)
        systemName: values[3]?.toString()?.trim(),       // 系统名称 (C列)
        moduleName: values[4]?.toString()?.trim(),       // 功能模块 (D列)
        scenarioName: values[5]?.toString()?.trim(),     // 功能场景 (E列)
        preconditions: values[6]?.toString()?.trim(),    // 前置条件 (F列)
        steps: values[7]?.toString()?.trim() || '',     // 测试步骤 (G列)
        expectedResult: values[8]?.toString()?.trim() || '', // 预期结果 (H列)
        status: this.parseStatus(values[9]?.toString()),      // 状态 (I列)
        priority: this.parsePriority(values[10]?.toString()),   // 优先级(J列)
        tags: values[11] ? values[11].toString().split(',').map((tag: string) => tag.trim()) : undefined, // 标签 (K列)
      };

      importLogger.debug('解析数据行', {
        originalRowNumber: rowNumber,
        effectiveRowNumber: rowNumber - 2,
        title: rowData.title,
        system: rowData.systemName,
        data: rowData
      });

      rows.push(rowData);
    });

    importLogger.info('Excel解析完成', {
        totalRows: worksheet.rowCount,
        skippedRows: 2,
        effectiveRows: rows.length,
        stopReason: stopParsing ? '空序号' : '文件结束'
      });

    return rows;
  }

  /**
   * 解析CSV文件（跳过前两行：表头+示例行，标题为空时停止）
   */
  private async parseCSV(file: Express.Multer.File): Promise<TestCaseRow[]> {
    return new Promise((resolve, reject) => {
      const rows: TestCaseRow[] = [];
      const buffer = Buffer.from(file.buffer);
      const stream = Readable.from(buffer);
      let rowIndex = 0;
      let emptyRowCount = 0;
      const maxEmptyRows = 5; // 允许连续5个空行后停止

      importLogger.info('开始解析CSV文件', {
        fileName: file.originalname,
        fileSize: file.size,
        skipRows: 2
      });

      stream
        .pipe(csv())
        .on('data', (data) => {
          rowIndex++;
          
          // 跳过前两行（表头和示例行）
          if (rowIndex <= 2) {
            importLogger.debug('跳过行', {
              rowNumber: rowIndex,
              data: data
            });
            return;
          }

          // 检查是否有有效数据（至少有用例标题）
          const title = data['用例标题'] || data.title || data['用例标题'] || '';
          if (!title || title.trim() === '') {
            emptyRowCount++;
            importLogger.debug('检测到空标题行', {
              originalRowNumber: rowIndex,
              title: title,
              emptyRowCount: emptyRowCount
            });
            
            // 如果连续遇到空行，停止解析
            if (emptyRowCount >= maxEmptyRows) {
              importLogger.info('检测到连续空行，停止解析', {
                lastRowNumber: rowIndex,
                totalParsedRows: rows.length
              });
              stream.destroy(); // 停止流
              return;
            }
            return; // 跳过当前空行
          }

          // 重置空行计数器
          emptyRowCount = 0;

          const rowData = {
            title: title.trim(),
            systemName: (data['系统'] || data.systemName || '').trim(),
            moduleName: (data['功能模块'] || data.moduleName || '').trim(),
            scenarioName: (data['功能场景'] || data.scenarioName || '').trim(),
            preconditions: (data['前置条件'] || data.preconditions || '').trim(),
            steps: (data['测试步骤'] || data.steps || '').trim(),
            expectedResult: (data['预期结果'] || data.expectedResult || '').trim(),
            priority: this.parsePriority(data['优先级'] || data.priority || '中'),
            status: this.parseStatus(data['状态'] || data.status || '待执行'),
            tags: data['标签'] || data.tags ? 
              (data['标签'] || data.tags)?.split(',').map((tag: string) => tag.trim()) : undefined,
          };

          importLogger.debug('解析数据行', {
            originalRowNumber: rowIndex,
            effectiveRowNumber: rowIndex - 2,
            title: rowData.title,
            system: rowData.systemName,
            data: rowData
          });

          rows.push(rowData);
        })
        .on('end', () => {
          importLogger.info('CSV解析完成', {
            totalRows: rowIndex,
            skippedRows: 2,
            effectiveRows: rows.length,
            stopReason: emptyRowCount >= 5 ? '连续空行' : '文件结束'
          });
          resolve(rows);
        })
        .on('error', (error) => {
          importLogger.error('CSV解析失败', { error: error.message });
          reject(error);
        });
    });
  }

  /**
   * 验证单行数据（优化版，只对真实数据行进行必要验证）
   */
  private validateRow(row: TestCaseRow, rowNumber: number): ValidationError[] {
    const errors: ValidationError[] = [];

    importLogger.debug('开始验证数据行', {
      rowNumber,
      rowData: row
    });

    // 如果标题为空，直接返回空错误数组，视为空行，不验证
    if (!row.title?.trim()) {
      importLogger.debug('跳过空标题行', { rowNumber });
      return errors;
    }

    // 优化验证逻辑：只对关键字段进行验证，允许部分字段为空
    // 只验证用例标题（必填）
    if (!row.title?.trim()) {
      const error = {
        row: rowNumber,
        column: '用例标题',
        message: '用例标题不能为空',
      };
      errors.push(error);
      importLogger.warn('验证失败', error);
    }

    // 其他字段允许为空，但记录警告
    if (!row.steps?.trim()) {
      importLogger.debug('测试步骤为空，允许导入', { rowNumber, title: row.title });
    }

    if (!row.expectedResult?.trim()) {
      importLogger.debug('预期结果为空，允许导入', { rowNumber, title: row.title });
    }

    if (!row.systemName?.trim()) {
      importLogger.debug('系统名称为空，允许导入', { rowNumber, title: row.title });
    }

    if (!row.moduleName?.trim()) {
      importLogger.debug('功能模块为空，允许导入', { rowNumber, title: row.title });
    }

    // 验证枚举值（如果提供了值）
    if (row.priority && !['LOW', 'MEDIUM', 'HIGH'].includes(row.priority)) {
      const error = {
        row: rowNumber,
        column: '优先级',
        message: `优先级必须是LOW、MEDIUM或HIGH，当前值: ${row.priority}`,
      };
      errors.push(error);
      importLogger.warn('验证失败', error);
    }

    if (row.status && !['PENDING', 'PASSED', 'FAILED', 'SKIPPED'].includes(row.status)) {
      const error = {
        row: rowNumber,
        column: '状态',
        message: `状态必须是PENDING、PASSED、FAILED或SKIPPED，当前值: ${row.status}`,
      };
      errors.push(error);
      importLogger.warn('验证失败', error);
    }

    if (errors.length === 0) {
      importLogger.debug('验证通过', { rowNumber, title: row.title });
    }

    return errors;
  }

  /**
   * 处理导入（增强版，包含详细日志）
   */
  private async processImport(
    jobId: string,
    file: Express.Multer.File,
    conflictStrategy: string
  ): Promise<void> {
    const progress = this.progressMap.get(jobId)!;
    progress.status = 'processing';

    importLogger.info('开始批量导入处理', {
      jobId,
      fileName: file.originalname,
      fileSize: file.size,
      conflictStrategy
    });

    try {
      const rows = await this.parseFile(file);
      progress.total = rows.length;

      importLogger.info('文件解析完成', {
        jobId,
        totalRows: rows.length,
        conflictStrategy
      });

      // 数据预览日志
      importLogger.info('数据预览', {
        jobId,
        previewData: rows.slice(0, 5).map(row => ({
          title: row.title,
          systemName: row.systemName,
          moduleName: row.moduleName
        }))
      });

      // 只处理有数据的有效行
      const validRows = rows.filter(row => row && row.title && row.title.trim());
      
      importLogger.info('开始处理有效数据行', {
        jobId,
        totalRows: rows.length,
        validRows: validRows.length
      });

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const effectiveRowNumber = i + 3; // 从第3行开始计算
        
        try {
          // 验证数据
          const validationErrors = this.validateRow(row!, effectiveRowNumber);
          if (validationErrors.length > 0) {
            progress.failed++;
            progress.errors.push(...validationErrors);
            importLogger.warn('数据验证失败', {
              jobId,
              rowNumber: effectiveRowNumber,
              errors: validationErrors
            });
            continue;
          }

          await this.importSingleTestCase(row!, conflictStrategy);
          progress.success++;
          importLogger.debug('导入成功', {
            jobId,
            rowNumber: effectiveRowNumber,
            title: row?.title || '未知标题'
          });
        } catch (error) {
          progress.failed++;
          const errorInfo = {
            row: effectiveRowNumber,
            column: '导入',
            message: error instanceof Error ? error.message : '导入失败',
          };
          progress.errors.push(errorInfo);
          importLogger.error('导入失败', {
            jobId,
            rowNumber: effectiveRowNumber,
            error: error instanceof Error ? error.message : '导入失败',
            rowData: {
              title: row?.title || '',
              systemName: row?.systemName || '',
              moduleName: row?.moduleName || ''
            }
          });
        }

        progress.processed = i + 1;

        // 每处理10条记录更新一次进度
        if (i % 10 === 0) {
          importLogger.debug('处理进度更新', {
            jobId,
            processed: progress.processed,
            success: progress.success,
            failed: progress.failed
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      progress.status = 'completed';
      
      importLogger.info('批量导入完成', {
        jobId,
        total: progress.total,
        validRows: validRows.length,
        success: progress.success,
        failed: progress.failed,
        errors: progress.errors
      });

    } catch (error) {
      progress.status = 'failed';
      const errorInfo = {
        row: 0,
        column: '系统',
        message: error instanceof Error ? error.message : '导入失败',
      };
      progress.errors.push(errorInfo);
      
      importLogger.error('批量导入失败', {
        jobId,
        error: error instanceof Error ? error.message : '导入失败',
        stack: error instanceof Error ? error.stack : undefined
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
    if (!row || !row.title) {
      throw new Error('测试用例数据不完整');
    }

    return await prisma.$transaction(async (tx: any) => {
      // 查找或创建系统
      let systemId: number | null = null;
      if (row.systemName?.trim()) {
        // 先查找现有系统
        let system = await tx.systems.findFirst({
          where: { name: row.systemName.trim() }
        });
        
        if (!system) {
          try {
            system = await tx.systems.create({
              data: { 
                name: row.systemName.trim(),
                updated_at: new Date()
              },
            });
          } catch (error) {
            // 如果创建失败（可能因为并发），再次查找
            system = await tx.systems.findFirst({
              where: { name: row.systemName.trim() }
            });
            if (!system) throw error;
          }
        }
        systemId = system.id;
      }

      // 查找或创建模块
      let moduleId: number | null = null;
      if (row.moduleName?.trim() && systemId) {
        let module = await tx.modules.findFirst({
          where: { 
            name: row.moduleName.trim(), 
            system_id: systemId 
          }
        });
        
        if (!module) {
          try {
            module = await tx.modules.create({
              data: { 
                name: row.moduleName.trim(), 
                system_id: systemId,
                updated_at: new Date()
              },
            });
          } catch (error) {
            module = await tx.modules.findFirst({
              where: { 
                name: row.moduleName.trim(), 
                system_id: systemId 
              }
            });
            if (!module) throw error;
          }
        }
        moduleId = module.id;
      }

      // 查找或创建场景
      let scenarioId: number | null = null;
      if (row.scenarioName?.trim() && moduleId) {
        let scenario = await tx.scenarios.findFirst({
          where: { 
            name: row.scenarioName.trim(), 
            module_id: moduleId 
          }
        });
        
        if (!scenario) {
          try {
            scenario = await tx.scenarios.create({
              data: { 
                name: row.scenarioName.trim(), 
                module_id: moduleId,
                updated_at: new Date()
              },
            });
          } catch (error) {
            scenario = await tx.scenarios.findFirst({
              where: { 
                name: row.scenarioName.trim(), 
                module_id: moduleId 
              }
            });
            if (!scenario) throw error;
          }
        }
        scenarioId = scenario.id;
      }

      // 检查是否已存在相同标题的用例
      const existing = await tx.test_cases.findFirst({
        where: { title: row.title },
      });

      if (existing) {
        switch (conflictStrategy) {
          case 'skip':
            throw new Error(`用例"${row.title}"已存在，已跳过`);
          case 'overwrite':
            await tx.test_cases.update({
              where: { id: existing.id },
              data: {
                title: row.title!,
                precondition: row.preconditions || '',
                steps: row.steps || '',
                expectedResults: row.expectedResult || row.expectedResults || '',
                priority: (row.priority || 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
                status: (row.status || 'PENDING') as 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED',
                source: 'manual',
                tags: row.tags || [],
                systemId: systemId,
                moduleId: moduleId,
                scenarioId: scenarioId,
                updated_at: new Date()
              },
            });
            break;
          case 'new_version':
            await tx.test_cases.create({
              data: {
                title: `${row.title} (副本)`,
                precondition: row.preconditions || '',
                steps: row.steps || '',
                expectedResults: row.expectedResult || row.expectedResults || '',
                priority: (row.priority || 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
                status: (row.status || 'PENDING') as 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED',
                source: 'manual',
                tags: row.tags || [],
                systemId: systemId,
                moduleId: moduleId,
                scenarioId: scenarioId,
                updated_at: new Date()
              },
            });
            break;
        }
      } else {
        await tx.test_cases.create({
              data: {
                title: row.title!,
                precondition: row.preconditions || '',
                steps: row.steps || '',
                expectedResults: row.expectedResult || row.expectedResults || '',
                priority: (row.priority || 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
                status: (row.status || 'PENDING') as 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED',
                source: 'manual',
                tags: row.tags || [],
                systemId: systemId,
                moduleId: moduleId,
                scenarioId: scenarioId,
                updated_at: new Date()
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