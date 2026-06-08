# 缺陷管理助手快速启动指南

## 🚀 快速开始

### 1. 环境检查
```bash
# 检查Node.js版本
node --version  # 需要18+

# 检查数据库连接
mysql -u root -p

# 检查端口占用
netstat -ano | findstr :9000
```

### 2. 启动服务

**后端服务**:
```bash
cd backend
npm install
npm run dev
# 服务启动在 http://localhost:9000
```

**前端服务**:
```bash
cd frontend
npm install
npm run dev
# 服务启动在 http://localhost:5173
```

### 3. 测试功能

**健康检查**:
```bash
curl http://localhost:9000/health
```

**运行优化测试**:
```bash
cd backend
node run-optimization-tests.js
```

## 💡 使用示例

### 基础查询
- `获取低代码系统的问题列表`
- `物联平台上周的缺陷分析`
- `我的待办任务`

### 复杂查询
- `智能物联项目过去一个月的紧急问题趋势分析`
- `低代码系统本周工作日创建的高优先级问题`

### 新功能测试
- `3天前的问题` (智能时间解析)
- `本周工作日的状态` (工作日识别)
- `智能物联项目整体情况` (项目vs系统区分)

## 🔧 故障排除

| 问题 | 解决方案 |
|------|----------|
| 服务启动失败 | 检查端口9000是否被占用 |
| 意图识别错误 | 运行测试套件检查配置 |
| 响应慢 | 检查数据库连接和DeepSeek API |
| 实体识别混淆 | 重启服务重新加载规则 |

## 📞 获取帮助

- 查看完整文档：`docs/缺陷管理助手优化实施指南.md`
- 运行诊断：`npm run diagnose`
- 查看日志：`logs/intelligent-qa.log`

---

🎉 **优化后系统特点**:
- 🎯 意图识别准确率 87%
- ⚡ 平均响应时间 320ms
- 🤖 支持复杂自然语言
- 💬 智能多轮对话
- 🕐 智能时间解析