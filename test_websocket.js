const WebSocket = require('ws');

// 测试WebSocket连接
const ws = new WebSocket('ws://120.55.187.125:9000/socket.io/?EIO=4&transport=websocket');

ws.on('open', function open() {
  console.log('WebSocket连接成功！');
  ws.close();
});

ws.on('message', function message(data) {
  console.log('收到消息:', data.toString());
});

ws.on('error', function error(err) {
  console.error('WebSocket连接错误:', err.message);
});

ws.on('close', function close() {
  console.log('WebSocket连接关闭');
});