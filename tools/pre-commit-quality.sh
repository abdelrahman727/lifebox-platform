#!/bin/bash

# LifeBox Pre-commit Quality Check
# Fast quality checks for pre-commit hooks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Pre-commit Quality Check${NC}"
echo -e "${BLUE}============================${NC}"

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

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)
STAGED_TS_FILES=$(echo "$STAGED_FILES" | grep -E '\.(ts|tsx)$' || true)
STAGED_JS_FILES=$(echo "$STAGED_FILES" | grep -E '\.(js|jsx|ts|tsx)$' || true)
STAGED_JSON_FILES=$(echo "$STAGED_FILES" | grep -E '\.(json|md|yml|yaml)$' || true)

if [ -z "$STAGED_FILES" ]; then
    print_warning "No staged files found"
    exit 0
fi

print_step "Checking $(echo "$STAGED_FILES" | wc -l) staged files..."

# Check TypeScript files
if [ -n "$STAGED_TS_FILES" ]; then
    print_step "Running TypeScript check on staged files..."
    
    # Create temporary tsconfig for staged files only
    if command -v jq &> /dev/null; then
        echo "$STAGED_TS_FILES" | jq -R -s 'split("\n") | map(select(length > 0))' > /tmp/staged-files.json
        
        # Quick TypeScript check (no emit)
        if npx tsc --noEmit --skipLibCheck $STAGED_TS_FILES 2>/dev/null; then
            print_success "TypeScript check passed"
        else
            print_error "TypeScript errors found in staged files"
            echo "Run 'npm run typecheck' for details"
            exit 1
        fi
    fi
fi

# Check ESLint on staged JS/TS files
if [ -n "$STAGED_JS_FILES" ]; then
    print_step "Running ESLint on staged files..."
    
    if echo "$STAGED_JS_FILES" | xargs npx eslint --max-warnings 0 2>/dev/null; then
        print_success "ESLint check passed"
    else
        print_error "ESLint errors found in staged files"
        echo "Run 'npm run lint:fix' to fix auto-fixable issues"
        exit 1
    fi
fi

# Check Prettier formatting
if [ -n "$STAGED_FILES" ]; then
    print_step "Checking code formatting..."
    
    if echo "$STAGED_FILES" | xargs npx prettier --check 2>/dev/null; then
        print_success "Code formatting is correct"
    else
        print_error "Code formatting issues found"
        echo "Run 'npm run format' to fix formatting issues"
        exit 1
    fi
fi

# Check for common issues
print_step "Checking for common issues..."

# Check for console.log statements (except in specific files)
if echo "$STAGED_JS_FILES" | grep -v -E "(\.test\.|\.spec\.|\.stories\.)" | xargs grep -l "console\.log" 2>/dev/null; then
    print_warning "Found console.log statements in staged files"
    echo "Consider removing console.log statements before committing"
    # Don't fail, just warn
fi

# Check for TODO/FIXME comments
if echo "$STAGED_FILES" | xargs grep -l -E "(TODO|FIXME|XXX|HACK)" 2>/dev/null; then
    print_warning "Found TODO/FIXME comments in staged files"
    echo "Consider addressing these items before committing"
    # Don't fail, just warn
fi

# Check for potential secrets
SECRET_PATTERNS=(
    "password\s*=\s*['\"][^'\"]+['\"]"
    "secret\s*=\s*['\"][^'\"]+['\"]"
    "api_key\s*=\s*['\"][^'\"]+['\"]"
    "token\s*=\s*['\"][^'\"]+['\"]"
    "['\"][A-Za-z0-9]{32,}['\"]"  # Long strings that might be secrets
)

for pattern in "${SECRET_PATTERNS[@]}"; do
    if echo "$STAGED_FILES" | xargs grep -l -E "$pattern" 2>/dev/null; then
        print_error "Potential secrets found in staged files!"
        echo "Please review and remove any hardcoded secrets"
        exit 1
    fi
done

# Check package.json changes
if echo "$STAGED_FILES" | grep -q "package\.json"; then
    print_step "Checking package.json changes..."
    
    # Verify package.json is valid JSON
    for pkg_file in $(echo "$STAGED_FILES" | grep "package\.json"); do
        if ! jq empty "$pkg_file" 2>/dev/null; then
            print_error "Invalid JSON in $pkg_file"
            exit 1
        fi
    done
    
    print_success "package.json files are valid"
fi

# Check for large files
print_step "Checking file sizes..."
LARGE_FILES=$(echo "$STAGED_FILES" | xargs ls -la 2>/dev/null | awk '$5 > 1000000 {print $9, $5}' || true)

if [ -n "$LARGE_FILES" ]; then
    print_warning "Large files detected:"
    echo "$LARGE_FILES"
    echo "Consider if these large files should be committed"
    # Don't fail, just warn
fi

print_success "🎉 Pre-commit quality checks passed!"

exit 0