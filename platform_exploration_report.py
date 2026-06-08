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
    print(f"\n[{step['time']}] {step_name}")
    if details:
        print(f"  {details}")

async def cdp_call(ws, method, params=None, session_id=None):
    """发送 CDP 命令并等待响应"""
    if params is None:
        params = {}
    
    msg = {
        "id": int(time.time() * 1000000),
        "method": method,
        "params": params
    }
    if session_id:
        msg["sessionId"] = session_id
    
    await ws.send(json.dumps(msg))
    
    # 等待响应
    while True:
        try:
            response = await asyncio.wait_for(ws.recv(), timeout=10.0)
            data = json.loads(response)
            if data.get("id") == msg["id"]:
                if "error" in data:
                    error_msg = f"CDP Error: {data['error']}"
                    REPORT["errors"].append(error_msg)
                    raise Exception(error_msg)
                return data.get("result", {})
        except asyncio.TimeoutError:
            error_msg = f"CDP Timeout for {method}"
            REPORT["errors"].append(error_msg)
            raise Exception(error_msg)

async def execute_js(ws, script, session_id, return_by_value=True):
    """在页面中执行 JavaScript"""
    result = await cdp_call(ws, "Runtime.evaluate", {
        "expression": script,
        "returnByValue": return_by_value,
        "awaitPromise": True
    }, session_id)
    
    if "result" in result:
        value = result["result"].get("value")
        return value
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
    log_step("连接 Chrome", "获取 WebSocket 调试 URL...")
    try:
        response = requests.get("http://localhost:9222/json/version", timeout=5)
        data = response.json()
        ws_url = data.get("webSocketDebuggerUrl")
        log_step("获取 WebSocket URL", f"{ws_url}")
    except Exception as e:
        log_step("连接失败", str(e))
        REPORT["errors"].append(f"Cannot connect to Chrome: {str(e)}")
        return
    
    # 连接到 Chrome
    async with websockets.connect(ws_url) as ws:
        log_step("WebSocket 连接", "成功连接到 Chrome CDP")
        
        try:
            # ========== 步骤 1: 创建标签页访问平台 ==========
            log_step("步骤 1", "创建新标签页并访问平台...")
            result = await cdp_call(ws, "Target.createTarget", {
                "url": "http://10.20.42.172:5000/"
            })
            target_id = result.get("targetId")
            log_step("创建标签页", f"Target ID: {target_id}")
            
            await asyncio.sleep(3)
            
            # ========== 步骤 2: 附加到页面 ==========
            log_step("步骤 2", "附加到目标页面...")
            result = await cdp_call(ws, "Target.attachToTarget", {
                "targetId": target_id,
                "flatten": True
            })
            session_id = result.get("sessionId")
            log_step("附加成功", f"Session ID: {session_id}")
            
            # ========== 步骤 3: 启用域 ==========
            log_step("步骤 3", "启用必要的 CDP 域...")
            await cdp_call(ws, "Runtime.enable", {}, session_id)
            await cdp_call(ws, "Page.enable", {}, session_id)
            await cdp_call(ws, "DOM.enable", {}, session_id)
            log_step("域启用", "Runtime, Page, DOM 域已启用")
            
            await asyncio.sleep(1)
            
            # ========== 步骤 4: 获取登录页面信息 ==========
            log_step("步骤 4", "获取登录页面信息...")
            
            title = await execute_js(ws, "document.title", session_id)
            url = await execute_js(ws, "window.location.href", session_id)
            content = await execute_js(ws, "document.body.innerText", session_id)
            
            log_step("页面标题", title)
            log_step("当前 URL", url)
            log_step("页面内容", f"{content[:500]}..." if content else "无内容")
            
            REPORT["findings"]["login_page"] = {
                "title": title,
                "url": url,
                "content_preview": content[:1000] if content else ""
            }
            
            # 保存登录页 HTML
            await save_page_html(ws, session_id, "01_login_page")
            
            # ========== 步骤 5: 分析登录表单 ==========
            log_step("步骤 5", "分析登录表单结构...")
            
            inputs = await execute_js(ws, """
                Array.from(document.querySelectorAll('input')).map(el => ({
                    type: el.type,
                    name: el.name,
                    id: el.id,
                    placeholder: el.placeholder,
                    className: el.className
                }))
            """, session_id)
            
            buttons = await execute_js(ws, """
                Array.from(document.querySelectorAll('button, input[type="submit"]')).map(el => ({
                    tagName: el.tagName,
                    type: el.type,
                    innerText: el.innerText || el.value,
                    className: el.className
                }))
            """, session_id)
            
            log_step("表单元素", f"发现 {len(inputs)} 个输入框, {len(buttons)} 个按钮")
            
            for i, inp in enumerate(inputs, 1):
                log_step(f"  输入框 {i}", f"type={inp.get('type')}, name={inp.get('name')}, id={inp.get('id')}")
            
            for i, btn in enumerate(buttons, 1):
                log_step(f"  按钮 {i}", f"{btn.get('tagName')}, text={btn.get('innerText', '')[:30]}")
            
            REPORT["findings"]["login_form"] = {
                "inputs": inputs,
                "buttons": buttons
            }
            
            # ========== 步骤 6: 填写登录信息 ==========
            log_step("步骤 6", "填写登录信息...")
            
            # 填写用户名
            username_result = await execute_js(ws, """
                (function() {
                    var inputs = document.querySelectorAll('input');
                    for (var i = 0; i < inputs.length; i++) {
                        var input = inputs[i];
                        if (input.type === 'text' || input.name.includes('user') || input.name.includes('name')) {
                            input.value = 'shi_binbin';
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            return { success: true, field: input.name || input.id || 'unnamed' };
                        }
                    }
                    return { success: false, error: 'Username field not found' };
                })()
            """, session_id)
            
            log_step("填写用户名", f"shi_binbin - {username_result}")
            
            # 填写密码
            password_result = await execute_js(ws, """
                (function() {
                    var input = document.querySelector('input[type="password"]');
                    if (input) {
                        input.value = '111111';
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        return { success: true, field: input.name || input.id || 'password' };
                    }
                    return { success: false, error: 'Password field not found' };
                })()
            """, session_id)
            
            log_step("填写密码", f"111111 - {password_result}")
            
            await asyncio.sleep(1)
            
            # ========== 步骤 7: 提交登录 ==========
            log_step("步骤 7", "提交登录...")
            
            submit_result = await execute_js(ws, """
                (function() {
                    var btn = document.querySelector('button[type="submit"]') || 
                              document.querySelector('button') || 
                              document.querySelector('input[type="submit"]');
                    if (btn) {
                        btn.click();
                        return { success: true, element: btn.tagName + (btn.innerText ? ': ' + btn.innerText.substring(0, 20) : '') };
                    }
                    return { success: false, error: 'Submit button not found' };
                })()
            """, session_id)
            
            log_step("提交按钮", str(submit_result))
            
            # 等待登录完成
            log_step("等待", "等待登录响应...")
            await asyncio.sleep(4)
            
            # ========== 步骤 8: 检查登录结果 ==========
            log_step("步骤 8", "检查登录结果...")
            
            current_url = await execute_js(ws, "window.location.href", session_id)
            current_title = await execute_js(ws, "document.title", session_id)
            
            log_step("登录后 URL", current_url)
            log_step("登录后标题", current_title)
            
            login_success = "/login" not in current_url
            log_step("登录状态", "✅ 成功" if login_success else "❌ 失败")
            
            REPORT["findings"]["login_result"] = {
                "success": login_success,
                "url": current_url,
                "title": current_title
            }
            
            await save_page_html(ws, session_id, "02_after_login")
            
            if not login_success:
                log_step("警告", "登录可能失败，但仍继续探索...")
            
            # ========== 步骤 9: 探索功能模块 ==========
            log_step("步骤 9", "探索功能模块...")
            
            # 获取所有链接和按钮
            menu_items = await execute_js(ws, """
                Array.from(document.querySelectorAll('a, button, .menu-item, .nav-item, [role="menuitem"], .ant-menu-item, .ant-btn, .ant-menu-submenu-title')).map(el => {
                    var text = (el.innerText || el.textContent || '').trim();
                    return {
                        text: text.length > 50 ? text.substring(0, 50) + '...' : text,
                        href: el.href || '',
                        tagName: el.tagName,
                        className: el.className ? el.className.substring(0, 50) : ''
                    };
                }).filter(item => item.text.length > 0)
            """, session_id)
            
            unique_items = []
            seen = set()
            for item in menu_items:
                key = item['text'] + item['href']
                if key not in seen:
                    seen.add(key)
                    unique_items.append(item)
            
            log_step("菜单项", f"发现 {len(unique_items)} 个菜单/按钮项")
            
            for i, item in enumerate(unique_items[:15], 1):
                log_step(f"  菜单 {i}", f"{item['text'][:30]} ({item['tagName']})")
            
            REPORT["menu_items"] = unique_items
            
            # ========== 步骤 10: 分析页面结构 ==========
            log_step("步骤 10", "分析页面结构...")
            
            headings = await execute_js(ws, """
                Array.from(document.querySelectorAll('h1, h2, h3, h4, h5')).map(el => ({
                    tag: el.tagName,
                    text: (el.innerText || '').trim().substring(0, 100)
                })).filter(h => h.text.length > 0)
            """, session_id)
            
            log_step("标题结构", f"发现 {len(headings)} 个标题")
            for h in headings[:10]:
                indent = "  " * (int(h['tag'][1]) - 1)
                log_step(f"  {h['tag']}", f"{indent}{h['text'][:50]}")
            
            REPORT["page_structure"]["headings"] = headings
            
            # ========== 步骤 11: 获取表格数据 ==========
            log_step("步骤 11", "获取表格数据...")
            
            tables = await execute_js(ws, """
                (function() {
                    var tables = document.querySelectorAll('table, .ant-table, .ant-table-content');
                    return Array.from(tables).map((table, idx) => {
                        var headers = Array.from(table.querySelectorAll('th, .ant-table-cell, .ant-table-column-title')).map(th => (th.innerText || '').trim());
                        var rows = table.querySelectorAll('tr, .ant-table-row').length;
                        return { index: idx, rows: rows, headers: headers.slice(0, 10) };
                    });
                })()
            """, session_id)
            
            if tables and len(tables) > 0:
                log_step("表格", f"发现 {len(tables)} 个表格")
                for t in tables:
                    headers = ', '.join(t['headers'][:5]) if t['headers'] else '无表头'
                    log_step(f"  表格 {t['index']}", f"{t['rows']} 行, 表头: {headers}")
            else:
                log_step("表格", "未发现表格")
            
            REPORT["tables"] = tables or []
            
            # ========== 步骤 12: 页面统计 ==========
            log_step("步骤 12", "获取页面统计数据...")
            
            stats = await execute_js(ws, """
                ({
                    links: document.querySelectorAll('a').length,
                    buttons: document.querySelectorAll('button').length,
                    inputs: document.querySelectorAll('input').length,
                    images: document.querySelectorAll('img').length,
                    divs: document.querySelectorAll('div').length,
                    spans: document.querySelectorAll('span').length,
                    paragraphs: document.querySelectorAll('p').length,
                    scripts: document.querySelectorAll('script').length,
                    stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length,
                    tables: document.querySelectorAll('table').length,
                    listItems: document.querySelectorAll('li').length
                })
            """, session_id)
            
            log_step("页面统计", "")
            for key, value in stats.items():
                log_step(f"  {key}", str(value))
            
            REPORT["page_structure"]["stats"] = stats
            
            # 保存最终页面
            await save_page_html(ws, session_id, "03_final_page")
            
            # ========== 步骤 13: 尝试点击菜单探索 ==========
            log_step("步骤 13", "尝试点击菜单项探索更多功能...")
            
            # 尝试点击一些常见的菜单项
            menu_clicks = [
                ("首页", "a[href='/'], .home, .index"),
                ("测试用例", "a[href*='test'], a[href*='case']"),
                ("缺陷管理", "a[href*='defect'], a[href*='bug']"),
                ("系统管理", "a[href*='system'], a[href*='admin']"),
            ]
            
            for menu_name, selectors in menu_clicks:
                try:
                    result = await execute_js(ws, f"""
                        (function() {{
                            var selectors = '{selectors}'.split(', ');
                            for (var i = 0; i < selectors.length; i++) {{
                                var el = document.querySelector(selectors[i]);
                                if (el) {{
                                    el.click();
                                    return {{ clicked: true, selector: selectors[i] }};
                                }}
                            }}
                            return {{ clicked: false }};
                        }})()
                    """, session_id)
                    
                    if result and result.get('clicked'):
                        log_step(f"点击菜单", f"{menu_name} - 成功")
                        await asyncio.sleep(2)
                        
                        # 获取新页面信息
                        new_url = await execute_js(ws, "window.location.href", session_id)
                        new_title = await execute_js(ws, "document.title", session_id)
                        log_step(f"  导航到", f"{new_title} - {new_url}")
                        
                        # 保存页面
                        await save_page_html(ws, session_id, f"04_page_{menu_name}")
                        
                except Exception as e:
                    log_step(f"点击菜单", f"{menu_name} - 失败: {str(e)}")
            
            # ========== 生成报告 ==========
            log_step("完成", "探索完成，生成报告...")
            
        except Exception as e:
            error_msg = f"Exploration error: {str(e)}"
            log_step("错误", error_msg)
            REPORT["errors"].append(error_msg)
            import traceback
            traceback.print_exc()
            
        finally:
            # 关闭标签页
            try:
                await cdp_call(ws, "Target.closeTarget", {"targetId": target_id})
                log_step("清理", "标签页已关闭")
            except:
                pass
    
    log_step("断开连接", "已断开与 Chrome 的连接")
    
    # 生成报告文件
    generate_report()

