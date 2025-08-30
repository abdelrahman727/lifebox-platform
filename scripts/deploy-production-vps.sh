#!/bin/bash

# ============================================
# LifeBox IoT Platform - VPS Production Deployment Script
# ============================================
# 
# This script automates the deployment of LifeBox IoT Platform on a VPS
# Run this script on your production VPS server
# 
# Prerequisites:
# 1. Ubuntu 20.04+ server with root access
# 2. Domain name pointed to your VPS IP
# 3. SSL certificates (Let's Encrypt recommended)
# 4. Configured .env file with production values
# ============================================

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
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

# Configuration
PROJECT_NAME="lifebox-platform"
PROJECT_DIR="$HOME/$PROJECT_NAME"
BACKUP_DIR="$HOME/backups/$PROJECT_NAME"
NGINX_CONFIG_DIR="/etc/nginx/sites-available"
DOCKER_COMPOSE_FILE="infrastructure/docker/docker-compose.production.yml"
ENV_FILE=".env"

# Create backup directory
create_backup() {
    log_info "Creating backup directory..."
    mkdir -p "$BACKUP_DIR/$(date +%Y%m%d_%H%M%S)"
    
    if [ -d "$PROJECT_DIR" ]; then
        log_info "Backing up existing installation..."
        cp -r "$PROJECT_DIR" "$BACKUP_DIR/$(date +%Y%m%d_%H%M%S)/"
        log_success "Backup created successfully"
    fi
}

# Install system dependencies
install_dependencies() {
    log_info "Installing system dependencies..."
    
    # Update system
    apt update && apt upgrade -y
    
    # Install required packages
    apt install -y \
        curl \
        wget \
        git \
        nginx \
        ufw \
        htop \
        vim \
        certbot \
        python3-certbot-nginx \
        ca-certificates \
        gnupg \
        lsb-release \
        postgresql-client \
        jq
    
    log_success "System dependencies installed"
}

# Install Docker and Docker Compose
install_docker() {
    log_info "Installing Docker..."
    
    # Remove old Docker installations
    apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Install Docker
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    # Add current user to docker group (if not root)
    if [ "$EUID" -ne 0 ] && [ -n "${SUDO_USER:-}" ]; then
        usermod -aG docker "$SUDO_USER"
        log_warning "Please log out and back in to use Docker without sudo"
    fi
    
    log_success "Docker installed successfully"
}

# Configure firewall
configure_firewall() {
    log_info "Configuring firewall..."
    
    # Reset UFW to defaults
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH (be careful!)
    ufw allow ssh
    ufw allow 22/tcp
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Allow MQTT ports
    ufw allow 1883/tcp    # MQTT
    ufw allow 8883/tcp    # MQTT over SSL
    ufw allow 8083/tcp    # MQTT over WebSocket
    ufw allow 8084/tcp    # MQTT over Secure WebSocket
    ufw allow 18083/tcp   # EMQX Dashboard
    
    # Enable firewall
    ufw --force enable
    
    log_success "Firewall configured"
}

# Clone or update project
setup_project() {
    log_info "Setting up project..."
    
    # Create project directory
    mkdir -p "$PROJECT_DIR"
    cd "$PROJECT_DIR"
    
    # Clone project if not exists
    if [ ! -d ".git" ]; then
        log_info "Cloning project repository..."
        git clone https://github.com/abdelrahman727/lifebox-platform.git .
    else
        log_info "Updating existing repository..."
        git fetch origin
        git reset --hard origin/main
    fi
    
    log_success "Project setup complete"
}

# Setup environment file
setup_environment() {
    log_info "Setting up environment configuration..."
    
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f ".env.production.example" ]; then
            log_warning "Copying example environment file..."
            cp .env.production.example "$ENV_FILE"
            log_error "IMPORTANT: Edit $PROJECT_DIR/$ENV_FILE with your production values!"
            log_error "The deployment will not work without proper configuration!"
            exit 1
        else
            log_error "No environment file found! Please create $PROJECT_DIR/$ENV_FILE"
            exit 1
        fi
    else
        log_success "Environment file exists"
    fi
    
    # Validate critical environment variables
    if ! grep -q "VPS_PUBLIC_IP=.*[0-9]" "$ENV_FILE" || grep -q "YOUR_VPS_IP_HERE" "$ENV_FILE"; then
        log_error "Please configure VPS_PUBLIC_IP in $ENV_FILE"
        exit 1
    fi
    
    if grep -q "STRONG_.*_PASSWORD_HERE" "$ENV_FILE" || grep -q "YOUR_.*_HERE" "$ENV_FILE"; then
        log_error "Please replace all placeholder values in $ENV_FILE with actual production values"
        exit 1
    fi
    
    log_success "Environment validation passed"
}

