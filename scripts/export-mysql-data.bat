@echo off
chcp 65001 >nul
REM MySQL数据导出脚本 - Windows版本
REM 用于导出当前开发环境的MySQL数据，作为Docker部署的初始化数据

echo ============================================
echo   AITestCraft MySQL数据导出工具
echo ============================================
echo.

REM 设置默认参数
set DB_HOST=localhost
set DB_PORT=3306
set DB_NAME=aitestcraft
set DB_USER=root
set DB_PASS=
set OUTPUT_DIR=docker\mysql-init

REM 解析参数
:parse_args
if "%~1"=="" goto :done_parsing
if "%~1"=="-h" set DB_HOST=%~2& shift& shift& goto :parse_args
if "%~1"=="-P" set DB_PORT=%~2& shift& shift& goto :parse_args
if "%~1"=="-u" set DB_USER=%~2& shift& shift& goto :parse_args
if "%~1"=="-p" set DB_PASS=%~2& shift& shift& goto :parse_args
if "%~1"=="-d" set DB_NAME=%~2& shift& shift& goto :parse_args
if "%~1"=="-o" set OUTPUT_DIR=%~2& shift& shift& goto :parse_args
if "%~1"=="--help" goto :show_help
shift
goto :parse_args
:done_parsing

REM 如果没有提供密码，提示输入
if "%DB_PASS%"=="" (
    set /p DB_PASS="请输入MySQL密码: "
)

echo 导出配置:
echo   主机: %DB_HOST%
echo   端口: %DB_PORT%
echo   数据库: %DB_NAME%
echo   用户: %DB_USER%
echo   输出目录: %OUTPUT_DIR%
echo.

REM 创建输出目录
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

REM 设置输出文件名（带时间戳）
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set OUTPUT_FILE=%OUTPUT_DIR%\init-data-%TIMESTAMP%.sql

echo 正在导出数据...
echo 输出文件: %OUTPUT_FILE%
echo.

REM 执行mysqldump
mysqldump -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASS% --databases %DB_NAME% --routines --triggers --single-transaction --set-gtid-purged=OFF > "%OUTPUT_FILE%"

if %ERRORLEVEL% neq 0 (
    echo [错误] 导出失败！请检查:
    echo   1. MySQL是否运行
    echo   2. 用户名密码是否正确
    echo   3. 数据库 %DB_NAME% 是否存在
    exit /b 1
)

echo.
echo [成功] 数据导出完成！
echo 文件位置: %OUTPUT_FILE%
echo.
echo 文件大小:
for %%I in ("%OUTPUT_FILE%") do echo   %%~zI 字节
echo.
echo 使用说明:
echo   1. 将导出的SQL文件复制到Linux服务器
echo   2. 放入项目的 docker/mysql-init/ 目录
echo   3. 运行 docker-compose up -d 时会自动导入
echo.
goto :eof

:show_help
echo 用法: export-mysql-data.bat [选项]
echo.
echo 选项:
echo   -h     主机地址 (默认: localhost)
echo   -P     端口号 (默认: 3306)
echo   -u     用户名 (默认: root)
echo   -p     密码
echo   -d     数据库名 (默认: aitestcraft)
echo   -o     输出目录 (默认: docker/mysql-init)
echo   --help 显示帮助
echo.
echo 示例:
echo   export-mysql-data.bat -p mypassword
echo   export-mysql-data.bat -h 127.0.0.1 -P 3306 -u root -p password -d aitestcraft
echo.
goto :eof
