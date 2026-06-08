# AITestCraft MySQL 数据迁移指南

## 📋 概述

本指南帮助您将本地 Windows 环境的 MySQL 数据独立迁移到 Linux 服务器的 Docker MySQL 容器中。

**适用场景**：
- 项目已部署到 Linux 服务器，但数据库为空
- 需要将本地开发数据迁移到生产环境
- 独立的数据迁移操作（不重新部署应用）

---

## 🚀 数据迁移步骤

### 第一步：在 Windows 本地导出数据

```batch
# 进入项目目录
cd d:\自动化测试平台\AITestCraft-Tech-style

# 运行数据迁移导出脚本
scripts\export-mysql-data-for-migration.bat -p root

# 或使用完整参数
scripts\export-mysql-data-for-migration.bat -h localhost -P 3306 -u root -p root -d testcase_generator
```

导出完成后，会在 `migration/` 目录生成类似 `aitestcraft_migration_20260302_143052.sql` 的文件。

---

### 第二步：上传 SQL 文件到 Linux 服务器

在 Windows PowerShell 或 CMD 中执行：

```powershell
# 替换 your-server-ip 为实际服务器IP
scp migration\aitestcraft_migration_*.sql user@your-server-ip:/opt/aitestcraft/
```

或者使用其他工具（如 WinSCP、FileZilla）上传。

---

### 第三步：在 Linux 服务器导入数据

SSH 连接到服务器并执行：

```bash
# 连接到服务器
ssh user@your-server-ip

# 进入项目目录
cd /opt/aitestcraft

# 查看上传的SQL文件
ls -la *.sql
```

#### 方案 A：直接导入到 Docker MySQL（推荐）

```bash
# 方法1：使用 docker exec 导入（推荐）
docker exec -i aitestcraft-mysql mysql -u root -proot aitestcraft < aitestcraft_migration_*.sql

# 方法2：如果方法1有字符集问题，使用以下命令
docker exec -i aitestcraft-mysql sh -c 'exec mysql -u root -proot aitestcraft' < aitestcraft_migration_*.sql
```

#### 方案 B：复制到容器内再导入

```bash
# 复制SQL文件到容器内
docker cp aitestcraft_migration_*.sql aitestcraft-mysql:/tmp/

# 进入容器执行导入
docker exec -it aitestcraft-mysql bash

# 在容器内执行
mysql -u root -proot aitestcraft < /tmp/aitestcraft_migration_*.sql

# 退出容器
exit
```

---

### 第四步：验证数据迁移

```bash
# 进入 MySQL 容器
docker exec -it aitestcraft-mysql mysql -u root -proot

# 查看数据库
SHOW DATABASES;

# 使用数据库
USE aitestcraft;

# 查看表
SHOW TABLES;

# 查看各表记录数
SELECT 
    table_name,
    table_rows
FROM information_schema.tables
WHERE table_schema = 'aitestcraft';

# 检查中文数据（抽样检查）
SELECT * FROM systems LIMIT 5;
SELECT * FROM test_cases LIMIT 5;

# 退出
EXIT;
```

---

## 🔧 常见问题处理

### 1. 导入时出现乱码

如果在导入后发现中文乱码，请按以下步骤处理：

```bash
# 1. 检查 Docker MySQL 字符集
docker exec -it aitestcraft-mysql mysql -u root -proot -e "SHOW VARIABLES LIKE 'character_set%'"

# 2. 确保字符集为 utf8mb4
# 如果不是，需要重新创建数据库并指定字符集

docker exec -it aitestcraft-mysql mysql -u root -proot -e "
DROP DATABASE IF EXISTS aitestcraft;
CREATE DATABASE aitestcraft CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
"

# 3. 重新导入
docker exec -i aitestcraft-mysql mysql -u root -proot aitestcraft < aitestcraft_migration_*.sql
```

### 2. 表已存在错误

如果导入时提示表已存在：

```bash
# 清空现有数据（谨慎操作！）
docker exec -it aitestcraft-mysql mysql -u root -proot -e "DROP DATABASE IF EXISTS aitestcraft; CREATE DATABASE aitestcraft CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 重新导入
docker exec -i aitestcraft-mysql mysql -u root -proot aitestcraft < aitestcraft_migration_*.sql
```

### 3. 外键约束错误