def generate_report():
    """生成探索报告"""
    report_path = "platform_exploration_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(REPORT, f, ensure_ascii=False, indent=2)
    
    # 生成 Markdown 报告
    md_report = generate_markdown_report()
    md_path = "platform_exploration_report.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_report)
    
    print("\n" + "=" * 60)
    print("📊 报告已生成:")
    print(f"   - JSON: {report_path}")
    print(f"   - Markdown: {md_path}")
    print("=" * 60)

def generate_markdown_report():
    """生成 Markdown 格式的报告"""
    md = f"""# 测试管理平台探索报告

## 基本信息

- **探索时间**: {REPORT['exploration_time']}
- **目标平台**: {REPORT['platform_url']}
- **登录账号**: {REPORT['credentials']['username']}

## 执行步骤

"""
    
    for step in REPORT['steps']:
        md += f"- **{step['time']}** - {step['name']}\n"
        if step['details']:
            md += f"  - {step['details']}\n"
    
    md += "\n## 探索发现\n\n"
    
    # 登录页面
    login_page = REPORT['findings'].get('login_page', {})
    md += f"""### 登录页面

- **页面标题**: {login_page.get('title', 'N/A')}
- **页面 URL**: {login_page.get('url', 'N/A')}
- **内容预览**: 
```
{login_page.get('content_preview', 'N/A')[:500]}
```

"""
    
    # 登录结果
    login_result = REPORT['findings'].get('login_result', {})
    md += f"""### 登录结果

- **登录状态**: {'✅ 成功' if login_result.get('success') else '❌ 失败'}
- **登录后 URL**: {login_result.get('url', 'N/A')}
- **登录后标题**: {login_result.get('title', 'N/A')}

"""
    
    # 菜单项
    md += f"""### 功能菜单 ({len(REPORT['menu_items'])} 项)

| 序号 | 菜单文本 | 类型 | 链接 |
|------|----------|------|------|
"""
    for i, item in enumerate(REPORT['menu_items'][:20], 1):
        text = item.get('text', '')[:30].replace('|', '\\|')
        href = item.get('href', '')[:40].replace('|', '\\|')
        tag = item.get('tagName', '')
        md += f"| {i} | {text} | {tag} | {href} |\n"
    
    # 页面结构
    md += "\n### 页面结构\n\n"
    headings = REPORT['page_structure'].get('headings', [])
    if headings:
        md += "**标题层级**:\\n"
        for h in headings[:15]:
            indent = "  " * (int(h['tag'][1]) - 1)
            md += f"{indent}- {h['tag']}: {h['text'][:60]}\\n"
    
    # 统计数据
    stats = REPORT['page_structure'].get('stats', {})
    if stats:
        md += "\n**页面元素统计**:\\n"
        for key, value in stats.items():
            md += f"- {key}: {value}\\n"
    
    # 表格
    if REPORT['tables']:
        md += f"\n### 表格数据 ({len(REPORT['tables'])} 个)\n\n"
        for t in REPORT['tables']:
            headers = ', '.join(t['headers'][:5]) if t['headers'] else '无表头'
            md += f"- 表格 {t['index']}: {t['rows']} 行, 表头: {headers}\\n"
    
    # 错误
    if REPORT['errors']:
        md += "\n## 错误记录\n\n"
        for error in REPORT['errors']:
            md += f"- ⚠️ {error}\\n"
    
    # 保存的文件
    if REPORT['screenshots']:
        md += "\n## 保存的文件\n\n"
        for f in REPORT['screenshots']:
            md += f"- `{f}`\\n"
    
    md += "\n---\n*报告由 browser-harness skill 自动生成*\n"
    
    return md

if __name__ == "__main__":
    asyncio.run(explore_platform())
