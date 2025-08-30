#!/bin/bash

# LifeBox Advanced Environment Setup Script
# Detects system and sets up optimal development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🚀 LifeBox Advanced Environment Setup${NC}"
echo -e "${BLUE}======================================${NC}"
echo

# Print functions
print_header() {
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}$(printf '=%.0s' $(seq 1 ${#1}))${NC}"
}

print_step() {
    echo -e "${YELLOW}➡️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# System detection
detect_system() {
    print_header "System Detection"
    
    OS=$(uname -s)
    ARCH=$(uname -m)
    
    case "$OS" in
        Darwin)
            OS_TYPE="macOS"
            PACKAGE_MANAGER="brew"
            if ! command -v brew &> /dev/null; then
                PACKAGE_MANAGER="none"
            fi
            ;;
        Linux)
            OS_TYPE="Linux"
            if command -v apt-get &> /dev/null; then
                PACKAGE_MANAGER="apt"
            elif command -v yum &> /dev/null; then
                PACKAGE_MANAGER="yum"
            elif command -v pacman &> /dev/null; then
                PACKAGE_MANAGER="pacman"
            else
                PACKAGE_MANAGER="none"
            fi
            ;;
        MINGW*|MSYS*|CYGWIN*)
            OS_TYPE="Windows"
            PACKAGE_MANAGER="choco"
            if ! command -v choco &> /dev/null; then
                PACKAGE_MANAGER="none"
            fi
            ;;
        *)
            OS_TYPE="Unknown"
            PACKAGE_MANAGER="none"
            ;;
    esac
    
    print_info "Operating System: $OS_TYPE ($OS)"
    print_info "Architecture: $ARCH"
    print_info "Package Manager: $PACKAGE_MANAGER"
    echo
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing_tools=()
    
    # Essential tools
    if ! command -v git &> /dev/null; then
        missing_tools+=("git")
    else
        print_success "Git: $(git --version | cut -d' ' -f3)"
    fi
    
    if ! command -v node &> /dev/null; then
        missing_tools+=("nodejs")
    else
        NODE_VERSION=$(node --version)
        print_success "Node.js: $NODE_VERSION"
        
        # Check Node version
        NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_MAJOR" -lt 18 ]; then
            print_warning "Node.js version $NODE_VERSION detected. Version 18+ recommended."
        fi
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    else
        print_success "npm: $(npm --version)"
    fi
    
    # Optional but recommended tools
    if ! command -v docker &> /dev/null; then
        print_warning "Docker not found - required for full development environment"
        missing_tools+=("docker")
    else
        print_success "Docker: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)"
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_warning "Docker Compose not found"
        missing_tools+=("docker-compose")
    else
        if command -v docker-compose &> /dev/null; then
            print_success "Docker Compose: $(docker-compose --version | cut -d' ' -f4 | cut -d',' -f1)"
        else
            print_success "Docker Compose: $(docker compose version --short)"
        fi
    fi
    
    # Database tools
    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL client not found - optional for database management"
    else
        print_success "PostgreSQL client: $(psql --version | cut -d' ' -f3)"
    fi
    
    # Development tools
    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    else
        print_success "jq: $(jq --version | cut -d'-' -f2)"
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_info "Please install missing tools and run this script again."
        
        # Provide installation instructions
        case "$PACKAGE_MANAGER" in
            brew)
                print_info "Install with: brew install ${missing_tools[*]}"
                ;;
            apt)
                print_info "Install with: sudo apt-get install ${missing_tools[*]}"
                ;;
            yum)
                print_info "Install with: sudo yum install ${missing_tools[*]}"
                ;;
            pacman)
                print_info "Install with: sudo pacman -S ${missing_tools[*]}"
                ;;
            choco)
                print_info "Install with: choco install ${missing_tools[*]}"
                ;;
        esac
        
        exit 1
    fi
    
    print_success "All prerequisites satisfied"
    echo
}

