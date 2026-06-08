#!/usr/bin/env python3
"""
使用 browser-harness skill 完整探索平台
包括登录、导航、截图等功能
"""

import asyncio
import json
import requests
import subprocess
import time
import os
import base64
from cdp_use import CDPClient

# 全局变量
CLIENT = None
TARGET_ID = None
SESSION_ID = None

async def send_to_session(method, params=None):
    """发送 CDP 命令到页面 session"""
    if params is None:
        params = {}
    params["sessionId"] = SESSION_ID
    return await CLIENT.send_raw(method, params)

async def navigate_to(url):
    """导航到指定 URL"""
    print(f"🌐 导航到: {url}")
    # 使用 Target.createTarget 创建新标签页
    target = await CLIENT.send_raw("Target.createTarget", {"url": url})
    global TARGET_ID
    TARGET_ID = target.get("targetId")
    await asyncio.sleep(3)
    
    # 附加到目标页面
    session = await CLIENT.send_raw("Target.attachToTarget", {
        "targetId": TARGET_ID,
        "flatten": True
    })
    global SESSION_ID
    SESSION_ID = session.get("sessionId")
    print(f"✅ 已附加到页面, Session ID: {SESSION_ID}")
    return TARGET_ID

async def get_page_info():
    """获取页面基本信息"""
    try:
        # 获取页面标题
        result = await send_to_session("Runtime.evaluate", {
            "expression": "document.title",
            "returnByValue": True
        })
        title = result.get("result", {}).get("value", "Unknown")
        
        # 获取当前 URL
        result = await send_to_session("Runtime.evaluate", {
            "expression": "window.location.href",
            "returnByValue": True
        })
        url = result.get("result", {}).get("value", "Unknown")
        
        return {"title": title, "url": url}
    except Exception as e:
        print(f"⚠️ 获取页面信息失败: {e}")
        return {"title": "Unknown", "url": "Unknown"}

async def get_page_content():
    """获取页面文本内容"""
    try:
        result = await send_to_session("Runtime.evaluate", {
            "expression": "document.body.innerText",
            "returnByValue": True
        })
        return result.get("result", {}).get("value", "")
    except Exception as e:
        print(f"⚠️ 获取页面内容失败: {e}")
        return ""

async def find_element_by_selector(selector):
    """通过 CSS 选择器查找元素"""
    try:
        result = await send_to_session("Runtime.evaluate", {
            "expression": f"document.querySelector('{selector}') !== null",
            "returnByValue": True
        })
        return result.get("result", {}).get("value", False)
    except:
        return False

async def fill_input(selector, value):
    """填写输入框"""
    try:
        # 聚焦元素
        await send_to_session("Runtime.evaluate", {
            "expression": f"document.querySelector('{selector}').focus()",
            "returnByValue": True
        })
        
        # 清空并填写
        script = f"""
            var el = document.querySelector('{selector}');
            el.value = '{value}';
            el.dispatchEvent(new Event('input', {{ bubbles: true }}));
            el.dispatchEvent(new Event('change', {{ bubbles: true }}));
        """
        await send_to_session("Runtime.evaluate", {
            "expression": script,
            "returnByValue": True
        })
        print(f"✅ 已填写 {selector}: {value}")
        return True
    except Exception as e:
        print(f"❌ 填写 {selector} 失败: {e}")
        return False

async def click_element(selector):
    """点击元素"""
    try:
        script = f"""
            document.querySelector('{selector}').click();
        """
        await send_to_session("Runtime.evaluate", {
            "expression": script,
            "returnByValue": True
        })
        print(f"✅ 已点击 {selector}")
        await asyncio.sleep(2)
        return True
    except Exception as e:
        print(f"❌ 点击 {selector} 失败: {e}")
        return False

async def take_screenshot(filename):
    """截图"""
    try:
        # 使用 Runtime.evaluate 获取页面信息，然后通过其他方式截图
        # 由于 CDP 限制，这里我们使用 DOM 操作来记录页面状态
        result = await send_to_session("Runtime.evaluate", {
            "expression": "document.documentElement.outerHTML",
            "returnByValue": True
        })
        html = result.get("result", {}).get("value", "")
        
        # 保存 HTML 内容
        with open(filename.replace(".png", ".html"), "w", encoding="utf-8") as f:
            f.write(html)
        print(f"✅ 页面 HTML 已保存: {filename.replace('.png', '.html')}")
        return True
    except Exception as e:
        print(f"⚠️ 截图失败: {e}")
        return False

