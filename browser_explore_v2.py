#!/usr/bin/env python3
"""
使用 browser-harness skill 完整探索平台 - V2
修复 session 问题，正确使用 CDP
"""

import asyncio
import json
import requests
import time
import os
import websockets

async def cdp_call(ws, method, params=None, session_id=None):
    """发送 CDP 命令并等待响应"""
    if params is None:
        params = {}
    
    msg = {
        "id": int(time.time() * 1000),
        "method": method,
        "params": params
    }
    if session_id:
        msg["sessionId"] = session_id
    
    await ws.send(json.dumps(msg))
    
    # 等待响应
    while True:
        response = await ws.recv()
        data = json.loads(response)
        if data.get("id") == msg["id"]:
            if "error" in data:
                raise Exception(data["error"])
            return data.get("result", {})
        # 忽略事件消息

async def explore_platform():
    """完整探索平台"""
    
    # 获取 WebSocket URL
    try:
        response = requests.get("http://localhost:9222/json/version", timeout=5)
        data = response.json()
        ws_url = data.get("webSocketDebuggerUrl")
        print(f"🔍 发现 WebSocket URL: {ws_url}")
    except Exception as e:
        print(f"❌ 无法连接到 Chrome: {e}")
        return
    
    # 连接到 Chrome
    print("🔌 正在连接到 Chrome CDP...")
    async with websockets.connect(ws_url) as ws:
        print("✅ 已连接到 Chrome CDP\n")
        
        try:
            # ========== 1. 创建新标签页 ==========
            print("=" * 50)
            print("【步骤 1】创建新标签页并访问平台")
            print("=" * 50)
            
            result = await cdp_call(ws, "Target.createTarget", {
                "url": "http://10.20.42.172:5000/"
            })
            target_id = result.get("targetId")
            print(f"✅ 创建标签页成功, Target ID: {target_id}")
            
            await asyncio.sleep(3)
            
            # ========== 2. 附加到目标页面 ==========
            print("\n" + "=" * 50)
            print("【步骤 2】附加到目标页面")
            print("=" * 50)
            
            result = await cdp_call(ws, "Target.attachToTarget", {
                "targetId": target_id,
                "flatten": True
            })
            session_id = result.get("sessionId")
            print(f"✅ 附加成功, Session ID: {session_id}")
            
            # ========== 3. 启用必要的域 ==========
            print("\n" + "=" * 50)
            print("【步骤 3】启用必要的域")
            print("=" * 50)
            
            await cdp_call(ws, "Runtime.enable", {}, session_id)
            print("✅ Runtime 域已启用")
            
            await cdp_call(ws, "Page.enable", {}, session_id)
            print("✅ Page 域已启用")
            
            await cdp_call(ws, "DOM.enable", {}, session_id)
            print("✅ DOM 域已启用")
            
            await asyncio.sleep(1)
            
            # ========== 4. 获取页面信息 ==========
            print("\n" + "=" * 50)
            print("【步骤 4】获取页面信息")
            print("=" * 50)
            
            # 获取页面标题
            result = await cdp_call(ws, "Runtime.evaluate", {
                "expression": "document.title",
                "returnByValue": True
            }, session_id)
            title = result.get("result", {}).get("value", "Unknown")
            print(f"📄 页面标题: {title}")
            
            # 获取当前 URL
            result = await cdp_call(ws, "Runtime.evaluate", {
                "expression": "window.location.href",
                "returnByValue": True
            }, session_id)
            url = result.get("result", {}).get("value", "Unknown")
            print(f"🔗 当前 URL: {url}")
            
            # 获取页面内容
            result = await cdp_call(ws, "Runtime.evaluate", {
                "expression": "document.body.innerText",
                "returnByValue": True
            }, session_id)
            content = result.get("result", {}).get("value", "")
            print(f"\n📝 页面内容预览 (前800字符):\n{content[:800]}...")
            
            # 保存 HTML
            result = await cdp_call(ws, "Runtime.evaluate", {
                "expression": "document.documentElement.outerHTML",
                "returnByValue": True
            }, session_id)
            html = result.get("result", {}).get("value", "")
            with open("01_login_page.html", "w", encoding="utf-8") as f:
                f.write(html)
            print("\n✅ 页面 HTML 已保存: 01_login_page.html")
            
            # ========== 5. 分析登录表单 ==========
            print("\n" + "=" * 50)
            print("【步骤 5】分析登录表单")
            print("=" * 50)
            
            # 查找所有输入框
            result = await cdp_call(ws, "Runtime.evaluate", {
                "expression": """
                    Array.from(document.querySelectorAll('input')).map(el => ({
                        type: el.type,
                        name: el.name,
                        id: el.id,
                        placeholder: el.placeholder,
                        class: el.className
                    }))
                """,
                "returnByValue": True
            }, session_id)
            inputs = result.get("result", {}).get("value", [])
            print(f"\n📝 发现 {len(inputs)} 个输入框:")
            for i, inp in enumerate(inputs, 1):
                print(f"  {i}. type={inp['type']}, name={inp['name']}, id={inp['id']}, placeholder={inp['placeholder'][:20] if inp['placeholder'] else ''}")
            
            # 查找所有按钮
            result = await cdp_call(ws, "Runtime.evaluate", {
                "expression": """
                    Array.from(document.querySelectorAll('button, input[type="submit"]')).map(el => ({
                        tag: el.tagName,
                        type: el.type,
                        text: el.innerText || el.value || '',
                        class: el.className
                    }))
                """,
                "returnByValue": True
            }, session_id)
            buttons = result.get("result", {}).get("value", [])
            print(f"\n🔘 发现 {len(buttons)} 个按钮:")
            for i, btn in enumerate(buttons, 1):
                print(f"  {i}. {btn['tag']}, type={btn['type']}, text={btn['text'][:30] if btn['text'] else ''}")
            
            # ========== 6. 填写登录信息 ==========
            print("\n" + "=" * 50)
            print("【步骤 6】填写登录信息")
            print("=" * 50)
            
            # 填写用户名 - 尝试多种选择器
            username_script = """
                var inputs = document.querySelectorAll('input');
                var usernameInput = null;
                for (var i = 0; i < inputs.length; i++) {
                    var input = inputs[i];
                    if (input.type === 'text' || input.name.includes('user') || input.name.includes('name') || input.placeholder.includes('用户')) {
                        usernameInput = input;
                        break;
                    }
                }
                if (usernameInput) {
                    usernameInput.value = 'shi_binbin';
                    usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
                    usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
                    'filled'
                } else {
                    'not found'
                }
            """
            result = await cdp_call(ws, "Runtime.evaluate", {
                "expression": username_script,
                "returnByValue": True
            }, session_id)
            status = result.get("result", {}).get("value", "")
            print(f"✅ 用户名填写状态: {status}")
            
            # 填写密码
            password_script = """
                var passwordInput = document.querySelector('input[type="password"]');
                if (passwordInput) {
                    passwordInput.value = '111111';
                    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
                    passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
                    'filled'
                } else {
                    'not found'
                }
            """
            result = await cdp_call(ws, "Runtime.evaluate", {
                "expression": password_script,
                "returnByValue": True
            }, session_id)
            status = result.get("result", {}).get("value", "")
            print(f"✅ 密码填写状态: {status}")
            
            await asyncio.sleep(1)
            
            # ========== 7. 提交登录 ==========
            print("\n" + "=" * 50)
            print("【步骤 7】提交登录")
            print("=" * 50)
            
            submit_script = """
                var submitBtn = document.querySelector('button[type="submit"]') || 
                                document.querySelector('button') || 
                                document.querySelector('input[type="submit"]');
                if (submitBtn) {
                    submitBtn.click();
                    'clicked: ' + submitBtn.tagName
                } else {
                    'not found'
                }
            """
            result = await cdp_call(ws, "Runtime.evaluate", {
                "expression": submit_script,
                "returnByValue": True
            }, session_id)
            status = result.get("result", {}).get("value", "")
            print(f"✅ 提交按钮点击状态: {status}")
            
            # 等待登录完成
            print("⏳ 等待登录完成...")
            await asyncio.sleep(4)
            
            # ========== 8. 检查登录结果 ==========
            print("\n" + "=" * 50)
            print("【步骤 8】检查登录结果")
            print("=" * 50)
            
            result = await cdp_call(ws, "Runtime.evaluate", {
                "expression": "window.location.href",
                "returnByValue": True
            }, session_id)
            current_url = result.get("result", {}).get("value", "")
            print(f"🔗 当前 URL: {current_url}")
            
            result = await cdp_call(ws, "Runtime.evaluate", {
                "expression": "document.title",
                "returnByValue": True
            }, session_id)
            current_title = result.get("result", {}).get("value", "")
            print(f"📄 页面标题: {current_title}")
            
            if "/login" in current_url:
                print("⚠️ 登录可能失败，仍在登录页面")
            else:
                print("✅ 登录成功！")
            
            # 保存登录后页面
            result = await cdp_call(ws, "Runtime.evaluate", {
                "expression": "document.documentElement.outerHTML",
                "returnByValue": True
            }, session_id)
            html = result.get("result", {}).get("value", "")
            with open("02_after_login.html", "w", encoding="utf-8") as f:
                f.write(html)
            print("✅ 登录后页面已保存: 02_after_login.html")
            
            # ========== 9. 探索功能模块 ==========
            print("\n" + "=" * 50)
            print("【步骤 9】探索功能模块")
            print("=" * 50)
            
            # 获取菜单项
            result = await cdp_call(ws, "Runtime.evaluate", {
                "expression": """
                    Array.from(document.querySelectorAll('a, button, .menu-item, .nav-item, [role="menuitem"], .ant-menu-item, .ant-btn')).map(el => ({
                        text: (el.innerText || el.textContent || '').trim(),
                        href: el.href || '',
                        class: el.className || ''
                    })).filter(item => item.text.length > 0 && item.text.length < 50)
                """,
                "returnByValue": True
            }, session_id)
            menu_items = result.get("result", {}).get("value", [])
            print(f"\n📋 发现 {len(menu_items)} 个菜单/按钮项:")
            for i, item in enumerate(menu_items[:20], 1):
                text = item['text'][:35] if item['text'] else ''
                href = item['href'][:40] if item['href'] else 'no link'
                print(f"  {i}. {text} ({href})")
            
            # ========== 10. 分析页面结构 ==========
            print("\n" + "=" * 50)
            print("【步骤 10】分析页面结构")
            print("=" * 50)
            
            # 获取所有标题
            result = await cdp_call(ws, "Runtime.evaluate", {
                "expression": """
                    Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(el => ({
                        tag: el.tagName,
                        text: (el.innerText || '').trim()
                    })).filter(h => h.text.length > 0)
                """,
                "returnByValue": True
            }, session_id)
            headings = result.get("result", {}).get("value", [])
            print(f"\n📑 页面标题结构 ({len(headings)} 个):")
            for h in headings[:15]:
                indent = "  " * (int(h['tag'][1]) - 1)
                text = h['text'][:50] if h['text'] else ''
                print(f"{indent}{h['tag']}: {text}")
            
            # ========== 11. 获取表格数据 ==========
            print("\n" + "=" * 50)
            print("【步骤 11】获取表格数据")
            print("=" * 50)
            
            result = await cdp_call(ws, "Runtime.evaluate", {
                "expression": """
                    (() => {
                        const tables = document.querySelectorAll('table, .ant-table');
                        return Array.from(tables).map((table, idx) => {
                            const headers = Array.from(table.querySelectorAll('th, .ant-table-cell')).map(th => (th.innerText || '').trim());
                            const rows = table.querySelectorAll('tr, .ant-table-row').length;
                            return { index: idx, rows: rows, headers: headers.slice(0, 10) };
                        });
                    })()
                """,
                "returnByValue": True
            }, session_id)
            tables = result.get("result", {}).get("value", [])
            if tables:
                print(f"\n📊 发现 {len(tables)} 个表格:")
                for t in tables:
                    headers_str = ', '.join(t['headers'][:5]) if t['headers'] else '无表头'
                    print(f"  表格 {t['index']}: {t['rows']} 行, 表头: {headers_str}")
            else:
                print("\n📊 页面中没有发现表格")
            
            # ========== 12. 获取页面统计数据 ==========
            print("\n" + "=" * 50)
            print("【步骤 12】获取页面统计数据")
            print("=" * 50)
            
            stats_script = """
                ({
                    links: document.querySelectorAll('a').length,
                    buttons: document.querySelectorAll('button').length,
                    inputs: document.querySelectorAll('input').length,
                    images: document.querySelectorAll('img').length,
                    divs: document.querySelectorAll('div').length,
                    spans: document.querySelectorAll('span').length,
                    paragraphs: document.querySelectorAll('p').length,
                    scripts: document.querySelectorAll('script').length,
                    stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length
                })
            """
            result = await cdp_call(ws, "Runtime.evaluate", {
                "expression": stats_script,
                "returnByValue": True
            }, session_id)
            stats = result.get("result", {}).get("value", {})
            print("\n📈 页面元素统计:")
            for key, value in stats.items():
                print(f"  {key}: {value}")
            
            # 保存最终页面
            result = await cdp_call(ws, "Runtime.evaluate", {
                "expression": "document.documentElement.outerHTML",
                "returnByValue": True
            }, session_id)
            html = result.get("result", {}).get("value", "")
            with open("03_dashboard.html", "w", encoding="utf-8") as f:
                f.write(html)
            print("\n✅ 最终页面已保存: 03_dashboard.html")
            
            # ========== 13. 总结 ==========
            print("\n" + "=" * 50)
            print("【探索完成总结】")
            print("=" * 50)
            print("✅ 已成功使用 browser-harness skill 完整探索平台")
            print(f"\n📊 探索结果:")
            print(f"   - 登录状态: {'成功' if '/login' not in current_url else '失败/仍在登录页'}")
            print(f"   - 页面标题: {current_title}")
            print(f"   - 当前 URL: {current_url}")
            print(f"   - 发现菜单/按钮: {len(menu_items)} 个")
            print(f"   - 发现表格: {len(tables)} 个")
            print(f"   - 页面元素: {stats.get('links', 0)} 链接, {stats.get('buttons', 0)} 按钮")
            print(f"\n💾 已保存文件:")
            print(f"   - 01_login_page.html (登录页)")
            print(f"   - 02_after_login.html (登录后)")
            print(f"   - 03_dashboard.html (最终页面)")
            
        except Exception as e:
            print(f"\n❌ 错误: {e}")
            import traceback
            traceback.print_exc()
            
        finally:
            # 关闭标签页
            try:
                await cdp_call(ws, "Target.closeTarget", {"targetId": target_id})
                print("\n✅ 标签页已关闭")
            except:
                pass
    
    print("\n🔌 已断开与 Chrome 的连接")

if __name__ == "__main__":
    asyncio.run(explore_platform())
