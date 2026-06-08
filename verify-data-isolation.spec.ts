import { test, expect } from '@playwright/test';

test('验证testuser用户数据隔离', async ({ page }) => {
  // 1. 打开登录页面
  await page.goto('http://localhost:5000');
  await page.waitForTimeout(2000);

  // 2. 填写登录信息
  await page.fill('input[placeholder="请输入用户名"]', 'testuser');
  await page.fill('input[placeholder="请输入密码"]', '111111');

  // 3. 点击登录按钮
  await page.click('button:has-text("登 录")');

  // 4. 等待登录成功
  await page.waitForTimeout(3000);

  // 5. 验证登录成功 - 检查是否跳转到首页
  const currentUrl = page.url();
  console.log('当前URL:', currentUrl);

  // 6. 导航到用例管理页面
  await page.goto('http://localhost:5000/testcases');
  await page.waitForTimeout(3000);

  // 7. 检查用例列表是否为空
  const pageContent = await page.content();

  // 检查是否有用例数据
  const hasTestCases = await page.locator('.ant-table-row').count();
  console.log('用例数量:', hasTestCases);

  // 检查是否显示"暂无数据"
  const hasEmptyText = await page.locator('text=暂无数据').count();
  console.log('是否显示暂无数据:', hasEmptyText > 0);

  // 8. 导航到缺陷管理页面
  await page.goto('http://localhost:5000/defects');
  await page.waitForTimeout(3000);

  // 9. 检查缺陷列表
  const defectRows = await page.locator('.ant-table-row').count();
  console.log('缺陷数量:', defectRows);

  const defectEmpty = await page.locator('text=暂无缺陷数据').count();
  console.log('是否显示暂无缺陷数据:', defectEmpty > 0);

  // 10. 导航到应用管理页面
  await page.goto('http://localhost:5000/applications');
  await page.waitForTimeout(3000);

  // 11. 检查应用列表
  const appRows = await page.locator('.ant-table-row').count();
  console.log('应用数量:', appRows);

  const appEmpty = await page.locator('text=暂无数据').count();
  console.log('应用是否显示暂无数据:', appEmpty > 0);

  // 截图保存
  await page.screenshot({ path: 'verification-result.png', fullPage: true });

  // 断言验证
  expect(hasTestCases).toBe(0); // 用例列表应该为空
  expect(defectRows).toBe(0); // 缺陷列表应该为空
  expect(appRows).toBe(0); // 应用列表应该为空
});
