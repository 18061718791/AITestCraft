# AITestCraft Docker部署指南

## 前置要求

### 系统要求
- Linux服务器（Ubuntu 20.04+ / CentOS 7+ / Debian 10+）
- 至少 2GB RAM
- 至少 10GB 磁盘空间
- 服务器能够访问互联网

### 软件要求
- Docker 20.10+
- Docker Compose 2.0+

### 安装Docker（如未安装）

**Ubuntu/Debian:**
```bash
# 更新包索引
sudo apt-get update

# 安装依赖
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

# 添加Docker官方GPG密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加Docker软件源
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动Docker
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到docker组（免sudo运行docker）
sudo usermod -aG docker $USER
newgrp docker
```

**CentOS/RHEL:**
```bash
# 安装依赖
sudo yum install -y yum-utils

# 添加Docker软件源
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 安装Docker
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动Docker
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到docker组
sudo usermod -aG docker $USER
newgrp docker
```

## 部署步骤

### 1. 导出当前MySQL数据（在Windows开发环境执行）

**使用Batch脚本:**
```batch
scripts\export-mysql-data.bat -p your_mysql_password
```

**使用PowerShell脚本:**
```powershell
.\scripts\export-mysql-data.ps1 -Password your_mysql_password
```

**使用Bash脚本 (Git Bash/WSL):**
```bash
./scripts/export-mysql-data.sh -p your_mysql_password
```

导出成功后，会在 `docker/mysql-init/` 目录生成 `init-data.sql` 文件。

### 2. 上传项目到Linux服务器

```bash
# 方式1: 使用scp上传整个项目（在Windows PowerShell或Git Bash中执行）
scp -r AITestCraft-Tech-style user@your-server-ip:/home/user/

# 方式2: 使用rsync（如果有）
rsync -avz --progress AITestCraft-Tech-style/ user@your-server-ip:/home/user/AITestCraft-Tech-style/

# 方式3: 打包后上传
# Windows上执行:
tar -czvf aitestcraft.tar.gz AITestCraft-Tech-style
scp aitestcraft.tar.gz user@your-server-ip:/home/user/

# Linux服务器上解压:
ssh user@your-server-ip "cd /home/user && tar -xzvf aitestcraft.tar.gz"
```

### 3. 配置环境变量

```bash
cd AITestCraft-Tech-style

# 复制环境变量模板
cp .env.example .env

# 编辑.env文件
nano .env  # 或使用 vim .env
```

**必须修改的配置项：**

```env
# MySQL数据库密码（修改为强密码）
MYSQL_ROOT_PASSWORD=your_strong_root_password
MYSQL_PASSWORD=your_strong_database_password

# DeepSeek API密钥（从DeepSeek控制台获取）
DEEPSEEK_API_KEY=sk-your-actual-api-key

# 如果使用云服务器，修改IP地址
VITE_API_URL=http://your-server-ip:9000
VITE_SOCKET_URL=http://your-server-ip:9000
```

### 4. 运行部署脚本

```bash
# 给部署脚本添加执行权限
chmod +x deploy.sh

# 运行部署脚本
./deploy.sh
```

部署脚本会自动：
- 检查Docker环境
- 构建Docker镜像
- 启动所有服务
- 执行数据库迁移
- 检查服务健康状态

### 5. 验证部署

部署完成后，访问以下地址验证：

- **前端页面**: http://your-server-ip:5175
- **后端API**: http://your-server-ip:9000/health
- **健康检查**: http://your-server-ip:9000/health

## 常用操作

### 查看服务状态
```bash
docker-compose ps
```

### 查看日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql
```

### 停止服务
```bash
./deploy.sh stop
# 或
docker-compose down
```

### 重启服务
```bash
./deploy.sh restart
# 或
docker-compose restart
```

### 更新部署
```bash
# 拉取最新代码后重新部署
./deploy.sh
```

### 进入容器执行命令
```bash
# 进入后端容器
docker-compose exec backend sh

