#!/bin/bash

# AITestCraft Docker部署脚本
# 版本: 2.0 (支持多LLM Provider)
# 适用于Linux服务器

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的信息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_section() {
    echo -e "${BLUE}[SECTION]${NC} $1"
}

# 检查Docker是否安装
check_docker() {
    print_info "检查Docker环境..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker未安装，请先安装Docker"
        echo "安装指南: https://docs.docker.com/engine/install/"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose未安装，请先安装Docker Compose"
        echo "安装指南: https://docs.docker.com/compose/install/"
        exit 1
    fi

    print_info "Docker环境检查通过"
}

# 检查环境变量文件
check_env() {
    print_info "检查环境变量配置..."
    
    # 检查.env.docker文件（生产环境）
    if [ ! -f .env.docker ]; then
        if [ -f .env.prod.example ]; then
            print_warn ".env.docker文件不存在，从.env.prod.example复制"
            cp .env.prod.example .env.docker
            print_error "请编辑.env.docker文件，配置必要的参数（特别是API密钥和数据库密码）"
            exit 1
        else
            print_error ".env.prod.example文件不存在"
            exit 1
        fi
    fi

    # 加载环境变量
    export $(cat .env.docker | grep -v '^#' | xargs)

    # 检查必需的变量
    local has_error=0

    # 检查MySQL密码
    if [ -z "$MYSQL_ROOT_PASSWORD" ] || [ "$MYSQL_ROOT_PASSWORD" = "your_secure_root_password_here" ]; then
        print_error "请先在.env.docker文件中配置MYSQL_ROOT_PASSWORD"
        has_error=1
    fi

    if [ -z "$MYSQL_PASSWORD" ] || [ "$MYSQL_PASSWORD" = "your_secure_database_password_here" ]; then
        print_error "请先在.env.docker文件中配置MYSQL_PASSWORD"
        has_error=1
    fi

    # 检查LLM Provider配置
    if [ -z "$LLM_PROVIDER" ]; then
        print_warn "LLM_PROVIDER未配置，将使用默认值: deepseek"
    fi

    # 检查至少配置了一个LLM Provider的API密钥
    local has_llm_key=0
    if [ -n "$DEEPSEEK_API_KEY" ] && [ "$DEEPSEEK_API_KEY" != "your_deepseek_api_key_here" ]; then
        print_info "DeepSeek API密钥已配置"
        has_llm_key=1
    fi

    if [ -n "$VOLCANO_API_KEY" ] && [ "$VOLCANO_API_KEY" != "your_volcano_api_key_here" ]; then
        print_info "火山引擎 API密钥已配置"
        has_llm_key=1
    fi

    if [ $has_llm_key -eq 0 ]; then
        print_error "请至少在.env.docker文件中配置一个LLM Provider的API密钥（DEEPSEEK_API_KEY 或 VOLCANO_API_KEY）"
        has_error=1
    fi

    # 检查Provider与API密钥匹配
    if [ "$LLM_PROVIDER" = "deepseek" ] && ([ -z "$DEEPSEEK_API_KEY" ] || [ "$DEEPSEEK_API_KEY" = "your_deepseek_api_key_here" ]); then
        print_warn "默认Provider为deepseek，但未配置DEEPSEEK_API_KEY"
    fi

    if [ "$LLM_PROVIDER" = "volcano-coding" ] && ([ -z "$VOLCANO_API_KEY" ] || [ "$VOLCANO_API_KEY" = "your_volcano_api_key_here" ]); then
        print_warn "默认Provider为volcano-coding，但未配置VOLCANO_API_KEY"
    fi

    if [ $has_error -eq 1 ]; then
        exit 1
    fi

    print_info "环境变量检查通过"
}

# 构建镜像
build_images() {
    print_info "开始构建Docker镜像..."
    docker-compose -f docker-compose.prod.yml --env-file .env.docker build --no-cache
    print_info "镜像构建完成"
}

# 启动服务
start_services() {
    print_info "启动服务..."
    docker-compose -f docker-compose.prod.yml --env-file .env.docker up -d
    print_info "服务已启动"
}

# 等待服务就绪
wait_for_services() {
    print_info "等待服务就绪..."
    
    # 等待MySQL
    print_info "等待MySQL就绪..."
    until docker-compose -f docker-compose.prod.yml --env-file .env.docker exec -T mysql mysqladmin ping -h localhost -u root -p"${MYSQL_ROOT_PASSWORD}" --silent; do
        sleep 2
    done
    print_info "MySQL已就绪"

    # 等待Redis
    print_info "等待Redis就绪..."
    until docker-compose -f docker-compose.prod.yml --env-file .env.docker exec -T redis redis-cli ping | grep -q "PONG"; do
        sleep 2
    done
    print_info "Redis已就绪"

    # 等待后端
    print_info "等待后端服务就绪..."
    until curl -s http://localhost:9000/health > /dev/null; do
        sleep 2
    done
    print_info "后端服务已就绪"

    # 等待前端
    print_info "等待前端服务就绪..."
    until curl -s http://localhost/ > /dev/null; do
        sleep 2
    done
    print_info "前端服务已就绪"
}

