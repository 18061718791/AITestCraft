#!/bin/bash

# MySQL数据导出脚本 - Linux/Mac版本
# 用于导出当前开发环境的MySQL数据，作为Docker部署的初始化数据

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 默认配置
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="aitestcraft"
DB_USER="root"
DB_PASS=""
OUTPUT_DIR="docker/mysql-init"

# 显示帮助
show_help() {
    cat << EOF
用法: $0 [选项]

选项:
  -h     主机地址 (默认: localhost)
  -P     端口号 (默认: 3306)
  -u     用户名 (默认: root)
  -p     密码
  -d     数据库名 (默认: aitestcraft)
  -o     输出目录 (默认: docker/mysql-init)
  --help 显示帮助

示例:
  $0 -p mypassword
  $0 -h 127.0.0.1 -P 3306 -u root -p password -d aitestcraft
EOF
}

# 打印信息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -h)
            DB_HOST="$2"
            shift 2
            ;;
        -P)
            DB_PORT="$2"
            shift 2
            ;;
        -u)
            DB_USER="$2"
            shift 2
            ;;
        -p)
            DB_PASS="$2"
            shift 2
            ;;
        -d)
            DB_NAME="$2"
            shift 2
            ;;
        -o)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            print_error "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
done

# 如果没有提供密码，提示输入
if [[ -z "$DB_PASS" ]]; then
    read -s -p "请输入MySQL密码: " DB_PASS
    echo
fi

echo "============================================"
echo "  AITestCraft MySQL数据导出工具"
echo "============================================"
echo

print_info "导出配置:"
echo "  主机: $DB_HOST"
echo "  端口: $DB_PORT"
echo "  数据库: $DB_NAME"
echo "  用户: $DB_USER"
echo "  输出目录: $OUTPUT_DIR"
echo

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 设置输出文件名（带时间戳）
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="$OUTPUT_DIR/init-data-$TIMESTAMP.sql"

print_info "正在导出数据..."
print_info "输出文件: $OUTPUT_FILE"
echo

# 执行mysqldump
if ! mysqldump -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" \
    --databases "$DB_NAME" \
    --routines \
    --triggers \
    --single-transaction \
    --set-gtid-purged=OFF > "$OUTPUT_FILE"; then
    print_error "导出失败！请检查:"
    echo "  1. MySQL是否运行"
    echo "  2. 用户名密码是否正确"
    echo "  3. 数据库 $DB_NAME 是否存在"
    exit 1
fi

echo
print_info "数据导出完成！"
print_info "文件位置: $OUTPUT_FILE"
echo

# 显示文件大小
if [[ -f "$OUTPUT_FILE" ]]; then
    FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    print_info "文件大小: $FILE_SIZE"
fi

echo
print_info "使用说明:"
echo "  1. 将导出的SQL文件复制到Linux服务器"
echo "  2. 放入项目的 docker/mysql-init/ 目录"
echo "  3. 运行 docker-compose up -d 时会自动导入"
echo

# 同时创建一个固定的文件名（用于Docker自动导入）
FIXED_FILE="$OUTPUT_DIR/init-data.sql"
cp "$OUTPUT_FILE" "$FIXED_FILE"
print_info "已创建固定名称文件: $FIXED_FILE"
print_info "（Docker部署时将使用此文件自动初始化数据库）"
