#!/bin/bash

# LifeBox Code Generation Script
# Generates boilerplate code for common patterns

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
TEMPLATES_DIR="$SCRIPT_DIR/templates"

echo -e "${BLUE}🏗️  LifeBox Code Generator${NC}"
echo -e "${BLUE}===========================${NC}"
echo

# Print functions
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

# Template variables
replace_template_vars() {
    local template_file="$1"
    local output_file="$2"
    local name="$3"
    local name_kebab="$4"
    local name_pascal="$5"
    local name_camel="$6"
    local name_upper="$7"
    
    sed -e "s/{{NAME}}/$name/g" \
        -e "s/{{NAME_KEBAB}}/$name_kebab/g" \
        -e "s/{{NAME_PASCAL}}/$name_pascal/g" \
        -e "s/{{NAME_CAMEL}}/$name_camel/g" \
        -e "s/{{NAME_UPPER}}/$name_upper/g" \
        -e "s/{{DATE}}/$(date +%Y-%m-%d)/g" \
        -e "s/{{YEAR}}/$(date +%Y)/g" \
        "$template_file" > "$output_file"
}

# Convert string to different cases
to_kebab_case() {
    echo "$1" | sed -e 's/\([A-Z]\)/-\1/g' -e 's/^-//' -e 's/ /-/g' | tr '[:upper:]' '[:lower:]'
}

to_pascal_case() {
    echo "$1" | sed -r 's/(^|[-_\s])(\w)/\U\2/g' | sed 's/[-_\s]//g'
}

to_camel_case() {
    local pascal=$(to_pascal_case "$1")
    echo "${pascal:0:1}" | tr '[:upper:]' '[:lower:]' && echo "${pascal:1}"
}

to_upper_case() {
    echo "$1" | tr '[:lower:]' '[:upper:]' | sed 's/[-\s]/_/g'
}

# Generate NestJS module
generate_nestjs_module() {
    local name="$1"
    local name_kebab=$(to_kebab_case "$name")
    local name_pascal=$(to_pascal_case "$name")
    local name_camel=$(to_camel_case "$name")
    local name_upper=$(to_upper_case "$name")
    
    local module_dir="$PROJECT_ROOT/apps/api/src/modules/$name_kebab"
    
    if [ -d "$module_dir" ]; then
        print_error "Module $name_kebab already exists"
        return 1
    fi
    
    print_step "Generating NestJS module: $name_pascal"
    
    mkdir -p "$module_dir"
    mkdir -p "$module_dir/dto"
    mkdir -p "$module_dir/entities"
    
    # Generate files
    replace_template_vars "$TEMPLATES_DIR/nestjs/module.template.ts" \
        "$module_dir/$name_kebab.module.ts" \
        "$name" "$name_kebab" "$name_pascal" "$name_camel" "$name_upper"
    
    replace_template_vars "$TEMPLATES_DIR/nestjs/controller.template.ts" \
        "$module_dir/$name_kebab.controller.ts" \
        "$name" "$name_kebab" "$name_pascal" "$name_camel" "$name_upper"
    
    replace_template_vars "$TEMPLATES_DIR/nestjs/service.template.ts" \
        "$module_dir/$name_kebab.service.ts" \
        "$name" "$name_kebab" "$name_pascal" "$name_camel" "$name_upper"
    
    replace_template_vars "$TEMPLATES_DIR/nestjs/dto.template.ts" \
        "$module_dir/dto/create-$name_kebab.dto.ts" \
        "$name" "$name_kebab" "$name_pascal" "$name_camel" "$name_upper"
    
    replace_template_vars "$TEMPLATES_DIR/nestjs/update-dto.template.ts" \
        "$module_dir/dto/update-$name_kebab.dto.ts" \
        "$name" "$name_kebab" "$name_pascal" "$name_camel" "$name_upper"
    
    replace_template_vars "$TEMPLATES_DIR/nestjs/entity.template.ts" \
        "$module_dir/entities/$name_kebab.entity.ts" \
        "$name" "$name_kebab" "$name_pascal" "$name_camel" "$name_upper"
    
    replace_template_vars "$TEMPLATES_DIR/nestjs/controller.spec.template.ts" \
        "$module_dir/$name_kebab.controller.spec.ts" \
        "$name" "$name_kebab" "$name_pascal" "$name_camel" "$name_upper"
    
    replace_template_vars "$TEMPLATES_DIR/nestjs/service.spec.template.ts" \
        "$module_dir/$name_kebab.service.spec.ts" \
        "$name" "$name_kebab" "$name_pascal" "$name_camel" "$name_upper"
    
    print_success "NestJS module generated: $module_dir"
    print_info "Remember to add $name_pascal"Module" to your app.module.ts imports"
}

