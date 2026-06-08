const WebSocket = require('ws');
const axios = require('axios');

async function diagnoseWebSocket() {
    console.log('🔍 生产环境WebSocket连接诊断\n');
    
    const wsUrl = 'ws://120.55.187.125:9000';
    const httpUrl = 'http://120.55.187.125:9000';
    
    console.log('1. 测试HTTP连接...');
    try {
        const response = await axios.get(`${httpUrl}/health`, { timeout: 5000 });
        console.log('✅ HTTP连接正常:', response.status, response.data);
    } catch (error) {
        console.log('❌ HTTP连接失败:', error.message);
        return;
    }
    
    console.log('\n2. 测试WebSocket连接...');
    
    return new Promise((resolve) => {
        const ws = new WebSocket(wsUrl);
        
        ws.on('open', () => {
            console.log('✅ WebSocket连接成功建立');
            console.log('   协议版本:', ws.protocol);
            console.log('   扩展:', ws.extensions);
            
            // 发送测试消息
            ws.send(JSON.stringify({
                type: 'test',
                message: 'WebSocket连接测试'
            }));
            
            setTimeout(() => {
                ws.close();
                resolve(true);
            }, 2000);
        });
        
        ws.on('message', (data) => {
            console.log('📨 收到WebSocket消息:', data.toString());
        });
        
        ws.on('error', (error) => {
            console.log('❌ WebSocket连接错误:', error.message);
            console.log('   错误代码:', error.code);
            console.log('   错误类型:', error.type);
            
            // 尝试使用Socket.IO客户端连接
            testSocketIOConnection();
            resolve(false);
        });
        
        ws.on('close', (code, reason) => {
            console.log('🔌 WebSocket连接关闭:', { code, reason: reason.toString() });
        });
        
        // 设置超时
        setTimeout(() => {
            if (ws.readyState === WebSocket.CONNECTING) {
                console.log('⏰ WebSocket连接超时');
                ws.terminate();
                resolve(false);
            }
        }, 10000);
    });
}

function testSocketIOConnection() {
    console.log('\n3. 尝试Socket.IO连接...');
    
    const { io } = require('socket.io-client');
    
    const socket = io('http://120.55.187.125:9000', {
        transports: ['websocket'], // 强制使用WebSocket
        timeout: 10000,
        reconnection: false
    });
    
    socket.on('connect', () => {
        console.log('✅ Socket.IO WebSocket连接成功');
        console.log('   Socket ID:', socket.id);
        socket.disconnect();
    });
    
    socket.on('connect_error', (error) => {
        console.log('❌ Socket.IO WebSocket连接失败:', error.message);
        
        // 尝试HTTP轮询
        console.log('\n4. 尝试Socket.IO HTTP轮询连接...');
        const pollingSocket = io('http://120.55.187.125:9000', {
            transports: ['polling'], // 强制使用HTTP轮询
            timeout: 10000,
            reconnection: false
        });
        
        pollingSocket.on('connect', () => {
            console.log('✅ Socket.IO HTTP轮询连接成功');
            console.log('   Socket ID:', pollingSocket.id);
            pollingSocket.disconnect();
        });
        
        pollingSocket.on('connect_error', (pollingError) => {
            console.log('❌ Socket.IO HTTP轮询连接失败:', pollingError.message);
        });
    });
}

// 运行诊断
diagnoseWebSocket().then(success => {
    console.log('\n📊 诊断总结:');
    if (success) {
        console.log('✅ WebSocket连接正常，问题可能在前端配置');
    } else {
        console.log('❌ WebSocket连接存在问题，可能是网络策略或防火墙配置');
        console.log('   建议检查:');
        console.log('   - 服务器防火墙设置');
        console.log('   - 安全组策略');
        console.log('   - 反向代理配置');
        console.log('   - 负载均衡器WebSocket支持');
    }
}).catch(error => {
    console.log('诊断过程中出错:', error);
});