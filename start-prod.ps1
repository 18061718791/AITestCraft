#!/usr/bin/env pwsh
# AITestCraft 生产环境启动脚本
# 用法: .\start-prod.ps1 [up|down|logs|restart]

param(
    [Parameter()]
    [ValidateSet("up", "down", "logs", "restart", "build", "ps")]
    [string]$Action = "up"
)

$ErrorActionPreference = "Stop"

# 设置环境变量文件
$env:COMPOSE_ENV_FILES = ".env.docker"
$ComposeFile = "docker-compose.prod.yml"

Write-Host "🚀 AITestCraft 生产环境管理脚本" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "配置文件: $ComposeFile" -ForegroundColor Gray
Write-Host "环境文件: $env:COMPOSE_ENV_FILES" -ForegroundColor Gray
Write-Host ""

switch ($Action) {
    "up" {
        Write-Host "▶️  启动服务..." -ForegroundColor Green
        docker-compose -f $ComposeFile up -d
        Write-Host ""
        Write-Host "✅ 服务已启动！" -ForegroundColor Green
        Write-Host "   前端: http://localhost" -ForegroundColor Gray
        Write-Host "   后端: http://localhost:9000" -ForegroundColor Gray
    }
    "down" {
        Write-Host "⏹️  停止服务..." -ForegroundColor Yellow
        docker-compose -f $ComposeFile down
        Write-Host "✅ 服务已停止" -ForegroundColor Green
    }
    "restart" {
        Write-Host "🔄 重启服务..." -ForegroundColor Yellow
        docker-compose -f $ComposeFile restart
        Write-Host "✅ 服务已重启" -ForegroundColor Green
    }
    "logs" {
        Write-Host "📋 查看日志..." -ForegroundColor Cyan
        docker-compose -f $ComposeFile logs -f
    }
    "build" {
        Write-Host "🔨 重新构建..." -ForegroundColor Cyan
        docker-compose -f $ComposeFile up -d --build
        Write-Host "✅ 构建完成" -ForegroundColor Green
    }
    "ps" {
        Write-Host "📊 服务状态:" -ForegroundColor Cyan
        docker-compose -f $ComposeFile ps
    }
}
