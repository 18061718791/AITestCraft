import ExcelJS from 'exceljs';

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
      name: '系统名称',
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
      example: '用户已注册账号'
    },
    {
      name: '测试步骤',
      description: '详细的测试操作步骤，按序号分行',
      required: true,
      example: '1. 打开登录页面\n2. 输入用户名和密码\n3. 点击登录'
    },
    {
      name: '预期结果',
      description: '执行测试步骤后的预期输出或系统行为',
      required: true,
      example: '成功登录系统，跳转到首页'
    },
    {
      name: '状态',
      description: '测试用例的执行状态',
      required: true,
      example: '待测试',
      options: ['待测试', '已通过', '已失败', '已跳过']
    },
    {
      name: '优先级',
      description: '测试用例的优先级，用于测试执行的排序',
      required: true,
      example: '高',
      options: ['低', '中', '高']
    },
    {
      name: '标签',
      description: '测试用例的标签，用于分类和筛选',
      required: false,
      example: '登录,功能测试,正向测试'
    }
  ];

  /**
   * 创建Excel模板文件
   */
  async createExcelTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    // 创建简洁的模板工作表（与correct-template.xlsx一致）
    const templateSheet = workbook.addWorksheet('模板');
    await this.createSimpleTemplateSheet(templateSheet);
    
    return Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);
  }





  /**
   * 创建简洁模板工作表（与correct-template.xlsx一致）
   */
  private async createSimpleTemplateSheet(sheet: ExcelJS.Worksheet): Promise<void> {
    // 设置表头
    const headers = this.fields.map(field => field.name);
    sheet.addRow(headers);
    
    // 设置表头样式（蓝色底色）
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 11 };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' } // 蓝色底色
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
    exampleRow.font = { size: 11 };
    exampleRow.alignment = {
      vertical: 'top',
      horizontal: 'left',
      wrapText: true
    };
    
    // 设置列宽
    const columnWidths = [8, 30, 20, 20, 20, 30, 50, 50, 12, 8, 20];
    columnWidths.forEach((width, index) => {
      sheet.getColumn(index + 1).width = width;
    });
    
    // 设置行高
    sheet.getRow(1).height = 20;
    sheet.getRow(2).height = 40;
  }


}