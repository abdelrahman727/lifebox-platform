#!/bin/bash

# LifeBox Documentation Generator
# Generates comprehensive API documentation and guides

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
DOCS_DIR="$PROJECT_ROOT/docs"
OUTPUT_DIR="$DOCS_DIR/generated"

echo -e "${BLUE}📚 LifeBox Documentation Generator${NC}"
echo -e "${BLUE}===================================${NC}"
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

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Create output directories
setup_directories() {
    print_step "Setting up documentation directories..."
    
    mkdir -p "$OUTPUT_DIR"
    mkdir -p "$OUTPUT_DIR/api"
    mkdir -p "$OUTPUT_DIR/frontend"
    mkdir -p "$OUTPUT_DIR/database"
    mkdir -p "$OUTPUT_DIR/deployment"
    
    print_success "Documentation directories created"
}

# Generate API documentation from Swagger
generate_api_docs() {
    print_header "API Documentation Generation"
    
    cd "$PROJECT_ROOT"
    
    # Check if API is running
    if curl -s http://localhost:3000/api/v1/health > /dev/null 2>&1; then
        print_step "API is running, generating documentation..."
        
        # Generate OpenAPI spec
        if curl -s http://localhost:3000/api-json > "$OUTPUT_DIR/api/openapi.json"; then
            print_success "OpenAPI specification downloaded"
        else
            print_error "Failed to download OpenAPI specification"
            return 1
        fi
        
        # Generate API reference documentation
        if command -v swagger-codegen &> /dev/null; then
            swagger-codegen generate \
                -i "$OUTPUT_DIR/api/openapi.json" \
                -l html2 \
                -o "$OUTPUT_DIR/api/reference"
            print_success "API reference documentation generated"
        else
            print_info "swagger-codegen not available, skipping HTML generation"
        fi
        
    else
        print_error "API is not running. Start with 'npm run dev:api' first"
        return 1
    fi
    
    # Generate API endpoint summary
    generate_api_summary
    
    echo
}

# Generate API summary from controllers
generate_api_summary() {
    print_step "Generating API endpoint summary..."
    
    local summary_file="$OUTPUT_DIR/api/endpoints-summary.md"
    
    cat > "$summary_file" << 'EOF'
# LifeBox API Endpoints Summary

This document provides a comprehensive overview of all API endpoints available in the LifeBox IoT Platform.

## Base URL
- **Development**: `http://localhost:3000/api/v1`
- **Production**: `https://api.lifebox.com/api/v1`

## Authentication
All endpoints (except public ones) require JWT authentication:
```
Authorization: Bearer <jwt-token>
```

## Endpoints by Module

EOF

    # Scan controller files and extract endpoint information
    find "$PROJECT_ROOT/apps/api/src/modules" -name "*.controller.ts" | while read -r file; do
        local module_name=$(basename "$(dirname "$file")")
        local controller_name=$(basename "$file" .controller.ts)
        
        echo "### $module_name" >> "$summary_file"
        echo >> "$summary_file"
        
        # Extract HTTP methods and routes
        grep -E "@(Get|Post|Patch|Put|Delete)\(" "$file" | while read -r line; do
            local method=$(echo "$line" | sed -E "s/.*@([A-Za-z]+).*/\1/" | tr '[:lower:]' '[:upper:]')
            local route=$(echo "$line" | sed -E "s/.*@[A-Za-z]+\(['\"](.*?)['\"].*/\1/" | sed 's/^$//')
            
            if [ "$route" = "$line" ]; then
                route=""
            fi
            
            echo "- **$method** \`/$module_name${route:+/}$route\`" >> "$summary_file"
        done
        
        echo >> "$summary_file"
    done
    
    print_success "API endpoint summary generated"
}