# Environment setup
setup_environment() {
    print_header "Environment Configuration"
    
    cd "$PROJECT_ROOT"
    
    # Create environment file
    if [ ! -f .env ]; then
        print_step "Creating environment file from template..."
        cp .env.example .env
        print_success "Environment file created"
        print_info "Please review and update .env file with your configuration"
    else
        print_info "Environment file already exists"
        
        # Check if template has new variables
        if ! diff -q .env.example .env > /dev/null 2>&1; then
            print_warning "Environment template has changes. Consider reviewing .env file."
        fi
    fi
    
    # Set up Git hooks
    if [ -d .git ] && [ ! -d .git/hooks/pre-commit ]; then
        print_step "Setting up Git hooks..."
        if command -v husky &> /dev/null || [ -f node_modules/.bin/husky ]; then
            npm run prepare
            print_success "Git hooks configured"
        else
            print_warning "Husky not available, skipping Git hooks setup"
        fi
    fi
    
    echo
}

# Dependencies installation
install_dependencies() {
    print_header "Installing Dependencies"
    
    cd "$PROJECT_ROOT"
    
    print_step "Installing Node.js dependencies..."
    npm install
    print_success "Dependencies installed"
    
    # Generate Prisma client
    print_step "Generating Prisma client..."
    npm run db:generate
    print_success "Prisma client generated"
    
    echo
}

# Infrastructure setup
setup_infrastructure() {
    print_header "Infrastructure Setup"
    
    if command -v docker &> /dev/null; then
        print_step "Starting infrastructure services..."
        
        cd "$PROJECT_ROOT/infrastructure/docker"
        
        # Check if services are already running
        if docker compose ps | grep -q "Up"; then
            print_warning "Some services are already running"
            print_step "Stopping existing services..."
            docker compose down
        fi
        
        print_step "Starting PostgreSQL and EMQX..."
        docker compose up -d
        
        # Wait for services
        print_step "Waiting for services to start..."
        sleep 5
        
        # Health checks
        max_attempts=30
        attempt=0
        
        while [ $attempt -lt $max_attempts ]; do
            if docker compose exec -T postgres pg_isready -U lifebox >/dev/null 2>&1; then
                print_success "PostgreSQL is ready"
                break
            fi
            attempt=$((attempt + 1))
            sleep 2
            print_info "Waiting for PostgreSQL... (attempt $attempt/$max_attempts)"
        done
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "PostgreSQL did not start properly"
            exit 1
        fi
        
        print_success "Infrastructure services started"
    else
        print_warning "Docker not available, skipping infrastructure setup"
    fi
    
    echo
}

# Database setup
setup_database() {
    print_header "Database Setup"
    
    cd "$PROJECT_ROOT"
    
    print_step "Running database migrations..."
    npm run db:migrate
    print_success "Database migrations completed"
    
    print_step "Seeding database with sample data..."
    npm run db:seed
    print_success "Database seeded"
    
    echo
}

# Build applications
build_applications() {
    print_header "Building Applications"
    
    cd "$PROJECT_ROOT"
    
    print_step "Building all applications..."
    npm run build
    print_success "Applications built successfully"
    
    print_step "Running build validation..."
    if command -v "./tools/build-validate.sh" &> /dev/null; then
        ./tools/build-validate.sh
    else
        npm run build:validate 2>/dev/null || print_warning "Build validation script not available"
    fi
    
    echo
}

# Development tools setup
setup_dev_tools() {
    print_header "Development Tools"
    
    # VS Code setup
    if command -v code &> /dev/null; then
        print_step "VS Code detected"
        
        if [ -f "$PROJECT_ROOT/lifebox-platform.code-workspace" ]; then
            print_info "Workspace file available: lifebox-platform.code-workspace"
            print_info "Open with: code lifebox-platform.code-workspace"
        fi
        
        # Install recommended extensions
        if [ -f "$PROJECT_ROOT/.vscode/extensions.json" ]; then
            print_step "Installing recommended VS Code extensions..."
            
            # Read recommended extensions and install them
            jq -r '.recommendations[]' "$PROJECT_ROOT/.vscode/extensions.json" | while read -r extension; do
                if ! code --list-extensions | grep -q "$extension"; then
                    print_info "Installing extension: $extension"
                    code --install-extension "$extension" --force
                fi
            done
            
            print_success "VS Code extensions configured"
        fi
    else
        print_info "VS Code not detected, skipping editor setup"
    fi
    
    echo
}