```bash
# 临时禁用外键检查后导入
docker exec -i aitestcraft-mysql mysql -u root -proot -e "SET FOREIGN_KEY_CHECKS=0; SOURCE /tmp/aitestcraft_migration_*.sql; SET FOREIGN_KEY_CHECKS=1;"
```

### 4. 数据量太大导致超时

```bash
# 使用管道分批导入
cat aitestcraft_migration_*.sql | docker exec -i aitestcraft-mysql mysql -u root -proot aitestcraft
```

---

## ✅ 迁移验证清单

数据迁移完成后，请检查以下项目：

- [ ] **数据库存在**：`SHOW DATABASES;` 能看到 aitestcraft
- [ ] **表结构完整**：`SHOW TABLES;` 显示所有表
- [ ] **记录数正确**：各表记录数与本地一致
- [ ] **中文无乱码**：抽样检查中文数据显示正常
- [ ] **应用能访问**：前端页面数据加载正常
- [ ] **功能正常**：测试主要功能（增删改查）

---

## 📊 数据对比脚本

在服务器上执行以下脚本，对比本地和服务器的数据量：

```bash
# 创建验证脚本
cat > verify_migration.sh << 'EOF'
#!/bin/bash

echo "============================================"
echo "  数据迁移验证报告"
echo "============================================"
echo ""

echo "数据库: aitestcraft"
echo ""

# 获取各表记录数
docker exec aitestcraft-mysql mysql -u root -proot -N -e "
SELECT 
    table_name as '表名',
    table_rows as '记录数'
FROM information_schema.tables
WHERE table_schema = 'aitestcraft'
ORDER BY table_name;
"

echo ""
echo "============================================"
echo "  总记录数"
echo "============================================"

docker exec aitestcraft-mysql mysql -u root -proot -N -e "
SELECT 
    SUM(table_rows) as '总记录数'
FROM information_schema.tables
WHERE table_schema = 'aitestcraft';
"

echo ""
echo "============================================"
echo "  字符集检查"
echo "============================================"

docker exec aitestcraft-mysql mysql -u root -proot -e "
SHOW VARIABLES LIKE 'character_set%';
"

echo ""
echo "============================================"
echo "  抽样数据检查（systems表）"
echo "============================================"

docker exec aitestcraft-mysql mysql -u root -proot -e "
SELECT * FROM aitestcraft.systems LIMIT 3;
"

echo ""
echo "============================================"
EOF

chmod +x verify_migration.sh
./verify_migration.sh
```

---

## 🔄 重新迁移（如需要）

如果迁移失败需要重新开始：

```bash
# 1. 停止应用服务
docker-compose -f docker-compose.prod.yml stop backend

# 2. 清空数据库
docker exec -it aitestcraft-mysql mysql -u root -proot -e "
DROP DATABASE IF EXISTS aitestcraft;
CREATE DATABASE aitestcraft CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON aitestcraft.* TO 'aitestcraft'@'%';
FLUSH PRIVILEGES;
"

# 3. 重新导入数据
docker exec -i aitestcraft-mysql mysql -u root -proot aitestcraft < aitestcraft_migration_*.sql

# 4. 重启应用
docker-compose -f docker-compose.prod.yml start backend

# 5. 验证
docker-compose -f docker-compose.prod.yml logs -f backend
```

---

## 📝 注意事项

1. **备份重要**：迁移前确保本地数据已备份
2. **字符集一致**：确保导出和导入都使用 utf8mb4
3. **应用状态**：建议在低峰期进行迁移，或先停止后端服务
4. **数据验证**：迁移后务必验证数据完整性
5. **回滚方案**：保留 SQL 文件，以便需要时重新导入

---

## 📞 故障排查

### 无法连接到 MySQL 容器

```bash
# 检查容器状态
docker ps | grep mysql

# 检查日志
docker logs aitestcraft-mysql

# 重启 MySQL 服务
docker-compose -f docker-compose.prod.yml restart mysql
```

### 导入速度太慢

```bash
# 优化导入参数
docker exec -i aitestcraft-mysql mysql -u root -proot -e "
SET GLOBAL innodb_flush_log_at_trx_commit = 2;
SET GLOBAL innodb_buffer_pool_size = 536870912;
" aitestcraft < aitestcraft_migration_*.sql
```

### 内存不足

```bash
# 增加 Docker 内存限制（在 docker-compose.prod.yml 中）
services:
  mysql:
    deploy:
      resources:
        limits:
          memory: 2G
```

---

**迁移完成后，您的应用应该能够正常访问所有数据！** 🎉