# 执行数据库迁移
run_migrations() {
    print_info "执行数据库迁移..."
    docker-compose -f docker-compose.prod.yml --env-file .env.docker exec -T backend npx prisma migrate deploy
    print_info "数据库迁移完成"
}

# 初始化系统配置
init_configs() {
    print_info "初始化系统配置..."
    docker-compose -f docker-compose.prod.yml --env-file .env.docker exec -T backend node -e "
        const { configService } = require('./dist/services/configService');
        configService.generateInitialConfigs().then(() => {
            console.log('系统配置初始化完成');
            process.exit(0);
        }).catch((err) => {
            console.error('系统配置初始化失败:', err);
            process.exit(1);
        });
    "
    print_info "系统配置初始化完成"
}

# 显示服务状态
show_status() {
    print_section "服务状态"
    docker-compose -f docker-compose.prod.yml --env-file .env.docker ps
    echo ""
    print_section "访问地址"
    echo "  - 前端: http://localhost"
    echo "  - 后端API: http://localhost:9000"
    echo "  - 健康检查: http://localhost:9000/health"
    echo ""
    print_section "LLM Provider配置"
    echo "  - 默认Provider: ${LLM_PROVIDER:-deepseek}"
    if [ -n "$DEEPSEEK_API_KEY" ] && [ "$DEEPSEEK_API_KEY" != "your_deepseek_api_key_here" ]; then
        echo "  - DeepSeek: 已配置"
    else
        echo "  - DeepSeek: 未配置"
    fi
    if [ -n "$VOLCANO_API_KEY" ] && [ "$VOLCANO_API_KEY" != "your_volcano_api_key_here" ]; then
        echo "  - 火山引擎: 已配置"
    else
        echo "  - 火山引擎: 未配置"
    fi
}

# 显示使用帮助
show_help() {
    echo "AITestCraft Docker部署脚本 v2.0"
    echo ""
    echo "用法: ./deploy.sh [命令]"
    echo ""
    echo "命令:"
    echo "  deploy     完整部署（构建+启动+迁移）"
    echo "  start      启动服务（不重新构建）"
    echo "  stop       停止服务"
    echo "  restart    重启服务"
    echo "  logs       查看日志"
    echo "  update     更新部署（拉取最新镜像并重启）"
    echo "  status     查看服务状态"
    echo "  migrate    执行数据库迁移"
    echo "  help       显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  ./deploy.sh deploy    # 首次部署"
    echo "  ./deploy.sh start     # 启动服务"
    echo "  ./deploy.sh logs      # 查看日志"
}

# 主函数
main() {
    echo "========================================"
    echo "  AITestCraft Docker部署脚本 v2.0"
    echo "  支持多LLM Provider"
    echo "========================================"
    echo ""

    # 加载环境变量
    if [ -f .env.docker ]; then
        export $(cat .env.docker | grep -v '^#' | xargs)
    fi

    check_docker
    check_env
    build_images
    start_services
    wait_for_services
    run_migrations
    init_configs
    show_status

    echo ""
    print_info "部署完成！"
    echo ""
    echo "常用命令:"
    echo "  查看日志: docker-compose -f docker-compose.prod.yml logs -f"
    echo "  停止服务: ./deploy.sh stop"
    echo "  重启服务: ./deploy.sh restart"
    echo "  更新部署: ./deploy.sh update"
}

# 处理命令行参数
case "${1:-deploy}" in
    deploy)
        main
        ;;
    start)
        print_info "启动服务..."
        docker-compose -f docker-compose.prod.yml --env-file .env.docker up -d
        show_status
        ;;
    stop)
        print_info "停止服务..."
        docker-compose -f docker-compose.prod.yml --env-file .env.docker down
        ;;
    restart)
        print_info "重启服务..."
        docker-compose -f docker-compose.prod.yml --env-file .env.docker restart
        show_status
        ;;
    logs)
        docker-compose -f docker-compose.prod.yml --env-file .env.docker logs -f
        ;;
    update)
        print_info "更新部署..."
        docker-compose -f docker-compose.prod.yml --env-file .env.docker pull
        docker-compose -f docker-compose.prod.yml --env-file .env.docker up -d
        show_status
        ;;
    status)
        show_status
        ;;
    migrate)
        run_migrations
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "未知命令: $1"
        show_help
        exit 1
        ;;
esac