# Health check
run_health_check() {
    print_header "System Health Check"
    
    cd "$PROJECT_ROOT"
    
    if [ -f "./tools/health-check.sh" ]; then
        ./tools/health-check.sh
    else
        print_warning "Health check script not found"
    fi
    
    echo
}

# Success summary
print_summary() {
    print_header "Setup Complete! 🎉"
    
    echo -e "${GREEN}Your LifeBox IoT Platform development environment is ready!${NC}"
    echo
    echo -e "${CYAN}Next Steps:${NC}"
    echo -e "  1. Review your .env file configuration"
    echo -e "  2. Start development: ${YELLOW}npm run dev${NC}"
    echo -e "  3. Open your browser:"
    echo -e "     • Web App: ${BLUE}http://localhost:3001${NC}"
    echo -e "     • API Docs: ${BLUE}http://localhost:3000/api/docs${NC}"
    echo -e "     • Prisma Studio: ${YELLOW}npm run db:studio${NC}"
    echo -e "     • EMQX Dashboard: ${BLUE}http://localhost:18083${NC} (admin/public)"
    echo
    echo -e "${CYAN}Useful Commands:${NC}"
    echo -e "  • ${YELLOW}npm run dev${NC}              - Start all development servers"
    echo -e "  • ${YELLOW}npm run build${NC}            - Build all applications"
    echo -e "  • ${YELLOW}npm run test${NC}             - Run all tests"
    echo -e "  • ${YELLOW}./tools/health-check.sh${NC}  - Check system health"
    echo -e "  • ${YELLOW}npm run db:studio${NC}        - Open database GUI"
    echo
    echo -e "${CYAN}Development Tools:${NC}"
    if command -v code &> /dev/null; then
        echo -e "  • Open workspace: ${YELLOW}code lifebox-platform.code-workspace${NC}"
    fi
    if [ -d .devcontainer ]; then
        echo -e "  • DevContainer available for consistent development"
    fi
    echo
    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

# Main execution
main() {
    detect_system
    check_prerequisites
    setup_environment
    install_dependencies
    setup_infrastructure
    setup_database
    build_applications
    setup_dev_tools
    run_health_check
    print_summary
}

# Help text
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "LifeBox Advanced Environment Setup Script"
    echo
    echo "This script automatically detects your system and sets up a complete"
    echo "development environment for the LifeBox IoT Platform."
    echo
    echo "Usage: $0 [options]"
    echo
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  --skip-docker  Skip Docker infrastructure setup"
    echo "  --skip-build   Skip application building"
    echo
    echo "The script will:"
    echo "  1. Detect your operating system and tools"
    echo "  2. Check prerequisites and provide installation instructions"
    echo "  3. Set up environment configuration"
    echo "  4. Install Node.js dependencies"
    echo "  5. Start infrastructure services (Docker)"
    echo "  6. Set up and seed the database"
    echo "  7. Build all applications"
    echo "  8. Configure development tools"
    echo "  9. Run system health checks"
    echo
    exit 0
fi

# Handle options
SKIP_DOCKER=false
SKIP_BUILD=false

for arg in "$@"; do
    case $arg in
        --skip-docker)
            SKIP_DOCKER=true
            ;;
        --skip-build)
            SKIP_BUILD=true
            ;;
    esac
done

# Run main function with option handling
if [ "$SKIP_DOCKER" = true ]; then
    detect_system
    check_prerequisites
    setup_environment
    install_dependencies
    if [ "$SKIP_BUILD" = false ]; then
        build_applications
    fi
    setup_dev_tools
    print_summary
elif [ "$SKIP_BUILD" = true ]; then
    detect_system
    check_prerequisites
    setup_environment
    install_dependencies
    setup_infrastructure
    setup_database
    setup_dev_tools
    run_health_check
    print_summary
else
    main "$@"
fi