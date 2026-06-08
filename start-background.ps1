# AITestCraft 后台启动脚本 (PowerShell)
# 使用 PM2 管理进程，关闭窗口后服务继续运行

param(
    [switch]$Stop,
    [switch]$Restart,
    [switch]$Status,
    [switch]$Logs
)

function Write-Info($message) {
    Write-Host "[INFO] $message" -ForegroundColor Green
}

function Write-Error($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

function Test-PM2 {
    try {
        $null = Get-Command pm2 -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

function Install-PM2 {
    Write-Info "正在安装 PM2..."
    npm install -g pm2
    if ($LASTEXITCODE -eq 0) {
        Write-Info "PM2 安装成功"
        return $true
    } else {
        Write-Error "PM2 安装失败"
        return $false
    }
}

function Start-Services {
    # 检查并安装 PM2
    if (-not (Test-PM2)) {
        if (-not (Install-PM2)) {
            exit 1
        }
    }

    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  AITestCraft 后台启动" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host

    $projectRoot = $PSScriptRoot
    if (-not $projectRoot) {
        $projectRoot = Get-Location
    }

    # 启动后端
    Write-Info "启动后端服务..."
    Set-Location "$projectRoot\backend"
    
    # 先构建
    Write-Info "构建后端..."
    npm run build 2>$null
    
    # 使用 PM2 启动
    pm2 start ecosystem.config.js --env development
    Set-Location $projectRoot

    # 启动前端
    Write-Info "启动前端服务..."
    Set-Location "$projectRoot\frontend"
    
    # 先构建
    Write-Info "构建前端..."
    npm run build 2>$null
    
    # 使用 PM2 启动（前端使用 .cjs 扩展名）
    pm2 start ecosystem.config.cjs --env development
    Set-Location $projectRoot

    Write-Host
    Write-Info "服务已后台启动！"
    Write-Host
    Write-Host "常用命令:" -ForegroundColor Yellow
    Write-Host "  查看状态: pm2 status"
    Write-Host "  查看日志: pm2 logs"
    Write-Host "  停止服务: pm2 stop all"
    Write-Host "  重启服务: pm2 restart all"
    Write-Host "  删除服务: pm2 delete all"
    Write-Host
    
    # 保存 PM2 配置，以便开机自启
    pm2 save
    
    # 显示状态
    Start-Sleep -Seconds 2
    pm2 status
}

function Stop-Services {
    Write-Info "停止所有服务..."
    pm2 stop all
    pm2 delete all
    Write-Info "服务已停止"
}

function Restart-Services {
    Write-Info "重启所有服务..."
    pm2 restart all
    Write-Info "服务已重启"
    pm2 status
}

function Show-Status {
    pm2 status
}

function Show-Logs {
    pm2 logs
}

# 主逻辑
if ($Stop) {
    Stop-Services
} elseif ($Restart) {
    Restart-Services
} elseif ($Status) {
    Show-Status
} elseif ($Logs) {
    Show-Logs
} else {
    Start-Services
}