# Generate Next.js component
generate_nextjs_component() {
    local name="$1"
    local type="${2:-component}" # component, page, layout
    local name_kebab=$(to_kebab_case "$name")
    local name_pascal=$(to_pascal_case "$name")
    local name_camel=$(to_camel_case "$name")
    
    local components_dir="$PROJECT_ROOT/apps/web/src/components"
    local pages_dir="$PROJECT_ROOT/apps/web/src/app"
    
    case "$type" in
        "page")
            local output_dir="$pages_dir/$name_kebab"
            mkdir -p "$output_dir"
            replace_template_vars "$TEMPLATES_DIR/nextjs/page.template.tsx" \
                "$output_dir/page.tsx" \
                "$name" "$name_kebab" "$name_pascal" "$name_camel"
            print_success "Next.js page generated: $output_dir/page.tsx"
            ;;
        "layout")
            local output_dir="$pages_dir/$name_kebab"
            mkdir -p "$output_dir"
            replace_template_vars "$TEMPLATES_DIR/nextjs/layout.template.tsx" \
                "$output_dir/layout.tsx" \
                "$name" "$name_kebab" "$name_pascal" "$name_camel"
            print_success "Next.js layout generated: $output_dir/layout.tsx"
            ;;
        *)
            local output_dir="$components_dir/$name_kebab"
            mkdir -p "$output_dir"
            replace_template_vars "$TEMPLATES_DIR/nextjs/component.template.tsx" \
                "$output_dir/$name_kebab.tsx" \
                "$name" "$name_kebab" "$name_pascal" "$name_camel"
            
            replace_template_vars "$TEMPLATES_DIR/nextjs/component.spec.template.tsx" \
                "$output_dir/$name_kebab.test.tsx" \
                "$name" "$name_kebab" "$name_pascal" "$name_camel"
            
            replace_template_vars "$TEMPLATES_DIR/nextjs/component.stories.template.tsx" \
                "$output_dir/$name_kebab.stories.tsx" \
                "$name" "$name_kebab" "$name_pascal" "$name_camel"
            
            print_success "Next.js component generated: $output_dir/"
            ;;
    esac
}

# Generate Prisma model
generate_prisma_model() {
    local name="$1"
    local name_pascal=$(to_pascal_case "$name")
    local name_camel=$(to_camel_case "$name")
    
    local schema_file="$PROJECT_ROOT/libs/database/prisma/schema.prisma"
    
    if grep -q "model $name_pascal" "$schema_file"; then
        print_error "Prisma model $name_pascal already exists"
        return 1
    fi
    
    print_step "Generating Prisma model: $name_pascal"
    
    # Add model to schema
    local temp_file=$(mktemp)
    replace_template_vars "$TEMPLATES_DIR/prisma/model.template.prisma" \
        "$temp_file" \
        "$name" "$(to_kebab_case "$name")" "$name_pascal" "$name_camel"
    
    echo "" >> "$schema_file"
    cat "$temp_file" >> "$schema_file"
    rm "$temp_file"
    
    print_success "Prisma model added to schema.prisma"
    print_info "Run 'npm run db:generate' to update the Prisma client"
}

