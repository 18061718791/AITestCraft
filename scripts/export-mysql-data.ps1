# MySQL数据导出脚本 - PowerShell版本
# 用于导出当前开发环境的MySQL数据，作为Docker部署的初始化数据

param(
    [string]$Host = "localhost",
    [int]$Port = 3306,
    [string]$Database = "aitestcraft",
    [string]$User = "root",
    [string]$Password = "",
    [string]$OutputDir = "docker/mysql-init"
)

# 颜色函数
function Write-Info($message) {
    Write-Host "[INFO] $message" -ForegroundColor Green
}

function Write-Warn($message) {
    Write-Host "[WARN] $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

# 显示帮助
function Show-Help {
    @"
用法: .\export-mysql-data.ps1 [选项]

选项:
  -Host       主机地址 (默认: localhost)
  -Port       端口号 (默认: 3306)
  -User       用户名 (默认: root)
  -Password   密码
  -Database   数据库名 (默认: aitestcraft)
  -OutputDir  输出目录 (默认: docker/mysql-init)

示例:
  .\export-mysql-data.ps1 -Password mypassword
  .\export-mysql-data.ps1 -Host 127.0.0.1 -Port 3306 -User root -Password password -Database aitestcraft
"@
}

# 检查参数
if ($args -contains "--help") {
    Show-Help
    exit 0
}

Write-Host "============================================"
Write-Host "  AITestCraft MySQL数据导出工具"
Write-Host "============================================"
Write-Host

# 如果没有提供密码，提示输入
if ([string]::IsNullOrEmpty($Password)) {
    $Password = Read-Host "请输入MySQL密码" -AsSecureString
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
}

Write-Info "导出配置:"
Write-Host "  主机: $Host"
Write-Host "  端口: $Port"
Write-Host "  数据库: $Database"
Write-Host "  用户: $User"
Write-Host "  输出目录: $OutputDir"
Write-Host

# 创建输出目录
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# 设置输出文件名（带时间戳）
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outputFile = Join-Path $OutputDir "init-data-$timestamp.sql"

Write-Info "正在导出数据..."
Write-Info "输出文件: $outputFile"
Write-Host

# 执行mysqldump
$mysqldumpArgs = @(
    "-h$Host",
    "-P$Port",
    "-u$User",
    "-p$Password",
    "--databases", $Database,
    "--routines",
    "--triggers",
    "--single-transaction",
    "--set-gtid-purged=OFF"
)

try {
    & mysqldump $mysqldumpArgs 2>$null | Out-File -FilePath $outputFile -Encoding UTF8
    
    if ($LASTEXITCODE -ne 0) {
        throw "mysqldump failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Error "导出失败！请检查:"
    Write-Host "  1. MySQL是否运行"
    Write-Host "  2. 用户名密码是否正确"
    Write-Host "  3. 数据库 $Database 是否存在"
    Write-Host "  4. mysqldump是否在PATH中"
    exit 1
}

Write-Host
Write-Info "数据导出完成！"
Write-Info "文件位置: $outputFile"
Write-Host

# 显示文件大小
if (Test-Path $outputFile) {
    $fileSize = (Get-Item $outputFile).Length
    $fileSizeFormatted = if ($fileSize -gt 1MB) { 
        "{0:N2} MB" -f ($fileSize / 1MB) 
    } elseif ($fileSize -gt 1KB) { 
        "{0:N2} KB" -f ($fileSize / 1KB) 
    } else { 
        "$fileSize bytes" 
    }
    Write-Info "文件大小: $fileSizeFormatted"
}

Write-Host
Write-Info "使用说明:"
Write-Host "  1. 将导出的SQL文件复制到Linux服务器"
Write-Host "  2. 放入项目的 docker/mysql-init/ 目录"
Write-Host "  3. 运行 docker-compose up -d 时会自动导入"
Write-Host

# 同时创建一个固定的文件名（用于Docker自动导入）
$fixedFile = Join-Path $OutputDir "init-data.sql"
Copy-Item $outputFile $fixedFile -Force
Write-Info "已创建固定名称文件: $fixedFile"
Write-Info "（Docker部署时将使用此文件自动初始化数据库）"
