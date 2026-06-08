#!/usr/bin/env python3
"""
使用 browser-harness skill 完整探索平台并生成报告
真实执行 CDP 操作，记录每个步骤的详细信息
"""

import asyncio
import json
import requests
import time
import os
import sys
import websockets
from datetime import datetime

# 全局报告数据
REPORT = {
    "exploration_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    "platform_url": "http://10.20.42.172:5000/",
    "credentials": {"username": "shi_binbin", "password": "111111"},
    "steps": [],
    "findings": {},
    "screenshots": [],
    "menu_items": [],
    "page_structure": {},
    "tables": [],
    "errors": []
}

def log_step(step_name, details):
    """记录步骤日志"""
    step = {
        "time": datetime.now().strftime("%H:%M:%S"),
        "name": step_name,
        "details": details
    }
    REPORT["steps"].append(step)
    print(f"[{step['time']}] {step_name}: {details}", flush=True)

async def cdp_call(ws, method, params=None, session_id=None, timeout=30):
    """发送 CDP 命令并等待响应"""
    if params is None:
        params = {}
    
    msg_id = int(time.time() * 1000000)
    msg = {
        "id": msg_id,
        "method": method,
        "params": params
    }
    if session_id:
        msg["sessionId"] = session_id
    
    await ws.send(json.dumps(msg))
    
    # 等待响应
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = await asyncio.wait_for(ws.recv(), timeout=5.0)
            data = json.loads(response)
            if data.get("id") == msg_id:
                if "error" in data:
                    error_msg = f"CDP Error: {data['error']}"
                    REPORT["errors"].append(error_msg)
                    return {"error": error_msg}
                return data.get("result", {})
        except asyncio.TimeoutError:
            continue
    
    error_msg = f"CDP Timeout for {method}"
    REPORT["errors"].append(error_msg)
    return {"error": error_msg}

async def execute_js(ws, script, session_id):
    """在页面中执行 JavaScript"""
    result = await cdp_call(ws, "Runtime.evaluate", {
        "expression": script,
        "returnByValue": True,
        "awaitPromise": True
    }, session_id)
    
    if "error" in result:
        return None
    if "result" in result:
        return result["result"].get("value")
    return None

async def save_page_html(ws, session_id, filename):
    """保存页面 HTML"""
    try:
        html = await execute_js(ws, "document.documentElement.outerHTML", session_id)
        if html:
            filepath = f"exploration_{filename}.html"
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(html)
            REPORT["screenshots"].append(filepath)
            log_step("保存HTML", filepath)
            return filepath
    except Exception as e:
        REPORT["errors"].append(f"Save HTML failed: {str(e)}")
    return None

