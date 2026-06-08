# ============================================
# AITestCraft MySQL数据迁移导出脚本 (PowerShell版本)
# ============================================
# 用于将本地MySQL数据导出，迁移到Linux服务器的Docker MySQL中
# ============================================

# 设置默认参数
$DB_HOST = "localhost"
$DB_PORT = "3306"
$DB_NAME = "testcase_generator"
$DB_USER = "root"
$DB_PASS = ""
$OUTPUT_DIR = "migration"

# 解析参数
param(
    [string]$h = "localhost",
    [string]$P = "3306",
    [string]$u = "root",
    [string]$p = "",
    [string]$d = "testcase_generator",
    [string]$o = "migration",
    [switch]$help
)

# 如果提供了参数，覆盖默认值
if ($h -ne "localhost") { $DB_HOST = $h }
if ($P -ne "3306") { $DB_PORT = $P }
if ($u -ne "root") { $DB_USER = $u }
if ($p -ne "") { $DB_PASS = $p }
if ($d -ne "testcase_generator") { $DB_NAME = $d }
if ($o -ne "migration") { $OUTPUT_DIR = $o }

# 显示帮助
if ($help) {
    Write-Host "用法: .\export-mysql-for-migration.ps1 [选项]"
    Write-Host ""
    Write-Host "选项:"
    Write-Host "  -h     主机地址 (默认: localhost)"
    Write-Host "  -P     端口号 (默认: 3306)"
    Write-Host "  -u     用户名 (默认: root)"
    Write-Host "  -p     密码"
    Write-Host "  -d     数据库名 (默认: testcase_generator)"
    Write-Host "  -o     输出目录 (默认: migration)"
    Write-Host "  -help  显示帮助"
    Write-Host ""
    Write-Host "示例:"
    Write-Host "  .\export-mysql-for-migration.ps1 -p mypassword"
    Write-Host "  .\export-mysql-for-migration.ps1 -h 127.0.0.1 -P 3306 -u root -p password -d testcase_generator"
    exit
}

# 如果没有提供密码，提示输入
if ([string]::IsNullOrEmpty($DB_PASS)) {
    $DB_PASS = Read-Host "请输入MySQL密码" -AsSecureString
    $DB_PASS = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASS))
}

Write-Host "============================================"
Write-Host "  AITestCraft MySQL数据迁移导出工具"
Write-Host "============================================"
Write-Host ""

Write-Host "导出配置:"
Write-Host "  主机: $DB_HOST"
Write-Host "  端口: $DB_PORT"
Write-Host "  数据库: $DB_NAME"
Write-Host "  用户: $DB_USER"
Write-Host "  输出目录: $OUTPUT_DIR"
Write-Host ""

# 创建输出目录
if (!(Test-Path $OUTPUT_DIR)) {
    New-Item -ItemType Directory -Path $OUTPUT_DIR | Out-Null
}

# 设置输出文件名（带时间戳）
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$OUTPUT_FILE = "$OUTPUT_DIR\aitestcraft_migration_$TIMESTAMP.sql"

Write-Host "正在导出数据（使用UTF-8编码）..."
Write-Host "输出文件: $OUTPUT_FILE"
Write-Host ""

# 构建mysqldump命令
$dumpArgs = @(
    "-h$DB_HOST",
    "-P$DB_PORT",
    "-u$DB_USER",
    "-p$DB_PASS",
    "--databases", $DB_NAME,
    "--routines",
    "--triggers",
    "--single-transaction",
    "--set-gtid-purged=OFF",
    "--default-character-set=utf8mb4",
    "--hex-blob",
    "--complete-insert",
    "--extended-insert=FALSE",
    "--add-drop-database",
    "--add-drop-table",
    "--create-options",
    "--disable-keys",
    "--lock-tables=FALSE"
)

# 执行mysqldump
try {
    & mysqldump $dumpArgs | Out-File -FilePath $OUTPUT_FILE -Encoding UTF8
    
    if ($LASTEXITCODE -ne 0) {
        throw "mysqldump 执行失败"
    }
} catch {
    Write-Host "[错误] 导出失败！请检查:" -ForegroundColor Red
    Write-Host "  1. MySQL是否运行"
    Write-Host "  2. 用户名密码是否正确"
    Write-Host "  3. 数据库 $DB_NAME 是否存在"
    exit 1
}

# 在文件头部添加字符集设置
$header = @"
-- AITestCraft MySQL Migration Script
-- Generated: $(Get-Date)
-- Source Database: $DB_NAME
-- Source Host: $DB_HOST

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
SET AUTOCOMMIT = 0;

"@

$footer = @"

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;
SET UNIQUE_CHECKS = 1;
"@

# 读取原文件内容
$content = Get-Content $OUTPUT_FILE -Raw

# 写入新内容（头部 + 原内容 + 尾部）
$header + $content + $footer | Out-File -FilePath $OUTPUT_FILE -Encoding UTF8

Write-Host ""
Write-Host "[成功] 数据导出完成！" -ForegroundColor Green
Write-Host ""

# 显示文件信息
$fileInfo = Get-Item $OUTPUT_FILE
Write-Host "文件位置: $($fileInfo.FullName)"
Write-Host "文件大小: $([math]::Round($fileInfo.Length / 1KB, 2)) KB"

Write-Host ""
Write-Host "============================================"
Write-Host "  导出统计"
Write-Host "============================================"
Write-Host ""

# 统计表数量
$tableCount = (Select-String -Path $OUTPUT_FILE -Pattern "CREATE TABLE" -AllMatches).Matches.Count
Write-Host "[✓] 表结构数量: $tableCount"

# 统计INSERT语句数量
$insertCount = (Select-String -Path $OUTPUT_FILE -Pattern "INSERT INTO" -AllMatches).Matches.Count
Write-Host "[✓] 数据插入语句: $insertCount"

Write-Host ""
Write-Host "============================================"
Write-Host "  下一步：上传到Linux服务器"
Write-Host "============================================"
Write-Host ""
Write-Host "请执行以下命令将数据文件上传到服务器:"
Write-Host ""
Write-Host "  scp $OUTPUT_FILE user@your-server-ip:/opt/aitestcraft/"
Write-Host ""
Write-Host "然后在服务器上执行导入:"
Write-Host ""
Write-Host "  docker exec -i aitestcraft-mysql mysql -u root -proot aitestcraft < aitestcraft_migration_*.sql"
Write-Host ""
Write-Host "============================================"
