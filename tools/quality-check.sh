#!/bin/bash

# LifeBox Automated Code Quality Checks
# Comprehensive quality gate for code quality assurance

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
REPORTS_DIR="$PROJECT_ROOT/reports/quality"

echo -e "${BLUE}🔍 LifeBox Code Quality Gate${NC}"
echo -e "${BLUE}==============================${NC}"
echo

# Create reports directory
mkdir -p "$REPORTS_DIR"

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

# Quality gate status tracking
QUALITY_ISSUES=0
QUALITY_WARNINGS=0

# Check TypeScript compilation
check_typescript() {
    print_header "TypeScript Compilation"
    
    print_step "Running TypeScript compiler..."
    
    cd "$PROJECT_ROOT"
    
    if npm run typecheck > "$REPORTS_DIR/typescript.log" 2>&1; then
        print_success "TypeScript compilation passed"
        rm -f "$REPORTS_DIR/typescript.log"
    else
        print_error "TypeScript compilation failed"
        echo "📋 Errors saved to: $REPORTS_DIR/typescript.log"
        
        # Show first 10 errors
        print_info "First 10 TypeScript errors:"
        head -n 20 "$REPORTS_DIR/typescript.log" | tail -n +2
        
        QUALITY_ISSUES=$((QUALITY_ISSUES + 1))
    fi
    
    echo
}

# Check ESLint rules
check_eslint() {
    print_header "ESLint Code Quality"
    
    print_step "Running ESLint..."
    
    cd "$PROJECT_ROOT"
    
    # Run ESLint and capture output
    if npm run lint > "$REPORTS_DIR/eslint.log" 2>&1; then
        print_success "ESLint checks passed"
        rm -f "$REPORTS_DIR/eslint.log"
    else
        # Check if it's just warnings or actual errors
        if grep -q "error" "$REPORTS_DIR/eslint.log"; then
            print_error "ESLint found errors"
            QUALITY_ISSUES=$((QUALITY_ISSUES + 1))
        else
            print_warning "ESLint found warnings"
            QUALITY_WARNINGS=$((QUALITY_WARNINGS + 1))
        fi
        
        echo "📋 Report saved to: $REPORTS_DIR/eslint.log"
        
        # Show summary
        local errors=$(grep -c "error" "$REPORTS_DIR/eslint.log" || echo "0")
        local warnings=$(grep -c "warning" "$REPORTS_DIR/eslint.log" || echo "0")
        
        print_info "ESLint Summary: $errors errors, $warnings warnings"
        
        # Show first 10 issues
        if [ "$errors" -gt 0 ] || [ "$warnings" -gt 0 ]; then
            print_info "First 10 issues:"
            head -n 15 "$REPORTS_DIR/eslint.log"
        fi
    fi
    
    echo
}

# Check Prettier formatting
check_prettier() {
    print_header "Code Formatting (Prettier)"
    
    print_step "Checking code formatting..."
    
    cd "$PROJECT_ROOT"
    
    if npm run format:check > "$REPORTS_DIR/prettier.log" 2>&1; then
        print_success "Code formatting is correct"
        rm -f "$REPORTS_DIR/prettier.log"
    else
        print_warning "Code formatting issues found"
        echo "📋 Report saved to: $REPORTS_DIR/prettier.log"
        
        # Show files with formatting issues
        print_info "Files with formatting issues:"
        cat "$REPORTS_DIR/prettier.log" | head -n 10
        
        print_info "Run 'npm run format' to fix formatting issues"
        QUALITY_WARNINGS=$((QUALITY_WARNINGS + 1))
    fi
    
    echo
}