async def explore_platform():
    """完整探索平台"""
    global CLIENT
    
    # 连接到 Chrome
    ws_url = None
    try:
        response = requests.get("http://localhost:9222/json/version", timeout=5)
        data = response.json()
        ws_url = data.get("webSocketDebuggerUrl")
    except:
        print("❌ Chrome 远程调试未启动")
        return
    
    CLIENT = CDPClient(ws_url)
    await CLIENT.start()
    print("✅ 已连接到 Chrome CDP\n")
    
    try:
        # ========== 1. 访问登录页面 ==========
        print("=" * 50)
        print("【步骤 1】访问登录页面")
        print("=" * 50)
        
        await navigate_to("http://10.20.42.172:5000/")
        info = await get_page_info()
        print(f"📄 页面标题: {info['title']}")
        print(f"🔗 当前 URL: {info['url']}")
        
        content = await get_page_content()
        print(f"\n📝 页面内容预览:\n{content[:600]}...")
        await take_screenshot("01_login_page")
        
        # ========== 2. 分析登录表单 ==========
        print("\n" + "=" * 50)
        print("【步骤 2】分析登录表单")
        print("=" * 50)
        
        # 查找表单元素
        has_username = await find_element_by_selector("input[type='text']")
        has_password = await find_element_by_selector("input[type='password']")
        has_submit = await find_element_by_selector("button[type='submit']")
        
        print(f"用户名输入框: {'✅ 存在' if has_username else '❌ 不存在'}")
        print(f"密码输入框: {'✅ 存在' if has_password else '❌ 不存在'}")
        print(f"提交按钮: {'✅ 存在' if has_submit else '❌ 不存在'}")
        
        # ========== 3. 填写登录信息 ==========
        print("\n" + "=" * 50)
        print("【步骤 3】填写登录信息")
        print("=" * 50)
        
        # 尝试多种选择器
        username_selectors = [
            "input[type='text']",
            "input[name='username']",
            "input[id='username']",
            "input[placeholder*='用户名']",
            "input[placeholder*='username']",
            "input"
        ]
        
        password_selectors = [
            "input[type='password']",
            "input[name='password']",
            "input[id='password']"
        ]
        
        submit_selectors = [
            "button[type='submit']",
            "button",
            "input[type='submit']"
        ]
        
        # 填写用户名
        for selector in username_selectors:
            if await find_element_by_selector(selector):
                await fill_input(selector, "shi_binbin")
                break
        
        # 填写密码
        for selector in password_selectors:
            if await find_element_by_selector(selector):
                await fill_input(selector, "111111")
                break
        
        await asyncio.sleep(1)
        
        # ========== 4. 提交登录 ==========
        print("\n" + "=" * 50)
        print("【步骤 4】提交登录")
        print("=" * 50)
        
        for selector in submit_selectors:
            if await find_element_by_selector(selector):
                await click_element(selector)
                break
        
        await asyncio.sleep(3)
        
        # 检查登录结果
        info = await get_page_info()
        print(f"📄 登录后页面标题: {info['title']}")
        print(f"🔗 登录后 URL: {info['url']}")
        
        if "/login" in info['url']:
            print("⚠️ 可能登录失败，仍在登录页面")
        else:
            print("✅ 登录成功！")
        
        await take_screenshot("02_after_login")
        
        # ========== 5. 探索功能模块 ==========
        print("\n" + "=" * 50)
        print("【步骤 5】探索功能模块")
        print("=" * 50)
        
        content = await get_page_content()
        
        # 查找菜单链接
        result = await send_to_session("Runtime.evaluate", {
            "expression": """
                Array.from(document.querySelectorAll('a, button, .menu-item, .nav-item, [role="menuitem"]')).map(el => ({
                    text: el.innerText?.trim() || el.textContent?.trim() || '',
                    href: el.href || '',
                    class: el.className || ''
                })).filter(item => item.text.length > 0 && item.text.length < 50)
            """,
            "returnByValue": True
        })
        
        menu_items = result.get("result", {}).get("value", [])
        print(f"\n📋 发现 {len(menu_items)} 个菜单项:")
        for i, item in enumerate(menu_items[:15], 1):
            print(f"  {i}. {item['text'][:30]} ({item['href'][:40] if item['href'] else 'no link'})")
        
        # ========== 6. 分析页面结构 ==========
        print("\n" + "=" * 50)
        print("【步骤 6】分析页面结构")
        print("=" * 50)
        
        # 获取所有标题
        result = await send_to_session("Runtime.evaluate", {
            "expression": """
                Array.from(document.querySelectorAll('h1, h2, h3')).map(el => ({
                    tag: el.tagName,
                    text: el.innerText?.trim() || ''
                })).filter(h => h.text.length > 0)
            """,
            "returnByValue": True
        })
        
        headings = result.get("result", {}).get("value", [])
        print(f"\n📑 页面标题结构:")
        for h in headings[:10]:
            indent = "  " * (int(h['tag'][1]) - 1)
            print(f"{indent}{h['tag']}: {h['text'][:50]}")
        
        # ========== 7. 获取表格数据 ==========
        print("\n" + "=" * 50)
        print("【步骤 7】获取表格数据")
        print("=" * 50)
        
        result = await send_to_session("Runtime.evaluate", {
            "expression": """
                (() => {
                    const tables = document.querySelectorAll('table');
                    return Array.from(tables).map((table, idx) => ({
                        index: idx,
                        rows: table.querySelectorAll('tr').length,
                        headers: Array.from(table.querySelectorAll('th')).map(th => th.innerText?.trim() || '')
                    }));
                })()
            """,
            "returnByValue": True
        })
        
        tables = result.get("result", {}).get("value", [])
        if tables:
            print(f"\n📊 发现 {len(tables)} 个表格:")
            for t in tables:
                print(f"  表格 {t['index']}: {t['rows']} 行, 表头: {t['headers'][:5]}")
        else:
            print("\n📊 页面中没有发现表格")
        
        await take_screenshot("03_dashboard")
        
        # ========== 8. 总结 ==========
        print("\n" + "=" * 50)
        print("【探索完成】")
        print("=" * 50)
        print("✅ 已成功使用 browser-harness skill 探索平台")
        print(f"   - 登录状态: {'成功' if '/login' not in info['url'] else '失败'}")
        print(f"   - 发现菜单项: {len(menu_items)} 个")
        print(f"   - 发现表格: {len(tables)} 个")
        print(f"   - 页面已保存为 HTML 文件")
        
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        # 关闭标签页
        if TARGET_ID:
            try:
                await CLIENT.send_raw("Target.closeTarget", {"targetId": TARGET_ID})
            except:
                pass
        await CLIENT.stop()
        print("\n🔌 已断开与 Chrome 的连接")

if __name__ == "__main__":
    asyncio.run(explore_platform())
