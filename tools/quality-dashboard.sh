#!/bin/bash

# LifeBox Quality Dashboard
# Interactive quality metrics and trends viewer

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="$PROJECT_ROOT/reports/quality"

clear

echo -e "${BOLD}${BLUE}📊 LifeBox Quality Dashboard${NC}"
echo -e "${BLUE}══════════════════════════════${NC}"
echo

# Print functions
print_header() {
    echo -e "${PURPLE}${BOLD}$1${NC}"
    echo -e "${PURPLE}$(printf '═%.0s' $(seq 1 ${#1}))${NC}"
}

print_metric() {
    local label="$1"
    local value="$2"
    local status="$3"
    local color="${GREEN}"
    
    case "$status" in
        "good") color="${GREEN}" ;;
        "warning") color="${YELLOW}" ;;
        "error") color="${RED}" ;;
        "info") color="${CYAN}" ;;
    esac
    
    printf "%-20s ${color}%s${NC}\n" "$label:" "$value"
}

print_progress_bar() {
    local current="$1"
    local total="$2"
    local width=30
    local percentage=$((current * 100 / total))
    local filled=$((width * current / total))
    local empty=$((width - filled))
    
    printf "["
    for ((i=1; i<=filled; i++)); do printf "█"; done
    for ((i=1; i<=empty; i++)); do printf "░"; done
    printf "] %3d%% (%d/%d)\n" "$percentage" "$current" "$total"
}

