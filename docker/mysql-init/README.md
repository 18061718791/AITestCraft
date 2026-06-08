# MySQL初始化数据目录

## 说明

此目录用于存放MySQL数据库初始化SQL文件。当Docker Compose首次启动MySQL容器时，会自动执行此目录下的所有 `.sql`、`.sql.gz`、`.sh` 文件。

## 使用流程

### 1. 导出当前MySQL数据

在Windows开发环境执行以下任一命令：

**使用Batch脚本:**
```batch
scripts\export-mysql-data.bat -p your_password
```

**使用PowerShell脚本:**
```powershell
.\scripts\export-mysql-data.ps1 -Password your_password
```

**使用Bash脚本 (Git Bash/WSL):**
```bash
./scripts/export-mysql-data.sh -p your_password
```

### 2. 复制SQL文件到Linux服务器

```bash
# 使用scp复制到服务器
scp docker/mysql-init/init-data.sql user@your-server-ip:/path/to/project/docker/mysql-init/
```

### 3. 启动Docker服务

在Linux服务器执行：

```bash
# 首次启动会自动导入初始化数据
docker-compose up -d

# 查看导入日志
docker-compose logs -f mysql
```

## 注意事项

1. **首次启动**: MySQL容器首次启动时会自动执行初始化脚本
2. **数据持久化**: 初始化完成后，数据会持久化到 `mysql_data` Docker卷中
3. **重复执行**: 如果数据库已存在数据，初始化脚本不会重复执行
4. **文件命名**: 建议按数字前缀命名，如 `01-init-schema.sql`、`02-init-data.sql`，确保执行顺序

## 手动导入数据

如果需要在已运行的容器中导入数据：

```bash
# 复制SQL文件到容器
docker cp docker/mysql-init/init-data.sql aitestcraft-mysql:/tmp/

# 进入容器执行导入
docker-compose exec mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} aitestcraft < /tmp/init-data.sql
```

## 备份当前数据

```bash
# 导出当前数据库
docker-compose exec mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} aitestcraft > backup-$(date +%Y%m%d).sql
```
