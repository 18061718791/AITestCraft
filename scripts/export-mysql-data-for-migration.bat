@echo off
chcp 65001 >nul
REM ============================================
REM AITestCraft MySQL数据迁移导出脚本
REM ============================================
REM 用于将本地MySQL数据导出，迁移到Linux服务器的Docker MySQL中
REM ============================================

echo ============================================
echo   AITestCraft MySQL数据迁移导出工具
echo ============================================
echo.

REM 设置默认参数
set DB_HOST=localhost
set DB_PORT=3306
set DB_NAME=testcase_generator
set DB_USER=root
set DB_PASS=
set OUTPUT_DIR=migration

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

echo.
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
set OUTPUT_FILE=%OUTPUT_DIR%\aitestcraft_migration_%TIMESTAMP%.sql

echo 正在导出数据（使用UTF-8编码）...
echo 输出文件: %OUTPUT_FILE%
echo.

REM 执行mysqldump（包含完整字符集设置）
mysqldump -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASS% ^
    --databases %DB_NAME% ^
    --routines ^
    --triggers ^
    --single-transaction ^
    --set-gtid-purged=OFF ^
    --default-character-set=utf8mb4 ^
    --hex-blob ^
    --complete-insert ^
    --extended-insert=FALSE ^
    --add-drop-database ^
    --add-drop-table ^
    --create-options ^
    --disable-keys ^
    --lock-tables=FALSE ^
    > "%OUTPUT_FILE%"

if %ERRORLEVEL% neq 0 (
    echo [错误] 导出失败！请检查:
    echo   1. MySQL是否运行
    echo   2. 用户名密码是否正确
    echo   3. 数据库 %DB_NAME% 是否存在
    exit /b 1
)

REM 在文件头部添加字符集设置
echo -- AITestCraft MySQL Migration Script > "%OUTPUT_FILE%.tmp"
echo -- Generated: %date% %time% >> "%OUTPUT_FILE%.tmp"
echo -- Source Database: %DB_NAME% >> "%OUTPUT_FILE%.tmp"
echo -- Source Host: %DB_HOST% >> "%OUTPUT_FILE%.tmp"
echo. >> "%OUTPUT_FILE%.tmp"
echo SET NAMES utf8mb4; >> "%OUTPUT_FILE%.tmp"
echo SET FOREIGN_KEY_CHECKS = 0; >> "%OUTPUT_FILE%.tmp"
echo SET UNIQUE_CHECKS = 0; >> "%OUTPUT_FILE%.tmp"
echo SET AUTOCOMMIT = 0; >> "%OUTPUT_FILE%.tmp"
echo. >> "%OUTPUT_FILE%.tmp"
type "%OUTPUT_FILE%" >> "%OUTPUT_FILE%.tmp"
echo. >> "%OUTPUT_FILE%.tmp"
echo COMMIT; >> "%OUTPUT_FILE%.tmp"
echo SET FOREIGN_KEY_CHECKS = 1; >> "%OUTPUT_FILE%.tmp"
echo SET UNIQUE_CHECKS = 1; >> "%OUTPUT_FILE%.tmp"
move /Y "%OUTPUT_FILE%.tmp" "%OUTPUT_FILE%" >nul

echo.
echo [成功] 数据导出完成！
echo.

REM 显示文件信息
for %%I in ("%OUTPUT_FILE%") do (
    echo 文件位置: %%~fI
    echo 文件大小: %%~zI 字节
)

echo.
echo ============================================
echo   导出统计
echo ============================================
echo.

REM 统计表数量
for /f "tokens=*" %%a in ('find /c "CREATE TABLE" "%OUTPUT_FILE%"') do (
    for /f "tokens=3" %%b in ("%%a") do (
        echo [✓] 表结构数量: %%b
    )
)

REM 统计INSERT语句数量
for /f "tokens=*" %%a in ('find /c "INSERT INTO" "%OUTPUT_FILE%"') do (
    for /f "tokens=3" %%b in ("%%a") do (
        echo [✓] 数据插入语句: %%b
    )
)

echo.
echo ============================================
echo   下一步：上传到Linux服务器
echo ============================================
echo.
echo 请执行以下命令将数据文件上传到服务器:
echo.
echo   scp %OUTPUT_FILE% user@your-server-ip:/opt/aitestcraft/
echo.
echo 然后在服务器上执行导入:
echo.
echo   docker exec -i aitestcraft-mysql mysql -u root -p aitestcraft ^< aitestcraft_migration_*.sql
echo.
echo ============================================

goto :eof

:show_help
echo 用法: export-mysql-data-for-migration.bat [选项]
echo.
echo 选项:
echo   -h     主机地址 (默认: localhost)
echo   -P     端口号 (默认: 3306)
echo   -u     用户名 (默认: root)
echo   -p     密码
echo   -d     数据库名 (默认: testcase_generator)
echo   -o     输出目录 (默认: migration)
echo   --help 显示帮助
echo.
echo 示例:
echo   export-mysql-data-for-migration.bat -p mypassword
echo   export-mysql-data-for-migration.bat -h 127.0.0.1 -P 3306 -u root -p password -d testcase_generator
echo.
goto :eof