async def explore_platform():
    """完整探索平台"""
    
    print("=" * 60)
    print("🚀 开始使用 browser-harness skill 探索平台")
    print("=" * 60)
    
    # 获取 WebSocket URL
    log_step("连接Chrome", "获取WebSocket调试URL")
    try:
        response = requests.get("http://localhost:9222/json/version", timeout=10)
        data = response.json()
        ws_url = data.get("webSocketDebuggerUrl")
        log_step("WebSocketURL", ws_url)
    except Exception as e:
        log_step("连接失败", str(e))
        REPORT["errors"].append(f"Cannot connect to Chrome: {str(e)}")
        return
    
    # 连接到 Chrome
    try:
        async with websockets.connect(ws_url, ping_interval=None) as ws:
            log_step("WebSocket连接", "成功")
            
            # 步骤1: 创建标签页
            log_step("步骤1", "创建标签页访问平台")
            result = await cdp_call(ws, "Target.createTarget", {
                "url": "http://10.20.42.172:5000/"
            }, timeout=60)
            
            if "error" in result:
                log_step("创建标签页失败", result["error"])
                return
            
            target_id = result.get("targetId")
            log_step("TargetID", target_id)
            
            # 等待页面加载
            await asyncio.sleep(5)
            
            # 步骤2: 附加到页面
            log_step("步骤2", "附加到页面")
            result = await cdp_call(ws, "Target.attachToTarget", {
                "targetId": target_id,
                "flatten": True
            })
            
            if "error" in result:
                log_step("附加失败", result["error"])
                return
            
            session_id = result.get("sessionId")
            log_step("SessionID", session_id)
            
            # 步骤3: 启用域
            log_step("步骤3", "启用CDP域")
            await cdp_call(ws, "Runtime.enable", {}, session_id)
            await cdp_call(ws, "Page.enable", {}, session_id)
            log_step("域启用", "Runtime, Page已启用")
            
            await asyncio.sleep(2)
            
            # 步骤4: 获取页面信息
            log_step("步骤4", "获取登录页面信息")
            
            title = await execute_js(ws, "document.title", session_id)
            url = await execute_js(ws, "window.location.href", session_id)
            content = await execute_js(ws, "document.body.innerText", session_id)
            
            log_step("页面标题", title or "N/A")
            log_step("页面URL", url or "N/A")
            log_step("内容长度", str(len(content)) if content else "0")
            
            REPORT["findings"]["login_page"] = {
                "title": title,
                "url": url,
                "content_preview": content[:500] if content else ""
            }
            
            # 保存登录页
            await save_page_html(ws, session_id, "01_login")
            
            # 步骤5: 分析表单
            log_step("步骤5", "分析登录表单")
            
            inputs = await execute_js(ws, """
                Array.from(document.querySelectorAll('input')).map(el => ({
                    type: el.type, name: el.name, id: el.id, placeholder: el.placeholder
                }))
            """, session_id)
            
            buttons = await execute_js(ws, """
                Array.from(document.querySelectorAll('button')).map(el => ({
                    text: el.innerText, type: el.type
                }))
            """, session_id)
            
            log_step("输入框数量", str(len(inputs)) if inputs else "0")
            log_step("按钮数量", str(len(buttons)) if buttons else "0")
            
            # 步骤6: 填写登录信息
            log_step("步骤6", "填写登录信息")
            
            # 填写用户名
            await execute_js(ws, """
                var input = document.querySelector('input[type="text"]') || document.querySelector('input');
                if (input) { input.value = 'shi_binbin'; input.dispatchEvent(new Event('input', {bubbles: true})); }
            """, session_id)
            log_step("用户名", "shi_binbin")
            
            # 填写密码
            await execute_js(ws, """
                var input = document.querySelector('input[type="password"]');
                if (input) { input.value = '111111'; input.dispatchEvent(new Event('input', {bubbles: true})); }
            """, session_id)
            log_step("密码", "111111")
            
            await asyncio.sleep(1)
            
            # 步骤7: 提交登录
            log_step("步骤7", "提交登录")
            await execute_js(ws, """
                var btn = document.querySelector('button[type="submit"]') || document.querySelector('button');
                if (btn) btn.click();
            """, session_id)
            
            log_step("等待", "等待登录响应...")
            await asyncio.sleep(5)
            
            # 步骤8: 检查登录结果
            log_step("步骤8", "检查登录结果")
            
            current_url = await execute_js(ws, "window.location.href", session_id)
            current_title = await execute_js(ws, "document.title", session_id)
            
            log_step("登录后URL", current_url or "N/A")
            log_step("登录后标题", current_title or "N/A")
            
            login_success = current_url and "/login" not in current_url
            log_step("登录状态", "成功" if login_success else "失败")
            
            REPORT["findings"]["login_result"] = {
                "success": login_success,
                "url": current_url,
                "title": current_title
            }
            
            await save_page_html(ws, session_id, "02_logged_in")
            
            # 步骤9: 探索菜单
            log_step("步骤9", "探索功能菜单")
            
            menu_items = await execute_js(ws, """
                Array.from(document.querySelectorAll('a, button, .ant-menu-item, .ant-btn')).map(el => {
                    var text = (el.innerText || '').trim();
                    return { text: text.substring(0, 50), href: el.href || '', tag: el.tagName };
                }).filter(item => item.text.length > 0)
            """, session_id)
            
            unique_items = []
            seen = set()
            if menu_items:
                for item in menu_items:
                    key = item['text'] + item['href']
                    if key not in seen:
                        seen.add(key)
                        unique_items.append(item)
            
            log_step("菜单项数量", str(len(unique_items)))
            REPORT["menu_items"] = unique_items[:20]
            
            # 步骤10: 获取统计数据
            log_step("步骤10", "获取页面统计")
            
            stats = await execute_js(ws, """
                ({
                    links: document.querySelectorAll('a').length,
                    buttons: document.querySelectorAll('button').length,
                    inputs: document.querySelectorAll('input').length,
                    divs: document.querySelectorAll('div').length,
                    tables: document.querySelectorAll('table').length
                })
            """, session_id)
            
            if stats:
                for key, value in stats.items():
                    log_step(f"统计-{key}", str(value))
            
            REPORT["page_structure"]["stats"] = stats
            
            # 保存最终页面
            await save_page_html(ws, session_id, "03_final")
            
            # 关闭标签页
            await cdp_call(ws, "Target.closeTarget", {"targetId": target_id})
            log_step("清理", "标签页已关闭")
            
    except Exception as e:
        log_step("错误", str(e))
        REPORT["errors"].append(str(e))
        import traceback
        traceback.print_exc()
    
    log_step("完成", "探索完成")
    generate_report()