# Get current project metrics
get_current_metrics() {
    cd "$PROJECT_ROOT"
    
    # TypeScript files count
    local ts_files=$(find apps libs -name "*.ts" -not -path "*/node_modules/*" 2>/dev/null | wc -l)
    local tsx_files=$(find apps libs -name "*.tsx" -not -path "*/node_modules/*" 2>/dev/null | wc -l)
    local total_files=$((ts_files + tsx_files))
    
    # Lines of code
    local total_lines=$(find apps libs -name "*.ts" -o -name "*.tsx" -not -path "*/node_modules/*" 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
    
    # Test files
    local test_files=$(find apps libs -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" -not -path "*/node_modules/*" 2>/dev/null | wc -l)
    
    # Package.json files
    local packages=$(find . -name "package.json" -not -path "*/node_modules/*" 2>/dev/null | wc -l)
    
    # Git information
    local commits_today=$(git log --since="1 day ago" --oneline 2>/dev/null | wc -l)
    local commits_week=$(git log --since="1 week ago" --oneline 2>/dev/null | wc -l)
    local current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    
    echo "$total_files,$total_lines,$test_files,$packages,$commits_today,$commits_week,$current_branch"
}

# Show project overview
show_project_overview() {
    print_header "📈 Project Overview"
    
    local metrics=$(get_current_metrics)
    IFS=',' read -r total_files total_lines test_files packages commits_today commits_week current_branch <<< "$metrics"
    
    print_metric "Project" "LifeBox IoT Platform" "info"
    print_metric "Current Branch" "$current_branch" "info"
    print_metric "Total TS/TSX Files" "$total_files" "info"
    print_metric "Lines of Code" "$(printf "%'d" $total_lines)" "info"
    print_metric "Test Files" "$test_files" "info"
    print_metric "Packages" "$packages" "info"
    print_metric "Commits Today" "$commits_today" "info"
    print_metric "Commits This Week" "$commits_week" "info"
    
    # Test coverage ratio
    if [ "$total_files" -gt 0 ] && [ "$test_files" -gt 0 ]; then
        local test_ratio=$((test_files * 100 / total_files))
        echo
        printf "%-20s " "Test Coverage Ratio:"
        if [ "$test_ratio" -ge 50 ]; then
            print_progress_bar "$test_files" "$total_files"
        else
            echo -e "${YELLOW}$(print_progress_bar "$test_files" "$total_files")${NC}"
        fi
    fi
    
    echo
}

# Show quality metrics
show_quality_metrics() {
    print_header "🔍 Quality Metrics"
    
    if [ -f "$REPORTS_DIR/quality-gate-report.json" ]; then
        local report="$REPORTS_DIR/quality-gate-report.json"
        
        local status=$(jq -r '.quality_gate.status' "$report" 2>/dev/null || echo "unknown")
        local issues=$(jq -r '.quality_gate.issues' "$report" 2>/dev/null || echo "0")
        local warnings=$(jq -r '.quality_gate.warnings' "$report" 2>/dev/null || echo "0")
        local timestamp=$(jq -r '.timestamp' "$report" 2>/dev/null || echo "unknown")
        
        case "$status" in
            "passed") print_metric "Quality Gate" "✅ PASSED" "good" ;;
            "passed_with_warnings") print_metric "Quality Gate" "⚠️ PASSED with warnings" "warning" ;;
            "failed") print_metric "Quality Gate" "❌ FAILED" "error" ;;
            *) print_metric "Quality Gate" "❓ Unknown" "info" ;;
        esac
        
        print_metric "Issues" "$issues" $([ "$issues" -eq 0 ] && echo "good" || echo "error")
        print_metric "Warnings" "$warnings" $([ "$warnings" -eq 0 ] && echo "good" || echo "warning")
        print_metric "Last Check" "$(date -d "$timestamp" '+%Y-%m-%d %H:%M' 2>/dev/null || echo "$timestamp")" "info"
        
        # Individual checks
        echo
        echo -e "${CYAN}Individual Checks:${NC}"
        
        local typescript=$(jq -r '.quality_gate.checks.typescript' "$report" 2>/dev/null || echo "unknown")
        local eslint=$(jq -r '.quality_gate.checks.eslint' "$report" 2>/dev/null || echo "unknown")
        local tests=$(jq -r '.quality_gate.checks.tests' "$report" 2>/dev/null || echo "unknown")
        local security=$(jq -r '.quality_gate.checks.security' "$report" 2>/dev/null || echo "unknown")
        local build=$(jq -r '.quality_gate.checks.build' "$report" 2>/dev/null || echo "unknown")
        
        printf "  %-15s %s\n" "TypeScript:" "$([ "$typescript" = "true" ] && echo "✅" || echo "❌")"
        printf "  %-15s %s\n" "ESLint:" "$([ "$eslint" = "true" ] && echo "✅" || echo "❌")"
        printf "  %-15s %s\n" "Tests:" "$([ "$tests" = "true" ] && echo "✅" || echo "❌")"
        printf "  %-15s %s\n" "Security:" "$([ "$security" = "true" ] && echo "✅" || echo "❌")"
        printf "  %-15s %s\n" "Build:" "$([ "$build" = "true" ] && echo "✅" || echo "❌")"
        
    else
        print_metric "Quality Gate" "No recent reports" "info"
        echo "Run './tools/quality-check.sh' to generate a quality report"
    fi
    
    echo
}

# Show recent reports
show_recent_reports() {
    print_header "📋 Recent Reports"
    
    if [ -d "$REPORTS_DIR" ] && [ "$(ls -A "$REPORTS_DIR" 2>/dev/null)" ]; then
        echo "Available quality reports:"
        echo
        
        local count=0
        for file in "$REPORTS_DIR"/*.{log,json} 2>/dev/null; do
            if [ -f "$file" ]; then
                local filename=$(basename "$file")
                local size=$(ls -lh "$file" | awk '{print $5}')
                local modified=$(ls -l "$file" | awk '{print $6, $7, $8}')
                
                printf "  📄 %-25s %6s  %s\n" "$filename" "$size" "$modified"
                count=$((count + 1))
            fi
        done
        
        if [ $count -eq 0 ]; then
            echo "  No reports found"
        fi
    else
        echo "No reports directory found. Run quality checks to generate reports."
    fi
    
    echo
}

# Show git statistics
show_git_stats() {
    print_header "📈 Git Statistics"
    
    if git rev-parse --git-dir >/dev/null 2>&1; then
        # Recent activity
        print_metric "Last Commit" "$(git log -1 --format='%cr' 2>/dev/null || echo 'unknown')" "info"
        print_metric "Total Commits" "$(git rev-list --count HEAD 2>/dev/null || echo '0')" "info"
        print_metric "Contributors" "$(git shortlog -sn | wc -l 2>/dev/null || echo '0')" "info"
        
        # Branch information
        local total_branches=$(git branch -r 2>/dev/null | wc -l)
        print_metric "Remote Branches" "$total_branches" "info"
        
        # Commit activity chart (last 7 days)
        echo
        echo -e "${CYAN}Commit Activity (Last 7 Days):${NC}"
        
        for i in {6..0}; do
            local date=$(date -d "$i days ago" '+%Y-%m-%d')
            local day=$(date -d "$i days ago" '+%a')
            local commits=$(git log --since="$date 00:00" --until="$date 23:59" --oneline 2>/dev/null | wc -l)
            
            printf "  %s %s " "$day" "$date"
            for ((j=1; j<=commits && j<=20; j++)); do
                printf "█"
            done
            printf " %d\n" "$commits"
        done
        
    else
        echo "Not a git repository"
    fi
    
    echo
}

# Show dependency information
show_dependency_info() {
    print_header "📦 Dependencies"
    
    cd "$PROJECT_ROOT"
    
    if [ -f "package.json" ]; then
        local deps=$(jq -r '.dependencies | length' package.json 2>/dev/null || echo "0")
        local dev_deps=$(jq -r '.devDependencies | length' package.json 2>/dev/null || echo "0")
        local total_deps=$((deps + dev_deps))
        
        print_metric "Dependencies" "$deps" "info"
        print_metric "Dev Dependencies" "$dev_deps" "info"
        print_metric "Total" "$total_deps" "info"
        
        # Check for security vulnerabilities
        if [ -f "$REPORTS_DIR/security.log" ]; then
            local vulnerabilities=$(grep -c "vulnerabilities" "$REPORTS_DIR/security.log" 2>/dev/null || echo "0")
            print_metric "Security Issues" "$vulnerabilities" $([ "$vulnerabilities" -eq 0 ] && echo "good" || echo "warning")
        fi
        
        # Check for outdated packages
        if [ -f "$REPORTS_DIR/outdated.log" ]; then
            local outdated=$(cat "$REPORTS_DIR/outdated.log" 2>/dev/null | wc -l)
            if [ "$outdated" -gt 1 ]; then  # Subtract 1 for header
                outdated=$((outdated - 1))
                print_metric "Outdated Packages" "$outdated" "warning"
            else
                print_metric "Outdated Packages" "0" "good"
            fi
        fi
        
    else
        echo "No package.json found"
    fi
    
    echo
}

# Interactive menu
show_menu() {
    echo -e "${BOLD}${BLUE}📊 Interactive Menu${NC}"
    echo "─────────────────────"
    echo "1. 📈 Project Overview"
    echo "2. 🔍 Quality Metrics" 
    echo "3. 📋 Recent Reports"
    echo "4. 📈 Git Statistics"
    echo "5. 📦 Dependencies"
    echo "6. 🔄 Run Quality Check"
    echo "7. 🧹 Clean Reports"
    echo "8. 📊 Full Dashboard"
    echo "9. ❌ Exit"
    echo
    read -p "Select option (1-9): " choice
    
    case $choice in
        1) clear; show_project_overview; show_menu ;;
        2) clear; show_quality_metrics; show_menu ;;
        3) clear; show_recent_reports; show_menu ;;
        4) clear; show_git_stats; show_menu ;;
        5) clear; show_dependency_info; show_menu ;;
        6) clear; echo "Running quality check..."; "$SCRIPT_DIR/quality-check.sh"; echo; show_menu ;;
        7) clear; rm -rf "$REPORTS_DIR"/*; echo "Reports cleaned."; echo; show_menu ;;
        8) clear; show_full_dashboard ;;
        9) echo "Goodbye! 👋"; exit 0 ;;
        *) clear; echo "Invalid option. Please try again."; echo; show_menu ;;
    esac
}

# Show full dashboard
show_full_dashboard() {
    show_project_overview
    show_quality_metrics
    show_recent_reports
    show_git_stats
    show_dependency_info
    
    echo -e "${BOLD}${GREEN}Dashboard last updated: $(date)${NC}"
    echo
    echo "Press Enter to return to menu, or 'q' to quit..."
    read -r input
    
    if [ "$input" = "q" ]; then
        echo "Goodbye! 👋"
        exit 0
    else
        clear
        show_menu
    fi
}

# Main execution
main() {
    # Create reports directory if it doesn't exist
    mkdir -p "$REPORTS_DIR"
    
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}⚠️  jq is not installed. Some features may not work properly.${NC}"
        echo "Install jq: https://stedolan.github.io/jq/"
        echo
    fi
    
    # Check for arguments
    if [ "$1" = "--full" ] || [ "$1" = "-f" ]; then
        show_full_dashboard
    elif [ "$1" = "--overview" ] || [ "$1" = "-o" ]; then
        show_project_overview
    elif [ "$1" = "--quality" ] || [ "$1" = "-q" ]; then
        show_quality_metrics
    else
        show_menu
    fi
}

# Help text
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "LifeBox Quality Dashboard"
    echo
    echo "Interactive dashboard for code quality metrics and project statistics"
    echo
    echo "Usage: $0 [options]"
    echo
    echo "Options:"
    echo "  -h, --help       Show this help message"
    echo "  -f, --full       Show full dashboard"
    echo "  -o, --overview   Show project overview only"
    echo "  -q, --quality    Show quality metrics only"
    echo
    echo "Interactive mode (default) provides a menu-driven interface"
    echo
    exit 0
fi

# Run main function
main "$@"