# Generate database migration
generate_migration() {
    local description="$1"
    
    if [ -z "$description" ]; then
        print_error "Migration description is required"
        return 1
    fi
    
    print_step "Generating database migration: $description"
    
    cd "$PROJECT_ROOT"
    npm run db:migrate -- --name "$description"
    
    print_success "Migration generated successfully"
}

# Generate API test
generate_api_test() {
    local module_name="$1"
    local name_kebab=$(to_kebab_case "$module_name")
    local name_pascal=$(to_pascal_case "$module_name")
    
    local test_dir="$PROJECT_ROOT/apps/api/test"
    mkdir -p "$test_dir"
    
    replace_template_vars "$TEMPLATES_DIR/testing/api-e2e.template.ts" \
        "$test_dir/$name_kebab.e2e-spec.ts" \
        "$module_name" "$name_kebab" "$name_pascal"
    
    print_success "E2E test generated: $test_dir/$name_kebab.e2e-spec.ts"
}

# Show available generators
show_generators() {
    echo -e "${CYAN}Available Generators:${NC}"
    echo
    echo -e "  ${YELLOW}Backend (NestJS):${NC}"
    echo -e "    module <name>              Generate complete NestJS module"
    echo -e "    api-test <module>          Generate E2E API test"
    echo
    echo -e "  ${YELLOW}Frontend (Next.js):${NC}" 
    echo -e "    component <name>           Generate React component"
    echo -e "    page <name>                Generate Next.js page"
    echo -e "    layout <name>              Generate Next.js layout"
    echo
    echo -e "  ${YELLOW}Database:${NC}"
    echo -e "    model <name>               Generate Prisma model"
    echo -e "    migration <description>    Generate database migration"
    echo
    echo -e "  ${YELLOW}Examples:${NC}"
    echo -e "    $0 module user-profile"
    echo -e "    $0 component user-dashboard"
    echo -e "    $0 page settings"
    echo -e "    $0 model device-reading"
    echo -e "    $0 migration \"add user preferences\""
    echo
}

# Main function
main() {
    local generator="$1"
    local name="$2"
    local extra="$3"
    
    if [ -z "$generator" ]; then
        show_generators
        return 0
    fi
    
    if [ ! -d "$TEMPLATES_DIR" ]; then
        print_error "Templates directory not found: $TEMPLATES_DIR"
        print_info "Make sure you run this script from the project root"
        return 1
    fi
    
    case "$generator" in
        "module")
            if [ -z "$name" ]; then
                print_error "Module name is required"
                return 1
            fi
            generate_nestjs_module "$name"
            ;;
        "component")
            if [ -z "$name" ]; then
                print_error "Component name is required"
                return 1
            fi
            generate_nextjs_component "$name" "component"
            ;;
        "page")
            if [ -z "$name" ]; then
                print_error "Page name is required"
                return 1
            fi
            generate_nextjs_component "$name" "page"
            ;;
        "layout")
            if [ -z "$name" ]; then
                print_error "Layout name is required"
                return 1
            fi
            generate_nextjs_component "$name" "layout"
            ;;
        "model")
            if [ -z "$name" ]; then
                print_error "Model name is required"
                return 1
            fi
            generate_prisma_model "$name"
            ;;
        "migration")
            if [ -z "$name" ]; then
                print_error "Migration description is required"
                return 1
            fi
            generate_migration "$name"
            ;;
        "api-test")
            if [ -z "$name" ]; then
                print_error "Module name is required"
                return 1
            fi
            generate_api_test "$name"
            ;;
        *)
            print_error "Unknown generator: $generator"
            echo
            show_generators
            return 1
            ;;
    esac
}

# Help text
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "LifeBox Code Generator"
    echo
    echo "Generates boilerplate code for common patterns in the LifeBox IoT Platform."
    echo
    echo "Usage: $0 <generator> <name> [options]"
    echo
    show_generators
    exit 0
fi

# Run main function
main "$@"