def generate_report():
    """生成探索报告"""
    # JSON报告
    with open("platform_exploration_report.json", "w", encoding="utf-8") as f:
        json.dump(REPORT, f, ensure_ascii=False, indent=2)
    
    # Markdown报告
    md = f"""# 测试管理平台探索报告

## 基本信息
- **探索时间**: {REPORT['exploration_time']}
- **目标平台**: {REPORT['platform_url']}
- **登录账号**: {REPORT['credentials']['username']}

## 执行步骤
"""
    for step in REPORT['steps']:
        md += f"- **{step['time']}** {step['name']}: {step['details']}\n"
    
    md += "\n## 探索发现\n"
    
    # 登录页面
    login_page = REPORT['findings'].get('login_page', {})
    md += f"\n### 登录页面\n"
    md += f"- 标题: {login_page.get('title', 'N/A')}\n"
    md += f"- URL: {login_page.get('url', 'N/A')}\n"
    md += f"- 内容预览: {login_page.get('content_preview', 'N/A')[:300]}\n"
    
    # 登录结果
    login_result = REPORT['findings'].get('login_result', {})
    md += f"\n### 登录结果\n"
    md += f"- 状态: {'✅ 成功' if login_result.get('success') else '❌ 失败'}\n"
    md += f"- URL: {login_result.get('url', 'N/A')}\n"
    md += f"- 标题: {login_result.get('title', 'N/A')}\n"
    
    # 菜单
    md += f"\n### 功能菜单 ({len(REPORT['menu_items'])} 项)\n"
    for i, item in enumerate(REPORT['menu_items'][:15], 1):
        md += f"{i}. {item.get('text', 'N/A')[:30]} ({item.get('tag', 'N/A')})\n"
    
    # 统计
    stats = REPORT['page_structure'].get('stats', {})
    if stats:
        md += f"\n### 页面统计\n"
        for key, value in stats.items():
            md += f"- {key}: {value}\n"
    
    # 错误
    if REPORT['errors']:
        md += f"\n### 错误记录\n"
        for error in REPORT['errors']:
            md += f"- ⚠️ {error}\n"
    
    md += "\n---\n*报告由 browser-harness skill 自动生成*\n"
    
    with open("platform_exploration_report.md", "w", encoding="utf-8") as f:
        f.write(md)
    
    print("\n" + "=" * 60)
    print("📊 报告已生成:")
    print("  - platform_exploration_report.json")
    print("  - platform_exploration_report.md")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(explore_platform())