# Build and start services
deploy_services() {
    log_info "Deploying services with Docker Compose..."
    
    # Stop existing services
    docker compose -f "$DOCKER_COMPOSE_FILE" down --remove-orphans || true
    
    # Pull latest images
    docker compose -f "$DOCKER_COMPOSE_FILE" pull
    
    # Build and start services
    docker compose -f "$DOCKER_COMPOSE_FILE" up -d --build
    
    log_info "Waiting for services to start..."
    sleep 30
    
    # Check service health
    check_service_health
    
    log_success "Services deployed successfully"
}

# Check service health
check_service_health() {
    log_info "Checking service health..."
    
    local services=("lifebox-postgres" "lifebox-emqx" "lifebox-api" "lifebox-mqtt")
    local all_healthy=true
    
    for service in "${services[@]}"; do
        if docker ps --filter "name=$service" --filter "status=running" | grep -q "$service"; then
            log_success "$service is running"
        else
            log_error "$service is not running"
            all_healthy=false
        fi
    done
    
    # Check API health endpoint
    if curl -f http://localhost:3000/api/v1/health >/dev/null 2>&1; then
        log_success "API health check passed"
    else
        log_warning "API health check failed - may still be starting"
    fi
    
    if [ "$all_healthy" = false ]; then
        log_error "Some services failed to start. Check logs with: docker compose -f $DOCKER_COMPOSE_FILE logs"
        exit 1
    fi
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Wait for database to be ready
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker exec lifebox-postgres pg_isready -U "$(grep DB_USERNAME "$ENV_FILE" | cut -d'=' -f2)" > /dev/null 2>&1; then
            break
        fi
        
        log_info "Waiting for database... (attempt $attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "Database failed to start"
        exit 1
    fi
    
    # Run migrations
    docker exec lifebox-api npm run db:migrate:deploy || {
        log_error "Database migration failed"
        exit 1
    }
    
    # Seed essential data
    docker exec lifebox-api npm run db:seed || {
        log_warning "Database seeding failed - continuing anyway"
    }
    
    log_success "Database migrations completed"
}

