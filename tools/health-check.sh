#!/bin/bash

# LifeBox System Health Check Script
# Checks the status of all services and dependencies

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🏥 LifeBox System Health Check${NC}"
echo "=============================="

# Function to print status
print_status() {
    local service=$1
    local status=$2
    local details=$3
    
    if [ "$status" == "OK" ]; then
        echo -e "${GREEN}✅ $service: $status${NC} $details"
    elif [ "$status" == "WARNING" ]; then
        echo -e "${YELLOW}⚠️  $service: $status${NC} $details"
    else
        echo -e "${RED}❌ $service: $status${NC} $details"
    fi
}

# Check service health
check_service_health() {
    local url=$1
    local service_name=$2
    
    if curl -s -f "$url" > /dev/null 2>&1; then
        local response=$(curl -s "$url" 2>/dev/null || echo "No response")
        print_status "$service_name" "OK" "($url)"
        return 0
    else
        print_status "$service_name" "FAILED" "($url)"
        return 1
    fi
}

# Check port availability
check_port() {
    local host=$1
    local port=$2
    local service_name=$3
    
    if nc -z "$host" "$port" 2>/dev/null; then
        print_status "$service_name" "OK" "($host:$port)"
        return 0
    else
        print_status "$service_name" "FAILED" "($host:$port)"
        return 1
    fi
}

# Main health check
main() {
    echo "Checking system health..."
    echo
    
    # Check Prerequisites
    echo -e "${BLUE}Prerequisites:${NC}"
    
    # Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_status "Node.js" "OK" "($NODE_VERSION)"
    else
        print_status "Node.js" "FAILED" "(not installed)"
    fi
    
    # npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_status "npm" "OK" "($NPM_VERSION)"
    else
        print_status "npm" "FAILED" "(not installed)"
    fi
    
    # Docker
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null; then
            DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
            print_status "Docker" "OK" "($DOCKER_VERSION)"
        else
            print_status "Docker" "WARNING" "(installed but not running)"
        fi
    else
        print_status "Docker" "FAILED" "(not installed)"
    fi
    
    echo
    
    # Check Infrastructure Services
    echo -e "${BLUE}Infrastructure Services:${NC}"
    
    # PostgreSQL
    check_port "localhost" "5432" "PostgreSQL"
    
    # EMQX MQTT
    check_port "localhost" "1883" "EMQX MQTT"
    check_port "localhost" "18083" "EMQX Dashboard"
    
    echo
    
    # Check Application Services
    echo -e "${BLUE}Application Services:${NC}"
    
    # API Health Check
    check_service_health "http://localhost:3000/api/v1/health" "LifeBox API"
    
    # Web Application
    check_port "localhost" "3001" "Next.js Web App"
    
    echo
    
    # Check Database Connection
    echo -e "${BLUE}Database Status:${NC}"
    
    if command -v psql &> /dev/null; then
        if psql "postgresql://lifebox:lifebox123@localhost:5432/lifebox_dev" -c "SELECT 1;" &> /dev/null; then
            print_status "Database Connection" "OK" "(lifebox_dev)"
        else
            print_status "Database Connection" "FAILED" "(cannot connect)"
        fi
    else
        print_status "PostgreSQL Client" "WARNING" "(psql not available for testing)"
    fi
    
    echo
    
    # Check File Permissions
    echo -e "${BLUE}File System:${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Check if critical directories exist and are writable
    for dir in "uploads" "reports" "logs"; do
        if [ -d "$dir" ]; then
            if [ -w "$dir" ]; then
                print_status "$dir/ directory" "OK" "(writable)"
            else
                print_status "$dir/ directory" "WARNING" "(not writable)"
            fi
        else
            print_status "$dir/ directory" "WARNING" "(does not exist)"
        fi
    done
    
    echo
    
    # Check Environment
    echo -e "${BLUE}Environment:${NC}"
    
    if [ -f ".env" ]; then
        print_status "Environment file" "OK" "(.env exists)"
    else
        print_status "Environment file" "WARNING" "(.env missing)"
    fi
    
    # Check if development dependencies are installed
    if [ -d "node_modules" ]; then
        print_status "Dependencies" "OK" "(node_modules exists)"
    else
        print_status "Dependencies" "FAILED" "(run npm install)"
    fi
    
    echo
    
    # Summary
    echo -e "${BLUE}Health Check Summary:${NC}"
    echo "📊 For detailed logs, check: docker-compose logs"
    echo "🔧 For database management: npm run db:studio"
    echo "📱 EMQX Dashboard: http://localhost:18083 (admin/public)"
    echo "📖 API Documentation: http://localhost:3000/api/docs"
    echo
    echo "💡 If services are failing, try:"
    echo "   docker-compose down && docker-compose up -d"
    echo "   npm run dev"
}

# Run main function
main "$@"