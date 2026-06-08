#!/usr/bin/env python3
"""
使用 browser-harness skill 方式探索平台
通过 Chrome DevTools Protocol (CDP) 控制浏览器
"""

import asyncio
import json
import requests
import subprocess
import time
import os
from cdp_use import CDPClient

# Chrome 路径 (根据系统调整)
CHROME_PATHS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    os.path.join(os.environ.get('LOCALAPPDATA', ''), r"Google\Chrome\Application\chrome.exe"),
    os.path.join(os.path.expanduser('~'), r"AppData\Local\Google\Chrome\Application\chrome.exe")
]

def find_chrome():
    """查找 Chrome 可执行文件"""
    for path in CHROME_PATHS:
        if os.path.exists(path):
            return path
    return None

def start_chrome_with_debugging():
    """启动 Chrome 并开启远程调试"""
    chrome_path = find_chrome()
    if not chrome_path:
        print("❌ 未找到 Chrome，请手动安装或指定路径")
        return False
    
    print(f"🔍 找到 Chrome: {chrome_path}")
    
    # 检查是否已有 Chrome 在运行远程调试
    try:
        response = requests.get("http://localhost:9222/json/version", timeout=2)
        if response.status_code == 200:
            print("✅ Chrome 远程调试已在运行")
            return True
    except:
        pass
    
    # 启动 Chrome 并开启远程调试
    print("🚀 正在启动 Chrome 远程调试模式...")
    user_data_dir = os.path.join(os.environ.get('TEMP', ''), 'chrome_debug_profile')
    cmd = [
        chrome_path,
        "--remote-debugging-port=9222",
        "--no-first-run",
        "--no-default-browser-check",
        f"--user-data-dir={user_data_dir}",
        "about:blank"
    ]
    
    try:
        subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # 等待 Chrome 启动
        for i in range(10):
            time.sleep(1)
            try:
                response = requests.get("http://localhost:9222/json/version", timeout=2)
                if response.status_code == 200:
                    print("✅ Chrome 远程调试启动成功")
                    return True
            except:
                continue
        print("❌ Chrome 启动超时")
        return False
    except Exception as e:
        print(f"❌ 启动 Chrome 失败: {e}")
        return False

async def get_ws_url():
    """获取 Chrome WebSocket URL"""
    try:
        response = requests.get("http://localhost:9222/json/version", timeout=5)
        data = response.json()
        ws_url = data.get("webSocketDebuggerUrl")
        print(f"🔍 发现 WebSocket URL: {ws_url}")
        return ws_url
    except Exception as e:
        print(f"❌ 无法连接到 Chrome: {e}")
        return None

async def explore_platform():
    """使用 CDP 探索目标平台"""
    
    # 启动 Chrome 远程调试
    if not start_chrome_with_debugging():
        print("\n💡 请手动启动 Chrome 并开启远程调试:")
        print("   chrome.exe --remote-debugging-port=9222")
        return
    
    # 获取 WebSocket URL
    ws_url = await get_ws_url()
    if not ws_url:
        print("\n❌ 无法获取 WebSocket URL")
        return
    
    client = CDPClient(ws_url)
    
    try:
        print("\n🔌 正在连接到 Chrome CDP...")
        await client.start()
        print("✅ 成功连接到 Chrome CDP")
        
        # 获取浏览器版本信息
        version = await client.send_raw("Browser.getVersion", {})
        print(f"📱 浏览器版本: {version.get('product', 'Unknown')}")
        
        # 创建新标签页访问目标平台
        print("\n🌐 正在创建新标签页并访问平台...")
        target = await client.send_raw("Target.createTarget", {
            "url": "http://10.20.42.172:5000/"
        })
        target_id = target.get("targetId")
        print(f"✅ 创建新标签页成功, Target ID: {target_id}")
        
        # 等待页面加载
        await asyncio.sleep(3)
        
        # 获取所有目标页面
        targets_response = await client.send_raw("Target.getTargets", {})
        targets = targets_response.get("targetInfos", [])
        
        # 找到我们创建的标签页
        page_target = None
        for t in targets:
            if t.get("targetId") == target_id:
                page_target = t
                break
        
        if page_target:
            print(f"📄 页面类型: {page_target.get('type')}")
            print(f"📄 页面标题: {page_target.get('title')}")
            print(f"🔗 页面 URL: {page_target.get('url')}")
        
        # 截图 - 使用 Target 的 screenshot 方法
        print("\n📸 正在截图...")
        try:
            # 尝试使用 Page.captureScreenshot
            screenshot = await client.send_raw("Page.captureScreenshot", {
                "format": "png",
                "fromSurface": True
            })
            
            if screenshot and "data" in screenshot:
                import base64
                img_data = base64.b64decode(screenshot["data"])
                with open("platform_screenshot.png", "wb") as f:
                    f.write(img_data)
                print("✅ 截图已保存: platform_screenshot.png")
        except Exception as e:
            print(f"⚠️ 截图失败: {e}")
        
        # 关闭标签页
        await client.send_raw("Target.closeTarget", {"targetId": target_id})
        print("\n✅ 探索完成")
        
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        await client.stop()
        print("🔌 已断开与 Chrome 的连接")

if __name__ == "__main__":
    asyncio.run(explore_platform())
