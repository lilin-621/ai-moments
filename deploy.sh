# =====================================================
# AI朋友圈 - 一键部署脚本
# =====================================================

#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   AI朋友圈 - 部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查环境变量
check_env() {
    echo -e "${YELLOW}[1/4] 检查环境变量...${NC}"
    
    if [ ! -f .env.local ]; then
        echo -e "${RED}错误: .env.local 文件不存在！${NC}"
        echo -e "${YELLOW}请先复制 .env.example 为 .env.local 并填写配置${NC}"
        return 1
    fi
    
    # 检查必需的环境变量
    source .env.local
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        echo -e "${RED}错误: NEXT_PUBLIC_SUPABASE_URL 未配置${NC}"
        return 1
    fi
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
        echo -e "${RED}错误: NEXT_PUBLIC_SUPABASE_ANON_KEY 未配置${NC}"
        return 1
    fi
    
    if [ -z "$ZHIPU_API_KEY" ]; then
        echo -e "${RED}错误: ZHIPU_API_KEY 未配置${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✓ 环境变量检查通过${NC}"
    return 0
}

# 安装依赖
install_deps() {
    echo ""
    echo -e "${YELLOW}[2/4] 安装依赖...${NC}"
    
    if command -v npm &> /dev/null; then
        npm install
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ 依赖安装完成${NC}"
            return 0
        else
            echo -e "${RED}✗ 依赖安装失败${NC}"
            return 1
        fi
    else
        echo -e "${RED}错误: npm 未安装，请先安装 Node.js${NC}"
        return 1
    fi
}

# 本地构建测试
build_project() {
    echo ""
    echo -e "${YELLOW}[3/4] 构建项目...${NC}"
    
    npm run build
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 项目构建成功${NC}"
        return 0
    else
        echo -e "${RED}✗ 项目构建失败${NC}"
        return 1
    fi
}

# 启动开发服务器
start_dev() {
    echo ""
    echo -e "${YELLOW}[4/4] 启动开发服务器...${NC}"
    echo -e "${GREEN}本地预览: http://localhost:3000${NC}"
    echo -e "${YELLOW}按 Ctrl+C 停止服务器${NC}"
    echo ""
    
    npm run dev
}

# 主流程
main() {
    check_env || exit 1
    install_deps || exit 1
    build_project || exit 1
    start_dev
}

# 显示帮助
show_help() {
    echo "用法: ./deploy.sh [命令]"
    echo ""
    echo "命令:"
    echo "  check    - 只检查环境变量"
    echo "  install  - 只安装依赖"
    echo "  build    - 构建项目"
    echo "  dev      - 启动开发服务器"
    echo "  help     - 显示帮助信息"
    echo ""
    echo "示例:"
    echo "  ./deploy.sh        - 执行完整部署流程"
    echo "  ./deploy.sh check  - 仅检查环境变量"
}

# 根据参数执行
case "${1:-}" in
    check)
        check_env
        ;;
    install)
        install_deps
        ;;
    build)
        check_env && build_project
        ;;
    dev)
        check_env && start_dev
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        main
        ;;
esac
