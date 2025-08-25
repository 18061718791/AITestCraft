import ExcelJS from 'exceljs';
import { systemService } from './systemService';

export interface TemplateField {
  name: string;
  description: string;
  required: boolean;
  example: string;
  options?: string[];
}

export class TemplateService {
  private readonly fields: TemplateField[] = [
    {
      name: '序号',
      description: '测试用例的唯一标识序号，建议使用连续数字',
      required: true,
      example: '1'
    },
    {
      name: '用例标题',
      description: '简洁明了的测试用例标题，概括测试目的',
      required: true,
      example: '用户登录功能验证'
    },
    {
      name: '系统',
      description: '测试用例所属的系统名称',
      required: true,
      example: '用户管理系统'
    },
    {
      name: '功能模块',
      description: '测试用例所属的功能模块名称',
      required: true,
      example: '登录模块'
    },
    {
      name: '功能场景',
      description: '测试用例所属的具体功能场景',
      required: false,
      example: '密码登录'
    },
    {
      name: '前置条件',
      description: '执行测试用例前需要满足的条件',
      required: false,
      example: '用户已注册账号，网络连接正常'
    },
    {
      name: '测试步骤',
      description: '详细的测试操作步骤，按序号分行',
      required: true,
      example: '1. 打开登录页面\n2. 输入正确的用户名和密码\n3. 点击登录按钮'
    },
    {
      name: '预期结果',
      description: '执行测试步骤后的预期输出或系统行为',
      required: true,
      example: '成功登录系统，跳转到用户首页'
    },
    {
      name: '标签',
      description: '测试用例的标签，多个标签用逗号分隔',
      required: false,
      example: '登录,功能测试,正向测试'
    },
    {
      name: '状态',
      description: '测试用例的执行状态',
      required: true,
      example: '待执行',
      options: ['待执行', '已通过', '已失败', '已跳过']
    },
    {
      name: '优先级',
      description: '测试用例的优先级，用于测试执行的排序',
      required: true,
      example: '高',
      options: ['低', '中', '高']
    }
  ];

  /**
   * 创建Excel模板文件
   */
  async createExcelTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    // 获取系统层级数据
    const systemData = await systemService.getSystemHierarchy();
    
    // 创建数据工作表（用于下拉列表）
    const dataSheet = workbook.addWorksheet('数据');
    this.createDataSheet(dataSheet, systemData);
    
    // 创建模板工作表
    const templateSheet = workbook.addWorksheet('模板');
    await this.createDynamicTemplateSheet(templateSheet, systemData);
    
    // 创建填写说明工作表
    const instructionSheet = workbook.addWorksheet('填写说明');
    this.createInstructionSheet(instructionSheet);
    
