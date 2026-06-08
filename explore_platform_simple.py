#!/usr/bin/env python3
"""
使用 browser-harness skill 探索平台 - 简化版
直接使用现有标签页进行探索
"""

import asyncio
import json
import requests
import websockets
from datetime import datetime

print("=" * 60)
print("🚀 使用 browser-harness skill 探索平台")
print("=" * 60)

# 获取 Chrome 调试信息
try:
    print("\n[1] 连接到 Chrome...")
    resp = requests.get("http://localhost:9222/json/list", timeout=10)
    targets = resp.json()
    print(f"    发现 {len(targets)} 个目标")
    
    # 找到第一个页面目标
    page_target = None
    for t in targets:
        if t.get('type') == 'page' and not t.get('url', '').startswith('chrome://'):
            page_target = t
            break
    
    if not page_target:
        print("    未找到可用页面，创建新页面...")
        # 尝试创建新标签页
        resp = requests.get("http://localhost:9222/json/new?http://10.20.42.172:5000/", timeout=10)
        new_target = resp.json()
        page_target = new_target
        print(f"    创建新页面: {new_target.get('id')}")
    
    ws_url = page_target.get('webSocketDebuggerUrl')
    print(f"    WebSocket URL: {ws_url}")
    
except Exception as e:
    print(f"    ❌ 错误: {e}")
    exit(1)

# 报告数据
report = {
    "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    "steps": [],
    "findings": {}
}

def log(step, detail=""):
    report["steps"].append({"step": step, "detail": detail})
    print(f"\n[{step}] {detail}")