# Generate database documentation
generate_database_docs() {
    print_header "Database Documentation Generation"
    
    cd "$PROJECT_ROOT"
    
    print_step "Generating database schema documentation..."
    
    # Generate database schema documentation
    local schema_doc="$OUTPUT_DIR/database/schema.md"
    
    cat > "$schema_doc" << 'EOF'
# LifeBox Database Schema Documentation

## Overview
The LifeBox database uses PostgreSQL with TimescaleDB extension for optimal IoT time-series data handling.

## Schema Diagram
```mermaid
erDiagram
    Client ||--o{ User : has
    Client ||--o{ Device : owns
    User ||--o{ UserAssignment : assigned
    User ||--o{ CommandPermission : has
    Device ||--o{ UserAssignment : assigned
    Device ||--o{ Telemetry : generates
    Device ||--o{ DeviceAlarm : monitors
    Device ||--o{ Alarm : triggers
    Alarm ||--o{ AlarmReaction : causes
    User ||--o{ Notification : receives
```

## Tables

EOF

    # Extract model information from Prisma schema
    if [ -f "$PROJECT_ROOT/libs/database/prisma/schema.prisma" ]; then
        grep -E "^model " "$PROJECT_ROOT/libs/database/prisma/schema.prisma" | while read -r line; do
            local model_name=$(echo "$line" | awk '{print $2}')
            echo "### $model_name" >> "$schema_doc"
            echo >> "$schema_doc"
            echo "TODO: Add model documentation" >> "$schema_doc"
            echo >> "$schema_doc"
        done
    fi
    
    print_success "Database schema documentation generated"
    
    # Generate migration documentation
    generate_migration_docs
    
    echo
}

# Generate migration documentation
generate_migration_docs() {
    print_step "Generating migration documentation..."
    
    local migrations_doc="$OUTPUT_DIR/database/migrations.md"
    
    cat > "$migrations_doc" << 'EOF'
# Database Migrations

This document tracks all database migrations and their purposes.

## Migration History

EOF

    # List migrations if they exist
    if [ -d "$PROJECT_ROOT/libs/database/prisma/migrations" ]; then
        ls -la "$PROJECT_ROOT/libs/database/prisma/migrations" | grep "^d" | awk '{print $9}' | grep -v "^\.$" | grep -v "^\.\.$" | while read -r migration; do
            echo "### $migration" >> "$migrations_doc"
            echo >> "$migrations_doc"
            
            # Try to extract migration purpose from directory name
            local description=$(echo "$migration" | sed 's/^[0-9]*_//' | tr '_' ' ')
            echo "**Purpose**: $description" >> "$migrations_doc"
            echo >> "$migrations_doc"
            
            # Check for migration.sql file
            if [ -f "$PROJECT_ROOT/libs/database/prisma/migrations/$migration/migration.sql" ]; then
                echo "**SQL Changes**:" >> "$migrations_doc"
                echo '```sql' >> "$migrations_doc"
                head -n 20 "$PROJECT_ROOT/libs/database/prisma/migrations/$migration/migration.sql" >> "$migrations_doc"
                echo '```' >> "$migrations_doc"
                echo >> "$migrations_doc"
            fi
        done
    fi
    
    print_success "Migration documentation generated"
}

# Generate frontend documentation
generate_frontend_docs() {
    print_header "Frontend Documentation Generation"
    
    print_step "Generating component documentation..."
    
    local components_doc="$OUTPUT_DIR/frontend/components.md"
    
    cat > "$components_doc" << 'EOF'
# Frontend Components Documentation

## Component Library
The LifeBox frontend uses a comprehensive component library based on Shadcn/ui.

## Available Components

EOF

    # Scan for React components
    if [ -d "$PROJECT_ROOT/apps/web/src/components" ]; then
        find "$PROJECT_ROOT/apps/web/src/components" -name "*.tsx" | while read -r file; do
            local component_name=$(basename "$file" .tsx)
            echo "### $component_name" >> "$components_doc"
            echo >> "$components_doc"
            
            # Extract component props if available
            if grep -q "interface.*Props" "$file"; then
                echo "**Props**:" >> "$components_doc"
                grep -A 10 "interface.*Props" "$file" | head -n 10 >> "$components_doc"
                echo >> "$components_doc"
            fi
            
            # Extract component description from comments
            if grep -q "^\s*\*.*" "$file"; then
                echo "**Description**:" >> "$components_doc"
                grep "^\s*\*" "$file" | head -n 3 | sed 's/^\s*\*//' >> "$components_doc"
                echo >> "$components_doc"
            fi
        done
    fi
    
    print_success "Frontend component documentation generated"
    
    # Generate page documentation
    generate_pages_docs
    
    echo
}

