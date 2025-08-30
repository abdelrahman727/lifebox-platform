#!/bin/bash

# LifeBox Build Validation Script
# Validates build outputs and ensures all components are properly built

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPORT_DIR="${REPORT_DIR:-./reports}"
VALIDATION_REPORT="$REPORT_DIR/build-validation.json"

# Create reports directory
mkdir -p "$REPORT_DIR"

echo -e "${BLUE}🔍 LifeBox Build Validation${NC}"
echo "============================="
echo

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_step() {
    echo -e "${YELLOW}➡️  $1${NC}"
}

# Initialize validation report
cat > "$VALIDATION_REPORT" << 'EOF'
{
  "timestamp": "",
  "validation_results": {
    "api": {
      "built": false,
      "files_exist": [],
      "files_missing": [],
      "size_mb": 0
    },
    "web": {
      "built": false,
      "files_exist": [],
      "files_missing": [],
      "size_mb": 0
    },
    "mqtt": {
      "built": false,
      "files_exist": [],
      "files_missing": [],
      "size_mb": 0
    },
    "database": {
      "generated": false,
      "client_exists": false
    }
  },
  "overall_status": "unknown",
  "errors": [],
  "warnings": []
}
EOF

# Update timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
jq --arg ts "$TIMESTAMP" '.timestamp = $ts' "$VALIDATION_REPORT" > "$VALIDATION_REPORT.tmp" && mv "$VALIDATION_REPORT.tmp" "$VALIDATION_REPORT"