# Check test coverage
check_test_coverage() {
    print_header "Test Coverage Analysis"
    
    print_step "Running tests with coverage..."
    
    cd "$PROJECT_ROOT"
    
    if npm run test:ci > "$REPORTS_DIR/test-coverage.log" 2>&1; then
        # Extract coverage information
        if grep -q "Coverage" "$REPORTS_DIR/test-coverage.log"; then
            print_success "Tests passed with coverage report"
            
            # Extract and display coverage summary
            print_info "Coverage Summary:"
            grep -A 10 "Coverage" "$REPORTS_DIR/test-coverage.log" | tail -n 5
        else
            print_success "Tests passed"
        fi
    else
        print_error "Tests failed"
        echo "📋 Report saved to: $REPORTS_DIR/test-coverage.log"
        
        # Show test failures
        print_info "Test failures:"
        grep -A 5 "FAIL\|Failed" "$REPORTS_DIR/test-coverage.log" | head -n 10
        
        QUALITY_ISSUES=$((QUALITY_ISSUES + 1))
    fi
    
    echo
}

# Check security vulnerabilities
check_security() {
    print_header "Security Vulnerability Scan"
    
    print_step "Running npm audit..."
    
    cd "$PROJECT_ROOT"
    
    # Run npm audit
    if npm audit --audit-level=high > "$REPORTS_DIR/security.log" 2>&1; then
        print_success "No high-severity security vulnerabilities found"
        rm -f "$REPORTS_DIR/security.log"
    else
        local exit_code=$?
        
        if [ $exit_code -eq 1 ]; then
            print_warning "Low/moderate security vulnerabilities found"
            QUALITY_WARNINGS=$((QUALITY_WARNINGS + 1))
        else
            print_error "High-severity security vulnerabilities found"
            QUALITY_ISSUES=$((QUALITY_ISSUES + 1))
        fi
        
        echo "📋 Report saved to: $REPORTS_DIR/security.log"
        
        # Show vulnerability summary
        print_info "Vulnerability Summary:"
        grep -E "(found|vulnerabilities)" "$REPORTS_DIR/security.log" | head -n 5
        
        print_info "Run 'npm audit fix' to attempt automatic fixes"
    fi
    
    echo
}

# Check dependencies
check_dependencies() {
    print_header "Dependency Analysis"
    
    print_step "Checking for outdated dependencies..."
    
    cd "$PROJECT_ROOT"
    
    # Check for outdated packages
    if npm outdated > "$REPORTS_DIR/outdated.log" 2>&1; then
        print_success "All dependencies are up to date"
        rm -f "$REPORTS_DIR/outdated.log"
    else
        print_info "Some dependencies have updates available"
        echo "📋 Report saved to: $REPORTS_DIR/outdated.log"
        
        print_info "Outdated packages (top 10):"
        head -n 15 "$REPORTS_DIR/outdated.log" | tail -n +2
        
        # This is informational, not a quality gate failure
    fi
    
    # Check for unused dependencies
    print_step "Checking for unused dependencies..."
    
    if command -v npx &> /dev/null; then
        if npx depcheck --json > "$REPORTS_DIR/depcheck.json" 2>&1; then
            local unused=$(jq -r '.dependencies | length' "$REPORTS_DIR/depcheck.json" 2>/dev/null || echo "0")
            local missing=$(jq -r '.missing | length' "$REPORTS_DIR/depcheck.json" 2>/dev/null || echo "0")
            
            if [ "$unused" -eq 0 ] && [ "$missing" -eq 0 ]; then
                print_success "No unused or missing dependencies found"
                rm -f "$REPORTS_DIR/depcheck.json"
            else
                print_warning "Found $unused unused and $missing missing dependencies"
                echo "📋 Report saved to: $REPORTS_DIR/depcheck.json"
                
                if [ "$missing" -gt 0 ]; then
                    QUALITY_WARNINGS=$((QUALITY_WARNINGS + 1))
                fi
            fi
        else
            print_info "Dependency check skipped (depcheck not available)"
        fi
    else
        print_info "Dependency check skipped (npx not available)"
    fi
    
    echo
}