    return Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);
  }

  /**
   * 创建数据工作表（用于下拉列表数据源）
   */
  private createDataSheet(sheet: ExcelJS.Worksheet, systemData: any): void {
    let rowIndex = 1;
    
    // 系统数据区域
    sheet.addRow(['系统列表']);
    const systemHeaderRow = sheet.getRow(rowIndex++);
    systemHeaderRow.font = { bold: true };
    
    systemData.systems.forEach((system: any) => {
      sheet.addRow([system.name]);
      rowIndex++;
    });
    
    // 添加空行分隔
    rowIndex += 2;
    
    // 模块数据区域
    sheet.addRow(['系统名称', '模块列表']);
    const moduleHeaderRow = sheet.getRow(rowIndex++);
    moduleHeaderRow.font = { bold: true };
    
    systemData.systems.forEach((system: any) => {
      system.modules.forEach((module: any) => {
        sheet.addRow([system.name, module.name]);
        rowIndex++;
      });
    });
    
    // 添加空行分隔
    rowIndex += 2;
    
    // 场景数据区域
    sheet.addRow(['模块名称', '场景列表']);
    const scenarioHeaderRow = sheet.getRow(rowIndex++);
    scenarioHeaderRow.font = { bold: true };
    
    systemData.systems.forEach((system: any) => {
      system.modules.forEach((module: any) => {
        module.scenarios.forEach((scenario: any) => {
          sheet.addRow([module.name, scenario.name]);
          rowIndex++;
        });
      });
    });
    
    // 设置列宽
    sheet.getColumn(1).width = 20;
    sheet.getColumn(2).width = 20;
    
    // 隐藏数据工作表
    sheet.state = 'veryHidden';
  }

  /**
   * 创建动态模板工作表（带下拉列表）
   */
  private async createDynamicTemplateSheet(sheet: ExcelJS.Worksheet, systemData: any): Promise<void> {
    // 设置表头
    const headers = this.fields.map(field => field.name);
    sheet.addRow(headers);
    
    // 设置表头样式
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 12 };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // 设置边框
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // 添加示例行
    const exampleData = this.fields.map(field => field.example);
    const exampleRow = sheet.addRow(exampleData);
    
    // 设置示例行样式
    exampleRow.font = { italic: true, color: { argb: 'FF666666' } };
    exampleRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F5F5' }
    };
    
    // 设置列宽
    const columnWidths = [8, 30, 20, 20, 20, 30, 50, 50, 20, 12, 8];
    columnWidths.forEach((width, index) => {
      sheet.getColumn(index + 1).width = width;
    });
    
    // 设置行高
    sheet.getRow(1).height = 25;
    sheet.getRow(2).height = 60;
    
    // 设置单元格格式
    sheet.getRow(2).alignment = {
      vertical: 'top',
      horizontal: 'left',
      wrapText: true
    };
    
    // 获取系统名称列表用于系统列下拉
    const systemNames = systemData.systems.map((system: any) => system.name);
    
    // 设置系统列下拉列表（C列，索引3）
    const systemCol = sheet.getColumn(3);
    systemCol.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber > 1) { // 跳过表头行
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${systemNames.join(',')}"`]
        };
      }
    });
    
    // 收集所有模块名称用于模块列下拉
    const allModuleNames: string[] = [];
    systemData.systems.forEach((system: any) => {
      system.modules.forEach((module: any) => {
        if (!allModuleNames.includes(module.name)) {
          allModuleNames.push(module.name);
        }
      });
    });
    
    // 设置功能模块列下拉（D列，索引4）
    const moduleCol = sheet.getColumn(4);
    moduleCol.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber > 1) { // 跳过表头行
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${allModuleNames.join(',')}"`]
        };
      }
    });
    
    // 收集所有场景名称用于场景列下拉
    const allScenarioNames: string[] = [];
    systemData.systems.forEach((system: any) => {
      system.modules.forEach((module: any) => {
        module.scenarios.forEach((scenario: any) => {
          if (!allScenarioNames.includes(scenario.name)) {
            allScenarioNames.push(scenario.name);
          }
        });
      });
    });
    
    // 设置功能场景列下拉（E列，索引5）
    const scenarioCol = sheet.getColumn(5);
    scenarioCol.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber > 1) { // 跳过表头行
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${allScenarioNames.join(',')}"`]
        };
      }
    });
    
    // 设置状态列下拉（J列，索引10）
    const statusOptions = ['待测试', '通过', '失败'];
    const statusCol = sheet.getColumn(10);
    statusCol.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber > 1) { // 跳过表头行
        cell.dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`"${statusOptions.join(',')}"`]
        };
        
        // 设置默认值为"待测试"
        if (!cell.value) {
          cell.value = '待测试';
        }
      }
    });
    
    // 设置优先级列下拉（K列，索引11）
    const priorityOptions = ['低', '中', '高'];
    const priorityCol = sheet.getColumn(11);
    priorityCol.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber > 1) { // 跳过表头行
        cell.dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`"${priorityOptions.join(',')}"`]
        };
        
        // 设置默认值为"中"
        if (!cell.value) {
          cell.value = '中';
        }
      }
    });
  }



  /**
   * 创建填写说明工作表
   */
  private createInstructionSheet(sheet: ExcelJS.Worksheet): void {
    // 设置标题
    sheet.mergeCells('A1:C1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = '测试用例批量导入模板填写说明';
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    
    // 设置表头
    const headers = ['字段名称', '是否必填', '填写说明'];
    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // 添加字段说明
    this.fields.forEach((field) => {
      const row = sheet.addRow([
        field.name,
        field.required ? '是' : '否',
        `${field.description}${field.options ? `\n选项：${field.options.join(', ')}` : ''}`
      ]);
      
      // 设置必填字段样式
      if (field.required) {
        row.getCell(2).font = { bold: true, color: { argb: 'FFFF0000' } };
      }
      
      // 设置换行
      row.getCell(3).alignment = {
        vertical: 'top',
        horizontal: 'left',
        wrapText: true
      };
      
      row.height = 40;
    });
    
    // 设置列宽
    sheet.getColumn(1).width = 15;
    sheet.getColumn(2).width = 10;
    sheet.getColumn(3).width = 60;
    
    // 添加额外说明
    const additionalInfo = [
      '',
      '注意事项：',
      '1. 请勿修改工作表名称',
      '2. 请勿删除表头行',
      '3. 请按照示例格式填写',
      '4. 导入时系统会自动跳过示例行',
      '5. 日期格式请使用 YYYY-MM-DD',
      '6. 多值字段请用逗号分隔'
    ];
    
    additionalInfo.forEach(info => {
      const row = sheet.addRow([info, '', '']);
      if (info.startsWith('注意事项') || info.startsWith('1.') || info.startsWith('2.')) {
        row.getCell(1).font = { bold: true };
      }
    });
    
    // 设置边框
    const dataRange = sheet.getCell('A3').address + ':' + sheet.getCell(`C${this.fields.length + 3}`).address;
    sheet.getCell(dataRange).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  }
}