# Generate pages documentation
generate_pages_docs() {
    print_step "Generating pages documentation..."
    
    local pages_doc="$OUTPUT_DIR/frontend/pages.md"
    
    cat > "$pages_doc" << 'EOF'
# Frontend Pages Documentation

## Page Structure
The LifeBox frontend uses Next.js App Router for page organization.

## Available Pages

EOF

    # Scan for Next.js pages
    if [ -d "$PROJECT_ROOT/apps/web/src/app" ]; then
        find "$PROJECT_ROOT/apps/web/src/app" -name "page.tsx" | while read -r file; do
            local page_path=$(dirname "$file" | sed "s|$PROJECT_ROOT/apps/web/src/app||")
            echo "### $page_path" >> "$pages_doc"
            echo >> "$pages_doc"
            
            # Extract page description from metadata
            if grep -q "export const metadata" "$file"; then
                echo "**Metadata**:" >> "$pages_doc"
                grep -A 5 "export const metadata" "$file" >> "$pages_doc"
                echo >> "$pages_doc"
            fi
        done
    fi
    
    print_success "Frontend pages documentation generated"
}

# Generate deployment documentation
generate_deployment_docs() {
    print_header "Deployment Documentation Generation"
    
    print_step "Generating Docker documentation..."
    
    local docker_doc="$OUTPUT_DIR/deployment/docker.md"
    
    cat > "$docker_doc" << 'EOF'
# Docker Deployment Documentation

## Available Docker Configurations

EOF

    # Scan for Docker files
    find "$PROJECT_ROOT" -name "Dockerfile" -o -name "docker-compose*.yml" | while read -r file; do
        local file_name=$(basename "$file")
        local file_path=$(dirname "$file" | sed "s|$PROJECT_ROOT||")
        
        echo "### $file_path/$file_name" >> "$docker_doc"
        echo >> "$docker_doc"
        
        # Extract description from comments
        if grep -q "^#" "$file"; then
            echo "**Description**:" >> "$docker_doc"
            grep "^#" "$file" | head -n 3 | sed 's/^# *//' >> "$docker_doc"
            echo >> "$docker_doc"
        fi
        
        # Show build stages for Dockerfile
        if [ "$file_name" = "Dockerfile" ]; then
            echo "**Build Stages**:" >> "$docker_doc"
            grep -E "^FROM.*AS" "$file" | while read -r stage; do
                echo "- $stage" >> "$docker_doc"
            done
            echo >> "$docker_doc"
        fi
        
        # Show services for docker-compose
        if [[ "$file_name" == docker-compose*.yml ]]; then
            echo "**Services**:" >> "$docker_doc"
            grep -E "^\s*[a-zA-Z0-9-]+:" "$file" | grep -v "version:" | while read -r service; do
                echo "- $service" >> "$docker_doc"
            done
            echo >> "$docker_doc"
        fi
    done
    
    print_success "Docker documentation generated"
    
    print_step "Generating scripts documentation..."
    
    local scripts_doc="$OUTPUT_DIR/deployment/scripts.md"
    
    cat > "$scripts_doc" << 'EOF'
# Scripts Documentation

## Available Scripts

EOF

    # Scan for shell scripts
    find "$PROJECT_ROOT/tools" "$PROJECT_ROOT/scripts" -name "*.sh" 2>/dev/null | while read -r file; do
        local script_name=$(basename "$file")
        local script_path=$(dirname "$file" | sed "s|$PROJECT_ROOT||")
        
        echo "### $script_path/$script_name" >> "$scripts_doc"
        echo >> "$scripts_doc"
        
        # Extract description from comments
        if grep -q "^#" "$file"; then
            echo "**Description**:" >> "$scripts_doc"
            grep "^#" "$file" | head -n 5 | sed 's/^# *//' >> "$scripts_doc"
            echo >> "$scripts_doc"
        fi
        
        # Extract usage information
        if grep -q "Usage:" "$file"; then
            echo "**Usage**:" >> "$scripts_doc"
            grep -A 3 "Usage:" "$file" >> "$scripts_doc"
            echo >> "$scripts_doc"
        fi
    done
    
    print_success "Deployment scripts documentation generated"
    
    echo
}

