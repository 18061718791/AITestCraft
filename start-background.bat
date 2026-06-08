@echo off
chcp 65001 >nul
echo ============================================
echo   AITestCraft 后台启动脚本
echo ============================================
echo.

REM 检查是否安装了 PM2
pm2 --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [INFO] 正在安装 PM2...
    npm install -g pm2
    if %ERRORLEVEL% neq 0 (
        echo [错误] PM2 安装失败，请手动运行: npm install -g pm2
        pause
        exit /b 1
    )
)

echo [INFO] 启动后端服务...
cd backend
call npm run build >nul 2>&1
start /b pm2 start ecosystem.config.js --env development
cd ..

echo [INFO] 启动前端服务...
cd frontend
call npm run build >nul 2>&1
start /b pm2 start ecosystem.config.cjs --env development
cd ..

echo.
echo [成功] 服务已后台启动！
echo.
echo 常用命令:
echo   查看状态: pm2 status
echo   查看日志: pm2 logs
echo   停止服务: pm2 stop all
echo   重启服务: pm2 restart all
echo   删除服务: pm2 delete all
echo.
echo 按任意键查看服务状态...
pause >nul
pm2 status