# 进入MySQL容器
docker-compose exec mysql mysql -u root -p

# 执行Prisma命令
docker-compose exec backend npx prisma migrate status
docker-compose exec backend npx prisma studio
```

## 防火墙配置

如果服务器启用了防火墙，需要开放以下端口：

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 5175/tcp
sudo ufw allow 9000/tcp
sudo ufw reload

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=5175/tcp
sudo firewall-cmd --permanent --add-port=9000/tcp
sudo firewall-cmd --reload

# 或直接使用iptables
sudo iptables -A INPUT -p tcp --dport 5175 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 9000 -j ACCEPT
```

## 数据备份

### 备份MySQL数据
```bash
# 创建备份目录
mkdir -p backups

# 备份数据库
docker-compose exec mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} aitestcraft > backups/aitestcraft_$(date +%Y%m%d_%H%M%S).sql
```

### 恢复MySQL数据
```bash
# 恢复数据库
docker-compose exec -T mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} aitestcraft < backups/your-backup-file.sql
```

### 备份上传文件
```bash
# 上传文件存储在Docker卷中
docker run --rm -v aitestcraft_uploads_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/uploads_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
```

## 故障排查

### 服务无法启动
```bash
# 检查日志
docker-compose logs

# 检查端口占用
sudo netstat -tlnp | grep -E '5175|9000|3306'

# 停止占用端口的服务
sudo systemctl stop apache2  # 如果有Apache
sudo systemctl stop nginx    # 如果有Nginx
```

### 数据库连接失败
```bash
# 检查MySQL容器状态
docker-compose ps mysql

# 查看MySQL日志
docker-compose logs mysql

# 检查数据库是否初始化
docker-compose exec mysql mysql -u root -p -e "SHOW DATABASES;"
```

### 前端无法访问API
```bash
# 检查后端服务
curl http://localhost:9000/health

# 检查前端配置
docker-compose exec frontend env | grep VITE

# 重启前端服务
docker-compose restart frontend
```

### 容器资源使用过高
```bash
# 查看容器资源使用
docker stats

# 重启服务释放资源
docker-compose restart

# 清理未使用的镜像和卷
docker system prune -a --volumes
```

## 数据迁移说明

### 从Windows开发环境迁移到Linux服务器

1. **导出数据（Windows）:**
   ```batch
   scripts\export-mysql-data.bat -p your_password
   ```

2. **上传SQL文件到服务器:**
   ```bash
   scp docker/mysql-init/init-data.sql user@server-ip:/path/to/project/docker/mysql-init/
   ```

3. **首次启动Docker（Linux）:**
   ```bash
   docker-compose up -d
   ```
   
   MySQL容器会自动检测到 `docker-entrypoint-initdb.d` 目录下的SQL文件并执行导入。

4. **验证数据导入:**
   ```bash
   docker-compose exec mysql mysql -u root -p -e "USE aitestcraft; SHOW TABLES;"
   ```

### 注意事项
- 首次启动MySQL时会自动执行初始化SQL
- 数据导入完成后会持久化到Docker卷，后续重启不会重复导入
- 如需重新导入，需要删除mysql_data卷：`docker-compose down -v`

## 安全建议

1. **修改默认密码**: 确保修改所有默认密码
2. **使用HTTPS**: 生产环境建议使用Nginx + SSL证书
3. **限制端口访问**: 仅开放必要的端口（5175, 9000）
4. **定期备份**: 设置定时任务自动备份数据库
5. **更新镜像**: 定期更新基础镜像以获取安全补丁

## 升级指南

### 更新应用代码
```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新部署
./deploy.sh
```

### 更新Docker镜像
```bash
# 1. 拉取最新基础镜像
docker-compose pull

# 2. 重新构建
docker-compose build --no-cache

# 3. 重启服务
docker-compose up -d
```

## 联系支持

如有问题，请检查：
1. 日志输出: `docker-compose logs -f`
2. 服务状态: `docker-compose ps`
3. 系统资源: `docker stats`