# Configure Nginx (optional - if not using Docker nginx)
configure_nginx() {
    log_info "Configuring Nginx reverse proxy..."
    
    # Read domain from .env file
    local domain
    domain=$(grep "DOMAIN=" "$ENV_FILE" | cut -d'=' -f2)
    
    if [ -z "$domain" ] || [ "$domain" = "your-domain.com" ]; then
        log_warning "No domain configured, skipping Nginx setup"
        return
    fi
    
    # Create Nginx configuration
    cat > "$NGINX_CONFIG_DIR/lifebox" << EOF
server {
    listen 80;
    server_name $domain www.$domain;
    
    # Redirect to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $domain www.$domain;
    
    # SSL Configuration (update paths as needed)
    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;
    
    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # WebSocket Proxy
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
    
    # EMQX Dashboard Proxy
    location /mqtt-dashboard/ {
        proxy_pass http://localhost:18083/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF
    
    # Enable site
    ln -sf "$NGINX_CONFIG_DIR/lifebox" "/etc/nginx/sites-enabled/"
    
    # Test and reload Nginx
    nginx -t && systemctl reload nginx
    
    log_success "Nginx configured for domain: $domain"
}

# Setup SSL certificate
setup_ssl() {
    local domain
    domain=$(grep "DOMAIN=" "$ENV_FILE" | cut -d'=' -f2)
    
    if [ -z "$domain" ] || [ "$domain" = "your-domain.com" ]; then
        log_warning "No domain configured, skipping SSL setup"
        return
    fi
    
    log_info "Setting up SSL certificate for $domain..."
    
    # Stop nginx temporarily
    systemctl stop nginx
    
    # Obtain certificate
    certbot certonly --standalone -d "$domain" -d "www.$domain" --non-interactive --agree-tos --email "admin@$domain" || {
        log_error "Failed to obtain SSL certificate"
        systemctl start nginx
        exit 1
    }
    
    # Start nginx
    systemctl start nginx
    
    # Setup auto-renewal
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    log_success "SSL certificate configured"
}

# Setup monitoring and logging
setup_monitoring() {
    log_info "Setting up monitoring and logging..."
    
    # Create log rotation for Docker containers
    cat > /etc/logrotate.d/docker-lifebox << EOF
/var/lib/docker/containers/*/*.log {
  daily
  missingok
  rotate 30
  compress
  notifempty
  create 0644 root root
  postrotate
    /bin/kill -USR1 \$(cat /var/run/docker.pid 2>/dev/null) 2>/dev/null || true
  endscript
}
EOF
    
    # Create systemd service for automatic startup
    cat > /etc/systemd/system/lifebox-platform.service << EOF
[Unit]
Description=LifeBox IoT Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/docker compose -f $DOCKER_COMPOSE_FILE up -d
ExecStop=/usr/bin/docker compose -f $DOCKER_COMPOSE_FILE down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl enable lifebox-platform.service
    
    log_success "Monitoring and logging configured"
}

# Create maintenance scripts
create_maintenance_scripts() {
    log_info "Creating maintenance scripts..."
    
    mkdir -p "$PROJECT_DIR/scripts/maintenance"
    
    # Backup script
    cat > "$PROJECT_DIR/scripts/maintenance/backup.sh" << 'EOF'
#!/bin/bash
BACKUP_DIR="~/backups/lifebox-platform"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR/$DATE"

# Backup database
docker exec lifebox-postgres pg_dump -U lifebox_prod lifebox_production > "$BACKUP_DIR/$DATE/database.sql"

# Backup uploads and data
docker cp lifebox-api:/app/uploads "$BACKUP_DIR/$DATE/"
docker cp lifebox-api:/app/reports "$BACKUP_DIR/$DATE/"

echo "Backup completed: $BACKUP_DIR/$DATE"
EOF
    
    # Update script
    cat > "$PROJECT_DIR/scripts/maintenance/update.sh" << 'EOF'
#!/bin/bash
cd "$HOME/lifebox-platform"
git pull origin main
docker compose -f infrastructure/docker/docker-compose.production.yml up -d --build
echo "Update completed"
EOF
    
    chmod +x "$PROJECT_DIR/scripts/maintenance/"*.sh
    
    log_success "Maintenance scripts created"
}

# Print deployment summary
print_summary() {
    local domain
    domain=$(grep "DOMAIN=" "$ENV_FILE" | cut -d'=' -f2)
    
    echo
    log_success "============================================"
    log_success "LifeBox IoT Platform Deployment Complete!"
    log_success "============================================"
    echo
    log_info "Access Points:"
    if [ "$domain" != "your-domain.com" ] && [ -n "$domain" ]; then
        log_info "🌐 API Documentation: https://$domain/api/docs"
        log_info "🔧 EMQX Dashboard: https://$domain/mqtt-dashboard"
    fi
    log_info "🔧 EMQX Dashboard (Direct): http://$(grep VPS_PUBLIC_IP "$ENV_FILE" | cut -d'=' -f2):18083"
    log_info "📡 MQTT Broker: $(grep VPS_PUBLIC_IP "$ENV_FILE" | cut -d'=' -f2):1883"
    echo
    log_info "Service Management:"
    log_info "• Start services: systemctl start lifebox-platform"
    log_info "• Stop services: systemctl stop lifebox-platform"
    log_info "• View logs: docker compose -f $DOCKER_COMPOSE_FILE logs -f"
    log_info "• Check status: docker ps"
    echo
    log_info "Maintenance:"
    log_info "• Backup: $PROJECT_DIR/scripts/maintenance/backup.sh"
    log_info "• Update: $PROJECT_DIR/scripts/maintenance/update.sh"
    echo
    log_warning "Next Steps:"
    log_warning "1. Test all integrations (MQTT, Fawry, SMS)"
    log_warning "2. Configure device connections"
    log_warning "3. Set up monitoring and alerting"
    log_warning "4. Configure regular backups"
    echo
}

# Main deployment function
main() {
    log_info "Starting LifeBox IoT Platform production deployment..."
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        log_error "Please run this script as root or with sudo"
        exit 1
    fi
    
    # Check Ubuntu version
    if ! lsb_release -d | grep -qi ubuntu; then
        log_warning "This script is designed for Ubuntu. Proceeding anyway..."
    fi
    
    # Create backup
    create_backup
    
    # Install dependencies
    install_dependencies
    install_docker
    
    # Configure system
    configure_firewall
    
    # Setup project
    setup_project
    setup_environment
    
    # Deploy services
    deploy_services
    run_migrations
    
    # Configure web server (optional)
    # configure_nginx
    # setup_ssl
    
    # Setup monitoring
    setup_monitoring
    create_maintenance_scripts
    
    # Summary
    print_summary
    
    log_success "Deployment completed successfully!"
}

# Run main function
main "$@"