# Check build success
check_build() {
    print_header "Build Verification"
    
    print_step "Running production build..."
    
    cd "$PROJECT_ROOT"
    
    if npm run build > "$REPORTS_DIR/build.log" 2>&1; then
        print_success "Production build successful"
        
        # Run build validation if available
        if [ -f "$SCRIPT_DIR/build-validate.sh" ]; then
            print_step "Running build validation..."
            if "$SCRIPT_DIR/build-validate.sh" >> "$REPORTS_DIR/build.log" 2>&1; then
                print_success "Build validation passed"
            else
                print_warning "Build validation found issues"
                QUALITY_WARNINGS=$((QUALITY_WARNINGS + 1))
            fi
        fi
        
        rm -f "$REPORTS_DIR/build.log"
    else
        print_error "Production build failed"
        echo "📋 Report saved to: $REPORTS_DIR/build.log"
        
        # Show build errors
        print_info "Build errors:"
        tail -n 20 "$REPORTS_DIR/build.log"
        
        QUALITY_ISSUES=$((QUALITY_ISSUES + 1))
    fi
    
    echo
}

# Check documentation
check_documentation() {
    print_header "Documentation Quality"
    
    print_step "Checking documentation completeness..."
    
    cd "$PROJECT_ROOT"
    
    local doc_score=0
    local doc_issues=()
    
    # Check for README files
    if [ -f "README.md" ]; then
        doc_score=$((doc_score + 1))
    else
        doc_issues+=("Missing root README.md")
    fi
    
    # Check for API documentation
    if [ -d "docs" ] && [ "$(find docs -name '*.md' | wc -l)" -gt 0 ]; then
        doc_score=$((doc_score + 1))
    else
        doc_issues+=("Missing documentation in docs/ directory")
    fi
    
    # Check for package.json descriptions
    local missing_descriptions=$(find . -name "package.json" -exec jq -r 'select(.description == null or .description == "") | .name // "unknown"' {} \; | wc -l)
    if [ "$missing_descriptions" -eq 0 ]; then
        doc_score=$((doc_score + 1))
    else
        doc_issues+=("$missing_descriptions package.json files missing descriptions")
    fi
    
    # Check for code comments in main files
    local commented_files=$(find apps/*/src libs/*/src -name "*.ts" -exec grep -l "^\s*\*\|^\s*//" {} \; 2>/dev/null | wc -l)
    local total_files=$(find apps/*/src libs/*/src -name "*.ts" 2>/dev/null | wc -l)
    
    if [ "$total_files" -gt 0 ]; then
        local comment_ratio=$((commented_files * 100 / total_files))
        if [ "$comment_ratio" -ge 50 ]; then
            doc_score=$((doc_score + 1))
        else
            doc_issues+=("Only $comment_ratio% of TypeScript files have comments")
        fi
    fi
    
    # Documentation scoring
    if [ "$doc_score" -ge 3 ]; then
        print_success "Documentation quality is good"
    elif [ "$doc_score" -ge 2 ]; then
        print_warning "Documentation quality could be improved"
        QUALITY_WARNINGS=$((QUALITY_WARNINGS + 1))
    else
        print_warning "Documentation quality needs attention"
        QUALITY_WARNINGS=$((QUALITY_WARNINGS + 1))
    fi
    
    # Show documentation issues
    if [ ${#doc_issues[@]} -gt 0 ]; then
        print_info "Documentation improvements needed:"
        for issue in "${doc_issues[@]}"; do
            echo "  • $issue"
        done
    fi
    
    echo
}

# Generate quality report
generate_quality_report() {
    print_header "Quality Gate Summary"
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local report_file="$REPORTS_DIR/quality-gate-report.json"
    
    # Create JSON report
    cat > "$report_file" << EOF
{
  "timestamp": "$timestamp",
  "quality_gate": {
    "status": "unknown",
    "issues": $QUALITY_ISSUES,
    "warnings": $QUALITY_WARNINGS,
    "checks": {
      "typescript": $([ $QUALITY_ISSUES -eq 0 ] && echo "true" || echo "false"),
      "eslint": $([ $QUALITY_ISSUES -eq 0 ] && echo "true" || echo "false"),
      "prettier": "info",
      "tests": $([ $QUALITY_ISSUES -eq 0 ] && echo "true" || echo "false"),
      "security": $([ $QUALITY_ISSUES -eq 0 ] && echo "true" || echo "false"),
      "build": $([ $QUALITY_ISSUES -eq 0 ] && echo "true" || echo "false"),
      "documentation": "info"
    }
  },
  "reports": {
    "directory": "$REPORTS_DIR",
    "files": $(ls -la "$REPORTS_DIR"/*.log 2>/dev/null | wc -l)
  }
}
EOF
    
    # Determine overall status
    if [ $QUALITY_ISSUES -eq 0 ]; then
        if [ $QUALITY_WARNINGS -eq 0 ]; then
            jq '.quality_gate.status = "passed"' "$report_file" > "$report_file.tmp" && mv "$report_file.tmp" "$report_file"
            print_success "🎉 Quality gate PASSED!"
        else
            jq '.quality_gate.status = "passed_with_warnings"' "$report_file" > "$report_file.tmp" && mv "$report_file.tmp" "$report_file"
            print_success "✅ Quality gate PASSED with $QUALITY_WARNINGS warnings"
        fi
    else
        jq '.quality_gate.status = "failed"' "$report_file" > "$report_file.tmp" && mv "$report_file.tmp" "$report_file"
        print_error "❌ Quality gate FAILED with $QUALITY_ISSUES issues and $QUALITY_WARNINGS warnings"
    fi
    
    echo
    print_info "Quality Gate Summary:"
    echo "  • Issues: $QUALITY_ISSUES"
    echo "  • Warnings: $QUALITY_WARNINGS"
    echo "  • Report: $report_file"
    echo
    
    if [ $QUALITY_ISSUES -gt 0 ]; then
        print_info "Review the following reports for details:"
        find "$REPORTS_DIR" -name "*.log" -exec echo "  • {}" \;
        echo
        return 1
    fi
    
    return 0
}

# Main execution
main() {
    check_typescript
    check_eslint  
    check_prettier
    check_test_coverage
    check_security
    check_dependencies
    check_build
    check_documentation
    generate_quality_report
}

# Help text
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "LifeBox Code Quality Gate Script"
    echo
    echo "Runs comprehensive code quality checks including:"
    echo "  • TypeScript compilation"
    echo "  • ESLint code quality"
    echo "  • Prettier formatting"
    echo "  • Test coverage"
    echo "  • Security vulnerabilities"
    echo "  • Dependency analysis"
    echo "  • Build verification"
    echo "  • Documentation quality"
    echo
    echo "Usage: $0 [options]"
    echo
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  --fix          Attempt to fix auto-fixable issues"
    echo "  --skip-tests   Skip test execution (faster checks)"
    echo "  --skip-build   Skip build verification"
    echo
    echo "Reports are saved to: reports/quality/"
    echo
    exit 0
fi

# Handle options
FIX_ISSUES=false
SKIP_TESTS=false
SKIP_BUILD=false

for arg in "$@"; do
    case $arg in
        --fix)
            FIX_ISSUES=true
            ;;
        --skip-tests)
            SKIP_TESTS=true
            ;;
        --skip-build)
            SKIP_BUILD=true
            ;;
    esac
done

# Auto-fix issues if requested
if [ "$FIX_ISSUES" = true ]; then
    print_info "🔧 Attempting to fix auto-fixable issues..."
    
    cd "$PROJECT_ROOT"
    
    print_step "Running prettier format..."
    npm run format || true
    
    print_step "Running ESLint with --fix..."
    npm run lint:fix || true
    
    print_step "Running npm audit fix..."
    npm audit fix || true
    
    echo
fi

# Run quality checks based on options
if [ "$SKIP_TESTS" = true ] && [ "$SKIP_BUILD" = true ]; then
    check_typescript
    check_eslint
    check_prettier
    check_security
    check_dependencies
    check_documentation
    generate_quality_report
elif [ "$SKIP_TESTS" = true ]; then
    check_typescript
    check_eslint
    check_prettier
    check_security
    check_dependencies
    check_build
    check_documentation
    generate_quality_report
elif [ "$SKIP_BUILD" = true ]; then
    check_typescript
    check_eslint
    check_prettier
    check_test_coverage
    check_security
    check_dependencies
    check_documentation
    generate_quality_report
else
    main "$@"
fi