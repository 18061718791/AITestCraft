const { chromium } = require('playwright');

(async () => {
  console.log('🚀 启动浏览器验证修复效果...');
  
  const browser = await chromium.launch({
    executablePath: 'C:\\Users\\shi_binbin\\AppData\\Local\\ms-playwright\\chromium-1187\\chrome-win\\chrome.exe',
    headless: false,
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  console.log('📱 打开平台: http://localhost:5175/');
  await page.goto('http://localhost:5175/');
  await page.waitForLoadState('networkidle');
  
  await page.waitForTimeout(3000);
  
  // 截图
  await page.screenshot({ path: 'platform-fixed.png', fullPage: true });
  console.log('📸 截图已保存: platform-fixed.png');
  
  // 检查 main-content 实际宽度
  const mainContentWidth = await page.evaluate(() => {
    const el = document.querySelector('.main-content');
    if (el) {
      const style = window.getComputedStyle(el);
      return {
        maxWidth: style.maxWidth,
        width: style.width,
        margin: style.margin
      };
    }
    return '未找到 .main-content';
  });
  console.log('📐 主内容实际样式:', JSON.stringify(mainContentWidth, null, 2));
  
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('\n📃 页面内容预览:');
  console.log(bodyText.substring(0, 300));
  
  console.log('\n✅ 验证完成，请查看浏览器窗口');
  
})();
