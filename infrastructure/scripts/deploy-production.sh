#!/bin/bash

# Production Deployment Script for LifeBox IoT Platform
# Self-hosted VPS deployment with EMQX MQTT broker

set -e  # Exit on any error

echo "🚀 LifeBox IoT Platform - Production Deployment"
echo "==============================================="

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DOCKER_DIR="${PROJECT_ROOT}/infrastructure/docker"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to validate environment file
validate_env_file() {
    local env_file="$1"
    
    if [[ ! -f "$env_file" ]]; then
        log_error "Environment file not found: $env_file"
        log_info "Please copy .env.example to .env and configure it with production values"
        exit 1
    fi
    
    # Check for required variables
    local required_vars=(
        "DATABASE_URL"
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
        "MQTT_PASSWORD"
        "API_ADMIN_TOKEN"
        "NODE_ENV"
    )
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$env_file" || grep -q "^${var}=your_" "$env_file"; then
            log_error "Required environment variable '$var' is not configured in $env_file"
            exit 1
        fi
    done
    
    log_success "Environment file validation passed"
}

# Function to check system requirements
check_system_requirements() {
    log_info "Checking system requirements..."
    
    # Check if Docker is installed
    if ! command_exists docker; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command_exists docker-compose; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if running as root or with sudo
    if [[ $EUID -ne 0 ]] && ! groups $USER | grep -q docker; then
        log_warning "User is not in docker group. You may need to run with sudo."
    fi
    
    # Check available disk space (minimum 10GB)
    local available_space=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [[ $available_space -lt 10 ]]; then
        log_warning "Available disk space is less than 10GB. Consider freeing up space."
    fi
    
    # Check available memory (minimum 4GB)
    local available_memory=$(free -g | awk 'NR==2 {print $7}')
    if [[ $available_memory -lt 4 ]]; then
        log_warning "Available memory is less than 4GB. Performance may be affected."
    fi
    
    log_success "System requirements check completed"
}

# Function to setup SSL certificates
setup_ssl_certificates() {
    log_info "Setting up SSL certificates..."
    
    local ssl_dir="${DOCKER_DIR}/config/ssl"
    mkdir -p "$ssl_dir"
    
    if [[ ! -f "$ssl_dir/fullchain.pem" ]] || [[ ! -f "$ssl_dir/privkey.pem" ]]; then
        log_warning "SSL certificates not found. Setting up self-signed certificates for testing..."
        
        # Generate self-signed certificate
        openssl req -x509 -newkey rsa:4096 -keyout "$ssl_dir/privkey.pem" \
                    -out "$ssl_dir/fullchain.pem" -days 365 -nodes \
                    -subj "/C=EG/ST=Cairo/L=Cairo/O=LifeBox/OU=IT Department/CN=lifebox.local"
        
        chmod 600 "$ssl_dir/privkey.pem"
        chmod 644 "$ssl_dir/fullchain.pem"
        
        log_warning "Self-signed certificates created. Replace with valid SSL certificates for production."
    else
        log_success "SSL certificates found"
    fi
}

# Function to setup configuration files
setup_configuration() {
    log_info "Setting up configuration files..."
    
    local config_dir="${DOCKER_DIR}/config"
    
    # Create configuration directories
    mkdir -p "$config_dir"/{nginx/sites,emqx}
    
    # Setup Nginx configuration
    if [[ ! -f "$config_dir/nginx/nginx.conf" ]]; then
        log_info "Creating Nginx configuration..."
        cat > "$config_dir/nginx/nginx.conf" << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;
    
    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Security
    server_tokens off;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;
    
    # Upstream backend
    upstream lifebox_api {
        server lifebox-api:3000;
    }
    
    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }
    
    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name _;
        
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        
        # Security headers
        add_header Strict-Transport-Security "max-age=31536000" always;
        
        # API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            limit_conn conn_limit_per_ip 20;
            
            proxy_pass http://lifebox_api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
        
        # Health check endpoint (no rate limiting)
        location /health {
            proxy_pass http://lifebox_api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Static files and uploads
        location /uploads/ {
            alias /app/uploads/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF
        log_success "Nginx configuration created"
    fi
    
}

# Function to build Docker images
build_images() {
    log_info "Building Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Build API image
    log_info "Building LifeBox API image..."
    docker build -t lifebox/api:latest -f apps/api/Dockerfile .
    
    # Build MQTT ingestion image
    log_info "Building LifeBox MQTT ingestion image..."
    docker build -t lifebox/mqtt-ingestion:latest -f apps/mqtt-ingestion/Dockerfile .
    
    log_success "Docker images built successfully"
}

# Function to start services
start_services() {
    log_info "Starting LifeBox production services..."
    
    cd "$DOCKER_DIR"
    
    # Start infrastructure services first
    docker-compose -f docker-compose.production.yml up -d postgres emqx
    
    log_info "Waiting for infrastructure services to be ready..."
    sleep 30
    
    # Start application services
    docker-compose -f docker-compose.production.yml up -d lifebox-api lifebox-mqtt
    
    log_info "Waiting for application services to be ready..."
    sleep 20
    
    # Start Nginx last
    docker-compose -f docker-compose.production.yml up -d nginx
    
    log_success "All services started successfully"
}

# Function to run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    cd "$DOCKER_DIR"
    
    # Wait for API service to be ready
    local retry_count=0
    local max_retries=30
    
    while [[ $retry_count -lt $max_retries ]]; do
        if docker-compose -f docker-compose.production.yml exec -T lifebox-api npm run db:migrate; then
            log_success "Database migrations completed"
            return 0
        fi
        
        log_info "Waiting for API service to be ready... (attempt $((retry_count + 1))/$max_retries)"
        sleep 10
        ((retry_count++))
    done
    
    log_error "Failed to run database migrations after $max_retries attempts"
    return 1
}

