/**
 * 测试用例生成脚本
 * 基于PRD文档生成标准化的测试用例Excel文件
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// 测试用例数据结构
const testCaseTemplate = {
  id: '',
  module: '',
  feature: '',
  title: '',
  precondition: '',
  steps: '',
  testData: '',
  expected: '',
  priority: '',
  type: '',
  automated: '',
  remark: ''
};

// 测试用例数据定义
const testCasesData = {
  // 测试用例管理模块
  '测试用例管理': [
    // 功能测试用例
    {
      id: 'TC-TCM-001',
      module: '测试用例管理',
      feature: '用例列表查看',
      title: '验证按系统-模块-场景三级树形结构浏览用例',
      precondition: '系统已创建测试数据，包含系统、模块、场景',
      steps: '1. 登录系统\n2. 进入测试用例管理页面\n3. 点击左侧树形结构的系统节点\n4. 展开模块节点\n5. 点击场景节点',
      testData: '系统：测试系统A\n模块：登录模块\n场景：正常登录',
      expected: '1. 页面正常加载\n2. 左侧显示三级树形结构\n3. 点击节点后右侧显示对应用例列表\n4. 用例数据正确显示',
      priority: 'P0',
      type: '功能',
      automated: '是',
      remark: '核心功能'
    },
    {
      id: 'TC-TCM-002',
      module: '测试用例管理',
      feature: '用例列表查看',
      title: '验证按状态筛选用例功能',
      precondition: '系统中存在不同状态的测试用例',
      steps: '1. 进入测试用例管理页面\n2. 点击状态筛选下拉框\n3. 选择"已通过"状态\n4. 点击筛选按钮',
      testData: '筛选条件：状态=已通过',
      expected: '1. 筛选器正常展开\n2. 列表只显示状态为"已通过"的用例\n3. 用例数量与筛选条件匹配',
      priority: 'P1',
      type: '功能',
      automated: '是',
      remark: ''
    },
    {
      id: 'TC-TCM-003',
      module: '测试用例管理',
      feature: '用例列表查看',
      title: '验证关键词搜索功能',
      precondition: '系统中存在多个测试用例',
      steps: '1. 进入测试用例管理页面\n2. 在搜索框输入关键词"登录"\n3. 点击搜索按钮',
      testData: '关键词：登录',
      expected: '1. 搜索框接受输入\n2. 列表显示标题包含"登录"的用例\n3. 搜索结果准确',
      priority: 'P1',
      type: '功能',
      automated: '是',
      remark: ''
    },
    {
      id: 'TC-TCM-004',
      module: '测试用例管理',
      feature: '用例创建',
      title: '验证创建新的测试用例成功',
      precondition: '用户已登录，有创建权限',
      steps: '1. 点击"新建"按钮\n2. 填写用例标题：测试登录功能\n3. 填写前置条件：系统正常运行\n4. 填写测试步骤：1.打开页面 2.输入用户名密码\n5. 填写预期结果：登录成功\n6. 选择优先级：P0\n7. 选择所属系统、模块、场景\n8. 点击保存',
      testData: '标题：测试登录功能\n前置条件：系统正常运行\n步骤：输入用户名密码\n预期结果：登录成功\n优先级：P0',
      expected: '1. 表单验证通过\n2. 用例保存成功\n3. 提示"保存成功"\n4. 列表自动刷新显示新用例',
      priority: 'P0',
      type: '功能',
      automated: '是',
      remark: '核心功能'
    },
    {
      id: 'TC-TCM-005',
      module: '测试用例管理',
      feature: '用例创建',
      title: '验证创建用例时必填项校验',
      precondition: '用户已登录，有创建权限',
      steps: '1. 点击"新建"按钮\n2. 只填写用例标题\n3. 直接点击保存',
      testData: '标题：测试用例\n其他字段：空',
      expected: '1. 表单验证失败\n2. 未填写的必填项显示红色提示\n3. 用例未保存\n4. 提示"请填写必填项"',
      priority: 'P1',
      type: '异常',
      automated: '是',
      remark: ''
    },
    {
      id: 'TC-TCM-006',
      module: '测试用例管理',
      feature: '用例创建',
      title: '验证用例标题长度边界值-最大长度',
      precondition: '用户已登录',
      steps: '1. 点击"新建"按钮\n2. 输入255个字符的标题\n3. 填写其他必填项\n4. 点击保存',
      testData: '标题：a重复255次\n其他：正常数据',
      expected: '1. 标题输入框接受255个字符\n2. 表单验证通过\n3. 用例保存成功',
      priority: 'P2',
      type: '边界',
      automated: '是',
      remark: '边界值测试'
    },
    {
      id: 'TC-TCM-007',
      module: '测试用例管理',
      feature: '用例创建',
      title: '验证用例标题长度边界值-超过最大长度',
      precondition: '用户已登录',
      steps: '1. 点击"新建"按钮\n2. 输入256个字符的标题\n3. 填写其他必填项\n4. 点击保存',
      testData: '标题：a重复256次',
      expected: '1. 标题输入框限制输入256个字符，或\n2. 表单验证失败，提示"标题长度不能超过255个字符"',
      priority: 'P2',
      type: '边界',
      automated: '是',
      remark: '边界值测试'
    },
    {
      id: 'TC-TCM-008',
      module: '测试用例管理',
      feature: '用例编辑',
      title: '验证编辑测试用例成功',
      precondition: '系统中存在已创建的测试用例',
      steps: '1. 在列表中选择一个用例\n2. 点击"编辑"按钮\n3. 修改用例标题\n4. 修改测试步骤\n5. 点击保存',
      testData: '原标题：旧标题\n新标题：修改后的标题',
      expected: '1. 编辑页面加载正确，显示原数据\n2. 修改后保存成功\n3. 提示"更新成功"\n4. 列表显示更新后的数据',
      priority: 'P0',
      type: '功能',
      automated: '是',
      remark: '核心功能'
    },
    {
      id: 'TC-TCM-009',
      module: '测试用例管理',
      feature: '用例删除',
      title: '验证删除测试用例成功（软删除）',
      precondition: '系统中存在已创建的测试用例',
      steps: '1. 在列表中选择一个用例\n2. 点击"删除"按钮\n3. 确认删除',
      testData: '用例ID：存在的用例ID',
      expected: '1. 弹出确认对话框\n2. 确认后用例从列表消失\n3. 提示"删除成功"\n4. 数据库中该用例的deleted_at字段被赋值',
      priority: 'P1',
      type: '功能',
      automated: '是',
      remark: ''
    },
    {
      id: 'TC-TCM-010',
      module: '测试用例管理',
      feature: 'AI生成用例',
      title: '验证AI生成测试用例功能',
      precondition: 'DeepSeek API配置正确，网络正常',
      steps: '1. 进入AI测试用例生成页面\n2. 输入需求描述：用户登录功能，需要验证用户名密码正确性、验证码功能\n3. 点击"生成"按钮\n4. 等待AI响应',
      testData: '需求描述：用户登录功能，需要验证用户名密码正确性、验证码功能',
      expected: '1. 输入框接受多行文本\n2. 点击生成后显示加载状态\n3. AI返回测试点和测试用例\n4. 结果以结构化方式展示',
      priority: 'P0',
      type: '功能',
      automated: '否',
      remark: '依赖AI服务'
    },
    {
      id: 'TC-TCM-011',
      module: '测试用例管理',
      feature: 'AI生成用例',
      title: '验证AI生成结果选择性保存',
      precondition: 'AI已生成测试用例',
      steps: '1. AI生成用例后\n2. 勾选部分生成的用例\n3. 点击"保存选中"按钮\n4. 选择所属系统/模块/场景\n5. 确认保存',
      testData: '选中用例：第1条和第3条',
      expected: '1. 可以勾选/取消勾选用例\n2. 只保存选中的用例\n3. 保存成功后提示\n4. 保存的用例出现在列表中',
      priority: 'P1',
      type: '功能',
      automated: '否',
      remark: ''
    },
    {
      id: 'TC-TCM-012',
      module: '测试用例管理',
      feature: '导入导出',
      title: '验证下载导入模板功能',
      precondition: '用户已登录',
      steps: '1. 进入测试用例管理页面\n2. 点击"导入"按钮\n3. 点击"下载模板"',
      testData: '无',
      expected: '1. 模板文件下载成功\n2. 文件格式为.xlsx\n3. 模板包含所有必填字段的表头',
      priority: 'P1',
      type: '功能',
      automated: '是',
      remark: ''
    },
    {
      id: 'TC-TCM-013',
      module: '测试用例管理',
      feature: '导入导出',
      title: '验证批量导入测试用例成功',
      precondition: '已准备好符合模板的Excel文件',
      steps: '1. 点击"导入"按钮\n2. 选择Excel文件\n3. 点击"上传"\n4. 等待解析完成\n5. 确认导入',
      testData: 'Excel文件：包含5条有效用例数据',
      expected: '1. 文件选择框正常\n2. 上传后显示数据预览\n3. 数据验证通过\n4. 导入成功后提示"导入5条用例成功"\n5. 列表显示新导入的用例',
      priority: 'P1',
      type: '功能',
      automated: '是',
      remark: ''
    },
    {
      id: 'TC-TCM-014',
      module: '测试用例管理',
      feature: '导入导出',
      title: '验证批量导入时数据校验-必填项缺失',
      precondition: '已准备Excel文件，部分数据缺少必填项',
      steps: '1. 点击"导入"按钮\n2. 选择包含无效数据的Excel文件\n3. 点击"上传"',
      testData: 'Excel文件：包含2条缺少标题的用例',
      expected: '1. 数据验证失败\n2. 显示错误提示，指出第几行缺少必填项\n3. 不允许导入\n4. 提示用户修正后重试',
      priority: 'P2',
      type: '异常',
      automated: '是',
      remark: ''
    },
    {
      id: 'TC-TCM-015',
      module: '测试用例管理',
      feature: '导入导出',
      title: '验证批量导出测试用例',
      precondition: '系统中存在测试用例',
      steps: '1. 选择部分用例（勾选）\n2. 点击"导出"按钮\n3. 选择导出格式（Excel）\n4. 确认导出',
      testData: '选中用例：3条',
      expected: '1. 可以勾选要导出的用例\n2. 导出文件下载成功\n3. Excel文件内容与原数据一致\n4. 文件格式正确',
      priority: 'P1',
      type: '功能',
      automated: '是',
      remark: ''
    },
    // UI测试用例
    {
      id: 'TC-TCM-016',
      module: '测试用例管理',
      feature: '界面布局',
      title: '验证测试用例管理页面布局正确性',
      precondition: '用户已登录',
      steps: '1. 进入测试用例管理页面\n2. 观察页面布局',
      testData: '屏幕分辨率：1920x1080',
      expected: '1. 左侧树形导航宽度适中\n2. 右侧表格占据主要区域\n3. 操作按钮位置合理\n4. 无元素重叠或错位',
      priority: 'P2',
      type: 'UI',
      automated: '否',
      remark: '需要人工确认'
    },
    {
      id: 'TC-TCM-017',
      module: '测试用例管理',
      feature: '响应式布局',
      title: '验证页面在不同分辨率下的显示效果',
      precondition: '用户已登录',
      steps: '1. 调整浏览器窗口大小为1366x768\n2. 观察页面布局\n3. 调整浏览器窗口大小为1920x1080\n4. 观察页面布局',
      testData: '分辨率：1366x768, 1920x1080',
      expected: '1. 页面元素自适应调整\n2. 无水平滚动条（正常情况）\n3. 功能按钮可正常点击\n4. 文字无截断',
      priority: 'P2',
      type: 'UI',
      automated: '否',
      remark: ''
    },
    {
      id: 'TC-TCM-018',
      module: '测试用例管理',
      feature: '加载状态',
      title: '验证数据加载时的Loading状态显示',
      precondition: '网络正常',
      steps: '1. 进入测试用例管理页面\n2. 观察数据加载过程',
      testData: '无',
      expected: '1. 数据加载前显示Loading动画\n2. 加载完成后Loading消失\n3. 数据正常显示',
      priority: 'P2',
      type: 'UI',
      automated: '是',
      remark: ''
    },
    {
      id: 'TC-TCM-019',
      module: '测试用例管理',
      feature: '空数据状态',
      title: '验证无数据时的空状态显示',
      precondition: '系统无测试用例数据',
      steps: '1. 进入测试用例管理页面',
      testData: '无',
      expected: '1. 显示空状态插图和提示文字\n2. 提示"暂无数据，点击新建按钮创建"\n3. 新建按钮可点击',
      priority: 'P2',
      type: 'UI',
      automated: '是',
      remark: ''
    },
    {
      id: 'TC-TCM-020',
      module: '测试用例管理',
      feature: '分页功能',
      title: '验证分页功能正确性',
      precondition: '系统中测试用例数量>20条',
      steps: '1. 进入测试用例管理页面\n2. 观察分页控件\n3. 点击第2页\n4. 点击下一页',
      testData: '用例总数：50条',
      expected: '1. 分页控件显示正确（共3页）\n2. 第1页显示1-20条\n3. 点击第2页显示21-40条\n4. 页码切换正常',
      priority: 'P1',
      type: '功能',
      automated: '是',
      remark: ''
    }
  ]
};

// 生成Excel文件
async function generateExcel(moduleName, testCases, outputDir) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(moduleName);
  
  // 设置列宽
  worksheet.columns = [
    { header: '用例ID', key: 'id', width: 15 },
    { header: '模块', key: 'module', width: 15 },
    { header: '功能点', key: 'feature', width: 15 },
    { header: '用例标题', key: 'title', width: 40 },
    { header: '前置条件', key: 'precondition', width: 30 },
    { header: '测试步骤', key: 'steps', width: 40 },
    { header: '测试数据', key: 'testData', width: 30 },
    { header: '预期结果', key: 'expected', width: 40 },
    { header: '优先级', key: 'priority', width: 10 },
    { header: '用例类型', key: 'type', width: 12 },
    { header: '是否自动化', key: 'automated', width: 12 },
    { header: '备注', key: 'remark', width: 20 }
  ];
  
  // 设置表头样式
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  
  // 添加数据
  testCases.forEach((tc, index) => {
    const row = worksheet.addRow(tc);
    
    // 设置行高
    row.height = 60;
    
    // 设置单元格样式
    row.alignment = { 
      vertical: 'top', 
      horizontal: 'left',
      wrapText: true 
    };
    
    // 根据优先级设置颜色
    const priorityCell = row.getCell(9);
    if (tc.priority === 'P0') {
      priorityCell.font = { color: { argb: 'FFFF0000' }, bold: true };
    } else if (tc.priority === 'P1') {
      priorityCell.font = { color: { argb: 'FFFFA500' } };
    }
    
    // 根据类型设置颜色
    const typeCell = row.getCell(10);
    if (tc.type === '异常') {
      typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E1' } };
    } else if (tc.type === '边界') {
      typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0E0' } };
    }
  });
  
  // 添加边框
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });
  
  // 冻结首行
  worksheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: 1 }
  ];
  
  // 保存文件
  const fileName = `测试用例_${moduleName}.xlsx`;
  const filePath = path.join(outputDir, fileName);
  await workbook.xlsx.writeFile(filePath);
  console.log(`✅ 已生成：${fileName}`);
  
  return filePath;
}

// 生成统计信息
function generateStatistics(testCases) {
  const stats = {
    total: testCases.length,
    byPriority: { 'P0': 0, 'P1': 0, 'P2': 0, 'P3': 0 },
    byType: { '功能': 0, '边界': 0, '异常': 0, 'UI': 0 }
  };
  
  testCases.forEach(tc => {
    if (stats.byPriority[tc.priority] !== undefined) {
      stats.byPriority[tc.priority]++;
    }
    if (stats.byType[tc.type] !== undefined) {
      stats.byType[tc.type]++;
    }
  });
  
  return stats;
}

// 主函数
async function main() {
  const outputDir = path.join(__dirname, '..', 'test-cases');
  
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('🚀 开始生成测试用例Excel文件...\n');
  
  const results = [];
  
  // 为每个模块生成Excel
  for (const [moduleName, testCases] of Object.entries(testCasesData)) {
    try {
      const filePath = await generateExcel(moduleName, testCases, outputDir);
      const stats = generateStatistics(testCases);
      results.push({ moduleName, filePath, stats });
    } catch (error) {
      console.error(`❌ 生成 ${moduleName} 测试用例失败:`, error.message);
    }
  }
  
  // 打印统计信息
  console.log('\n📊 生成统计：');
  console.log('='.repeat(60));
  results.forEach(({ moduleName, stats }) => {
    console.log(`\n📁 ${moduleName}:`);
    console.log(`   总计：${stats.total} 条用例`);
    console.log(`   优先级分布：P0(${stats.byPriority['P0']}) P1(${stats.byPriority['P1']}) P2(${stats.byPriority['P2']}) P3(${stats.byPriority['P3']})`);
    console.log(`   类型分布：功能(${stats.byType['功能']}) 边界(${stats.byType['边界']}) 异常(${stats.byType['异常']}) UI(${stats.byType['UI']})`);
  });
  
  console.log('\n✨ 测试用例生成完成！');
  console.log(`📂 输出目录：${outputDir}`);
}

// 执行
main().catch(console.error);