# Generate comprehensive documentation index
generate_docs_index() {
    print_header "Documentation Index Generation"
    
    print_step "Creating documentation index..."
    
    local index_file="$OUTPUT_DIR/README.md"
    
    cat > "$index_file" << EOF
# LifeBox IoT Platform - Generated Documentation

**Generated on**: $(date)
**Version**: $(grep '"version"' "$PROJECT_ROOT/package.json" | sed 's/.*"version": "\(.*\)".*/\1/')

This directory contains automatically generated documentation for the LifeBox IoT Platform.

## 📋 Documentation Sections

### 🔌 API Documentation
- [API Endpoints Summary](api/endpoints-summary.md)
- [OpenAPI Specification](api/openapi.json)
- [API Reference](api/reference/) (if available)

### 💾 Database Documentation  
- [Database Schema](database/schema.md)
- [Migration History](database/migrations.md)

### 📱 Frontend Documentation
- [Component Library](frontend/components.md)
- [Page Structure](frontend/pages.md)

### 🚀 Deployment Documentation
- [Docker Configurations](deployment/docker.md)
- [Deployment Scripts](deployment/scripts.md)

## 🔄 Regeneration

To regenerate this documentation, run:

\`\`\`bash
./tools/generate-docs.sh
\`\`\`

## 📚 Additional Documentation

For more comprehensive documentation, see:

- [Main Documentation](../README.md)
- [Architecture Decisions](../adr/)
- [Contributing Guidelines](../CONTRIBUTING.md)
- [API Documentation](../api/)
- [Frontend Guide](../frontend/)
- [Database Guide](../database/)

---

**Note**: This documentation is automatically generated and may not be complete. 
For the most up-to-date information, refer to the source code and manual documentation.
EOF

    print_success "Documentation index created"
    
    echo
}

# Clean old documentation
clean_docs() {
    print_step "Cleaning old generated documentation..."
    
    if [ -d "$OUTPUT_DIR" ]; then
        rm -rf "$OUTPUT_DIR"
        print_success "Old documentation cleaned"
    fi
}

# Generate all documentation
generate_all_docs() {
    setup_directories
    generate_api_docs
    generate_database_docs
    generate_frontend_docs
    generate_deployment_docs
    generate_docs_index
}

# Show summary
show_summary() {
    print_header "Documentation Generation Complete! 🎉"
    
    echo -e "${GREEN}Generated documentation is available at:${NC}"
    echo -e "  📁 Main directory: ${CYAN}$OUTPUT_DIR${NC}"
    echo -e "  📋 Documentation index: ${CYAN}$OUTPUT_DIR/README.md${NC}"
    echo
    
    echo -e "${CYAN}Documentation sections:${NC}"
    echo -e "  🔌 API Documentation: $(ls "$OUTPUT_DIR/api" | wc -l) files"
    echo -e "  💾 Database Documentation: $(ls "$OUTPUT_DIR/database" | wc -l) files"
    echo -e "  📱 Frontend Documentation: $(ls "$OUTPUT_DIR/frontend" | wc -l) files"
    echo -e "  🚀 Deployment Documentation: $(ls "$OUTPUT_DIR/deployment" | wc -l) files"
    echo
    
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "  1. Review generated documentation for accuracy"
    echo -e "  2. Update any incomplete sections"
    echo -e "  3. Add generated docs to version control (if desired)"
    echo -e "  4. Set up automated documentation generation in CI/CD"
    echo
}

# Main execution
main() {
    case "$1" in
        "clean")
            clean_docs
            ;;
        "api")
            setup_directories
            generate_api_docs
            ;;
        "database")
            setup_directories
            generate_database_docs
            ;;
        "frontend")
            setup_directories
            generate_frontend_docs
            ;;
        "deployment")
            setup_directories
            generate_deployment_docs
            ;;
        *)
            generate_all_docs
            show_summary
            ;;
    esac
}

# Help text
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "LifeBox Documentation Generator"
    echo
    echo "Automatically generates comprehensive documentation from source code"
    echo
    echo "Usage: $0 [section]"
    echo
    echo "Sections:"
    echo "  api           Generate API documentation only"
    echo "  database      Generate database documentation only"
    echo "  frontend      Generate frontend documentation only"
    echo "  deployment    Generate deployment documentation only"
    echo "  clean         Clean generated documentation"
    echo "  (no args)     Generate all documentation"
    echo
    echo "Options:"
    echo "  -h, --help    Show this help message"
    echo
    echo "Prerequisites:"
    echo "  - API should be running for complete API documentation"
    echo "  - swagger-codegen for HTML API reference (optional)"
    echo
    exit 0
fi

# Run main function
main "$@"