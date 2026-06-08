@echo off
chcp 65001 >nul
REM ============================================
REM AITestCraft MySQL数据库初始化脚本
REM ============================================
REM 功能：删除原有表 -> 创建新表 -> 导入数据
REM ============================================

echo ============================================
echo   AITestCraft MySQL数据库初始化工具
echo ============================================
echo.

REM 设置默认参数
set DB_HOST=localhost
set DB_PORT=3306
set DB_NAME=testcase_generator
set DB_USER=root
set DB_PASS=

REM 解析参数
:parse_args
if "%~1"=="" goto :done_parsing
if "%~1"=="-h" set DB_HOST=%~2& shift& shift& goto :parse_args
if "%~1"=="-P" set DB_PORT=%~2& shift& shift& goto :parse_args
if "%~1"=="-u" set DB_USER=%~2& shift& shift& goto :parse_args
if "%~1"=="-p" set DB_PASS=%~2& shift& shift& goto :parse_args
if "%~1"=="-d" set DB_NAME=%~2& shift& shift& goto :parse_args
if "%~1"=="--help" goto :show_help
shift
goto :parse_args
:done_parsing

REM 如果没有提供密码，提示输入
if "%DB_PASS%"=="" (
    set /p DB_PASS="请输入MySQL密码: "
)

echo.
echo 数据库配置:
echo   主机: %DB_HOST%
echo   端口: %DB_PORT%
echo   数据库: %DB_NAME%
echo   用户: %DB_USER%
echo.

REM 步骤1: 导出当前数据
echo [步骤1/3] 正在导出当前数据...
set BACKUP_FILE=migration\backup_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
set BACKUP_FILE=%BACKUP_FILE: =0%

if not exist "migration" mkdir "migration"

mysqldump -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASS% ^
    --databases %DB_NAME% ^
    --single-transaction ^
    --set-gtid-purged=OFF ^
    --default-character