# 使用 WebSocket 连接
async def explore():
    try:
        async with websockets.connect(ws_url) as ws:
            log("WebSocket", "已连接")
            
            # 导航到目标平台
            log("导航", "访问 http://10.20.42.172:5000/")
            await ws.send(json.dumps({
                "id": 1,
                "method": "Page.navigate",
                "params": {"url": "http://10.20.42.172:5000/"}
            }))
            
            # 等待导航完成
            await asyncio.sleep(5)
            
            # 获取页面信息
            log("获取信息", "页面标题和URL")
            await ws.send(json.dumps({
                "id": 2,
                "method": "Runtime.evaluate",
                "params": {"expression": "document.title", "returnByValue": True}
            }))
            
            await asyncio.sleep(1)
            
            # 获取页面内容
            await ws.send(json.dumps({
                "id": 3,
                "method": "Runtime.evaluate",
                "params": {"expression": "document.body.innerText.substring(0, 1000)", "returnByValue": True}
            }))
            
            await asyncio.sleep(1)
            
            # 获取表单信息
            log("分析表单", "查找输入框和按钮")
            await ws.send(json.dumps({
                "id": 4,
                "method": "Runtime.evaluate",
                "params": {
                    "expression": """
                        JSON.stringify({
                            inputs: Array.from(document.querySelectorAll('input')).map(i => ({type: i.type, name: i.name})),
                            buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText)
                        })
                    """,
                    "returnByValue": True
                }
            }))
            
            await asyncio.sleep(1)
            
            # 填写登录信息
            log("填写登录", "用户名: shi_binbin, 密码: 111111")
            await ws.send(json.dumps({
                "id": 5,
                "method": "Runtime.evaluate",
                "params": {
                    "expression": """
                        var u = document.querySelector('input[type="text"]') || document.querySelector('input');
                        var p = document.querySelector('input[type="password"]');
                        if (u) { u.value = 'shi_binbin'; u.dispatchEvent(new Event('input', {bubbles: true})); }
                        if (p) { p.value = '111111'; p.dispatchEvent(new Event('input', {bubbles: true})); }
                        'filled'
                    """,
                    "returnByValue": True
                }
            }))
            
            await asyncio.sleep(1)
            
            # 提交登录
            log("提交登录", "点击登录按钮")
            await ws.send(json.dumps({
                "id": 6,
                "method": "Runtime.evaluate",
                "params": {
                    "expression": """
                        var btn = document.querySelector('button[type="submit"]') || document.querySelector('button');
                        if (btn) { btn.click(); 'clicked'; } else 'not found'
                    """,
                    "returnByValue": True
                }
            }))
            
            # 等待登录完成
            log("等待", "等待登录响应...")
            await asyncio.sleep(5)
            
            # 获取登录后信息
            log("检查结果", "获取登录后页面信息")
            await ws.send(json.dumps({
                "id": 7,
                "method": "Runtime.evaluate",
                "params": {"expression": "JSON.stringify({title: document.title, url: window.location.href})", "returnByValue": True}
            }))
            
            await asyncio.sleep(1)
            
            # 获取菜单项
            log("探索菜单", "获取功能菜单")
            await ws.send(json.dumps({
                "id": 8,
                "method": "Runtime.evaluate",
                "params": {
                    "expression": """
                        JSON.stringify(
                            Array.from(document.querySelectorAll('a, button, .ant-menu-item')).map(el => {
                                var text = (el.innerText || '').trim();
                                return text.length > 0 && text.length < 50 ? text : null;
                            }).filter(x => x !== null).slice(0, 20)
                        )
                    """,
                    "returnByValue": True
                }
            }))
            
            await asyncio.sleep(1)
            
            # 获取页面统计
            log("统计", "获取页面元素统计")
            await ws.send(json.dumps({
                "id": 9,
                "method": "Runtime.evaluate",
                "params": {
                    "expression": """
                        JSON.stringify({
                            links: document.querySelectorAll('a').length,
                            buttons: document.querySelectorAll('button').length,
                            inputs: document.querySelectorAll('input').length,
                            divs: document.querySelectorAll('div').length,
                            tables: document.querySelectorAll('table').length
                        })
                    """,
                    "returnByValue": True
                }
            }))
            
            await asyncio.sleep(1)
            
            # 获取 HTML
            log("保存", "获取页面 HTML")
            await ws.send(json.dumps({
                "id": 10,
                "method": "Runtime.evaluate",
                "params": {"expression": "document.documentElement.outerHTML", "returnByValue": True}
            }))
            
            # 收集响应
            responses = []
            for _ in range(15):
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=2.0)
                    data = json.loads(msg)
                    if "result" in data and "result" in data["result"]:
                        responses.append(data["result"]["result"].get("value"))
                except:
                    break
            
            log("完成", f"收到 {len(responses)} 条响应")
            
            # 生成报告
            print("\n" + "=" * 60)
            print("📊 探索报告")
            print("=" * 60)
            
            for step in report["steps"]:
                print(f"- {step['step']}: {step['detail']}")
            
            if len(responses) >= 3:
                print(f"\n页面标题: {responses[0]}")
                print(f"页面内容预览: {responses[1][:200]}..." if responses[1] else "")
            
            if len(responses) >= 4 and responses[3]:
                try:
                    form_data = json.loads(responses[3])
                    print(f"\n表单信息:")
                    print(f"  输入框: {len(form_data.get('inputs', []))} 个")
                    print(f"  按钮: {len(form_data.get('buttons', []))} 个")
                except:
                    pass
            
            if len(responses) >= 7 and responses[6]:
                try:
                    login_info = json.loads(responses[6])
                    print(f"\n登录结果:")
                    print(f"  标题: {login_info.get('title')}")
                    print(f"  URL: {login_info.get('url')}")
                    if "/login" in login_info.get('url', ''):
                        print("  状态: ❌ 仍在登录页")
                    else:
                        print("  状态: ✅ 登录成功")
                except:
                    pass
            
            if len(responses) >= 8 and responses[7]:
                try:
                    menu_items = json.loads(responses[7])
                    print(f"\n功能菜单 ({len(menu_items)} 项):")
                    for i, item in enumerate(menu_items[:10], 1):
                        print(f"  {i}. {item}")
                except:
                    pass
            
            if len(responses) >= 9 and responses[8]:
                try:
                    stats = json.loads(responses[8])
                    print(f"\n页面统计:")
                    for k, v in stats.items():
                        print(f"  {k}: {v}")
                except:
                    pass
            
            # 保存 HTML
            if len(responses) >= 10 and responses[9]:
                with open("explored_page.html", "w", encoding="utf-8") as f:
                    f.write(responses[9])
                print(f"\n页面已保存: explored_page.html")
            
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()

# 运行
asyncio.run(explore())