# Function to show deployment status
show_deployment_status() {
    log_info "Deployment Status:"
    echo "=================="
    
    cd "$DOCKER_DIR"
    docker-compose -f docker-compose.production.yml ps
    
    echo
    log_info "Service URLs:"
    echo "• API Documentation: https://your-domain.com/api/docs"
    echo "• EMQX Dashboard: https://your-domain.com:18083"
    echo "• Health Check: https://your-domain.com/health"
    
    echo
    log_info "MQTT Connection:"
    echo "• MQTT (Plain): your-domain.com:1883"
    echo "• MQTT (SSL): your-domain.com:8883" 
    echo "• WebSocket: wss://your-domain.com:8083/mqtt"
    
    echo
    log_info "Logs:"
    echo "• View API logs: docker-compose -f docker-compose.production.yml logs -f lifebox-api"
    echo "• View MQTT logs: docker-compose -f docker-compose.production.yml logs -f lifebox-mqtt"
    echo "• View EMQX logs: docker-compose -f docker-compose.production.yml logs -f emqx"
}

# Main deployment function
main() {
    log_info "Starting LifeBox IoT Platform production deployment..."
    
    # Check if environment file exists (in project root)
    local env_file="${PROJECT_ROOT}/.env"
    validate_env_file "$env_file"
    
    # Load environment variables
    source "$env_file"
    
    # Change to Docker directory for docker-compose commands
    cd "$DOCKER_DIR"
    
    # Run deployment steps
    check_system_requirements
    setup_ssl_certificates
    setup_configuration
    build_images
    start_services
    
    # Wait a bit and then run migrations
    sleep 30
    run_migrations
    
    # Show final status
    show_deployment_status
    
    echo
    log_success "🎉 LifeBox IoT Platform deployed successfully!"
    log_info "Please check the service URLs above and verify everything is working."
    log_warning "Remember to:"
    echo "  1. Replace self-signed SSL certificates with valid ones"
    echo "  2. Configure your domain DNS to point to this VPS"
    echo "  3. Update firewall rules to allow required ports"
    echo "  4. Set up regular database backups"
    echo "  5. Configure monitoring and alerting"
}

# Parse command line arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    stop)
        log_info "Stopping LifeBox services..."
        cd "$DOCKER_DIR"
        docker-compose -f docker-compose.production.yml down
        log_success "Services stopped"
        ;;
    restart)
        log_info "Restarting LifeBox services..."
        cd "$DOCKER_DIR"
        docker-compose -f docker-compose.production.yml restart
        log_success "Services restarted"
        ;;
    logs)
        cd "$DOCKER_DIR"
        docker-compose -f docker-compose.production.yml logs -f
        ;;
    status)
        cd "$DOCKER_DIR"
        show_deployment_status
        ;;
    *)
        echo "Usage: $0 {deploy|stop|restart|logs|status}"
        echo
        echo "Commands:"
        echo "  deploy   - Deploy LifeBox platform (default)"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  logs     - Show live logs from all services"
        echo "  status   - Show current deployment status"
        exit 1
        ;;
esac