# Validation functions
validate_api_build() {
    print_step "Validating API build..."
    
    local api_dist="./apps/api/dist"
    local required_files=("main.js" "app.module.js")
    local missing_files=()
    local existing_files=()
    
    if [ -d "$api_dist" ]; then
        for file in "${required_files[@]}"; do
            if [ -f "$api_dist/$file" ]; then
                existing_files+=("$file")
            else
                missing_files+=("$file")
            fi
        done
        
        if [ ${#missing_files[@]} -eq 0 ]; then
            print_status "API build validated successfully"
            
            # Calculate size
            local size_bytes=$(du -sb "$api_dist" | cut -f1)
            local size_mb=$((size_bytes / 1024 / 1024))
            
            # Update JSON report
            jq --argjson files "$(printf '%s\n' "${existing_files[@]}" | jq -R . | jq -s .)" \
               --arg size "$size_mb" \
               '.validation_results.api.built = true | .validation_results.api.files_exist = $files | .validation_results.api.size_mb = ($size | tonumber)' \
               "$VALIDATION_REPORT" > "$VALIDATION_REPORT.tmp" && mv "$VALIDATION_REPORT.tmp" "$VALIDATION_REPORT"
        else
            print_error "API build validation failed - missing files: ${missing_files[*]}"
            
            # Update JSON report with errors
            jq --argjson missing "$(printf '%s\n' "${missing_files[@]}" | jq -R . | jq -s .)" \
               '.validation_results.api.files_missing = $missing | .errors += ["API build missing required files"]' \
               "$VALIDATION_REPORT" > "$VALIDATION_REPORT.tmp" && mv "$VALIDATION_REPORT.tmp" "$VALIDATION_REPORT"
            return 1
        fi
    else
        print_error "API dist directory not found: $api_dist"
        jq '.errors += ["API dist directory not found"]' "$VALIDATION_REPORT" > "$VALIDATION_REPORT.tmp" && mv "$VALIDATION_REPORT.tmp" "$VALIDATION_REPORT"
        return 1
    fi
}

validate_web_build() {
    print_step "Validating Web build..."
    
    local web_build="./apps/web/.next"
    local required_dirs=("static" "server")
    local missing_dirs=()
    local existing_dirs=()
    
    if [ -d "$web_build" ]; then
        for dir in "${required_dirs[@]}"; do
            if [ -d "$web_build/$dir" ]; then
                existing_dirs+=("$dir")
            else
                missing_dirs+=("$dir")
            fi
        done
        
        if [ ${#missing_dirs[@]} -eq 0 ]; then
            print_status "Web build validated successfully"
            
            # Calculate size
            local size_bytes=$(du -sb "$web_build" | cut -f1)
            local size_mb=$((size_bytes / 1024 / 1024))
            
            # Update JSON report
            jq --argjson dirs "$(printf '%s\n' "${existing_dirs[@]}" | jq -R . | jq -s .)" \
               --arg size "$size_mb" \
               '.validation_results.web.built = true | .validation_results.web.files_exist = $dirs | .validation_results.web.size_mb = ($size | tonumber)' \
               "$VALIDATION_REPORT" > "$VALIDATION_REPORT.tmp" && mv "$VALIDATION_REPORT.tmp" "$VALIDATION_REPORT"
        else
            print_error "Web build validation failed - missing directories: ${missing_dirs[*]}"
            
            jq --argjson missing "$(printf '%s\n' "${missing_dirs[@]}" | jq -R . | jq -s .)" \
               '.validation_results.web.files_missing = $missing | .errors += ["Web build missing required directories"]' \
               "$VALIDATION_REPORT" > "$VALIDATION_REPORT.tmp" && mv "$VALIDATION_REPORT.tmp" "$VALIDATION_REPORT"
            return 1
        fi
    else
        print_error "Web .next directory not found: $web_build"
        jq '.errors += ["Web .next directory not found"]' "$VALIDATION_REPORT" > "$VALIDATION_REPORT.tmp" && mv "$VALIDATION_REPORT.tmp" "$VALIDATION_REPORT"
        return 1
    fi
}

validate_mqtt_build() {
    print_step "Validating MQTT build..."
    
    local mqtt_dist="./apps/mqtt-ingestion/dist"
    local required_files=("index.js")
    local missing_files=()
    local existing_files=()
    
    if [ -d "$mqtt_dist" ]; then
        for file in "${required_files[@]}"; do
            if [ -f "$mqtt_dist/$file" ]; then
                existing_files+=("$file")
            else
                missing_files+=("$file")
            fi
        done
        
        if [ ${#missing_files[@]} -eq 0 ]; then
            print_status "MQTT build validated successfully"
            
            # Calculate size
            local size_bytes=$(du -sb "$mqtt_dist" | cut -f1)
            local size_mb=$((size_bytes / 1024 / 1024))
            
            # Update JSON report
            jq --argjson files "$(printf '%s\n' "${existing_files[@]}" | jq -R . | jq -s .)" \
               --arg size "$size_mb" \
               '.validation_results.mqtt.built = true | .validation_results.mqtt.files_exist = $files | .validation_results.mqtt.size_mb = ($size | tonumber)' \
               "$VALIDATION_REPORT" > "$VALIDATION_REPORT.tmp" && mv "$VALIDATION_REPORT.tmp" "$VALIDATION_REPORT"
        else
            print_error "MQTT build validation failed - missing files: ${missing_files[*]}"
            
            jq --argjson missing "$(printf '%s\n' "${missing_files[@]}" | jq -R . | jq -s .)" \
               '.validation_results.mqtt.files_missing = $missing | .errors += ["MQTT build missing required files"]' \
               "$VALIDATION_REPORT" > "$VALIDATION_REPORT.tmp" && mv "$VALIDATION_REPORT.tmp" "$VALIDATION_REPORT"
            return 1
        fi
    else
        print_error "MQTT dist directory not found: $mqtt_dist"
        jq '.errors += ["MQTT dist directory not found"]' "$VALIDATION_REPORT" > "$VALIDATION_REPORT.tmp" && mv "$VALIDATION_REPORT.tmp" "$VALIDATION_REPORT"
        return 1
    fi
}

validate_database_generation() {
    print_step "Validating Database client generation..."
    
    local db_client="./libs/database/node_modules/.prisma/client"
    local db_index="./libs/database/index.ts"
    
    if [ -d "$db_client" ] && [ -f "$db_index" ]; then
        print_status "Database client validated successfully"
        
        jq '.validation_results.database.generated = true | .validation_results.database.client_exists = true' \
           "$VALIDATION_REPORT" > "$VALIDATION_REPORT.tmp" && mv "$VALIDATION_REPORT.tmp" "$VALIDATION_REPORT"
    else
        print_error "Database client validation failed"
        jq '.errors += ["Database client not properly generated"]' \
           "$VALIDATION_REPORT" > "$VALIDATION_REPORT.tmp" && mv "$VALIDATION_REPORT.tmp" "$VALIDATION_REPORT"
        return 1
    fi
}

# Main validation
main() {
    local overall_success=true
    
    # Run all validations
    validate_database_generation || overall_success=false
    validate_api_build || overall_success=false
    validate_web_build || overall_success=false
    validate_mqtt_build || overall_success=false
    
    echo
    print_step "Generating final report..."
    
    # Update overall status
    if [ "$overall_success" = true ]; then
        jq '.overall_status = "success"' "$VALIDATION_REPORT" > "$VALIDATION_REPORT.tmp" && mv "$VALIDATION_REPORT.tmp" "$VALIDATION_REPORT"
        print_status "🎉 All builds validated successfully!"
        echo
        echo "Build sizes:"
        jq -r '.validation_results | to_entries[] | "  " + .key + ": " + (.value.size_mb | tostring) + "MB"' "$VALIDATION_REPORT"
    else
        jq '.overall_status = "failure"' "$VALIDATION_REPORT" > "$VALIDATION_REPORT.tmp" && mv "$VALIDATION_REPORT.tmp" "$VALIDATION_REPORT"
        print_error "Build validation failed!"
        echo
        print_step "Errors found:"
        jq -r '.errors[]' "$VALIDATION_REPORT" | while read -r error; do
            print_error "$error"
        done
    fi
    
    echo
    echo "📋 Detailed report: $VALIDATION_REPORT"
    echo
    
    if [ "$overall_success" = false ]; then
        exit 1
    fi
}

# Help text
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [options]"
    echo
    echo "Environment variables:"
    echo "  REPORT_DIR    Directory to store validation report (default: ./reports)"
    echo
    echo "Examples:"
    echo "  $0                           # Validate all builds"
    echo "  REPORT_DIR=/tmp/reports $0   # Custom report directory"
    exit 0
fi

# Check dependencies
if ! command -v jq &> /dev/null; then
    print_error "jq is required but not installed"
    echo "Please install jq: https://stedolan.github.io/jq/"
    exit 1
fi

# Run main function
main "$@"