#!/bin/bash

# LifeBox Database Backup Script
# Creates a backup of the PostgreSQL database with timestamp

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-lifebox_dev}"
DB_USER="${DB_USER:-lifebox}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/lifebox_backup_$TIMESTAMP.sql"

echo -e "${BLUE}🗄️  LifeBox Database Backup${NC}"
echo "============================"
echo

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_step() {
    echo -e "${YELLOW}➡️  $1${NC}"
}

# Backup function
backup_database() {
    print_step "Starting database backup..."
    
    # Check if pg_dump is available
    if ! command -v pg_dump &> /dev/null; then
        print_error "pg_dump is not installed or not in PATH"
        exit 1
    fi
    
    # Perform backup
    print_step "Creating backup: $BACKUP_FILE"
    
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"; then
        print_status "Database backup created successfully"
        
        # Get file size
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        print_status "Backup size: $BACKUP_SIZE"
        
        # Compress backup
        print_step "Compressing backup..."
        if gzip "$BACKUP_FILE"; then
            print_status "Backup compressed: ${BACKUP_FILE}.gz"
            COMPRESSED_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
            print_status "Compressed size: $COMPRESSED_SIZE"
        else
            print_error "Failed to compress backup, but backup file exists"
        fi
        
    else
        print_error "Failed to create database backup"
        exit 1
    fi
}

# Cleanup old backups (keep last 7 days)
cleanup_old_backups() {
    print_step "Cleaning up old backups (keeping last 7 days)..."
    
    if find "$BACKUP_DIR" -name "lifebox_backup_*.sql.gz" -mtime +7 -delete; then
        print_status "Old backups cleaned up"
    else
        echo -e "${YELLOW}⚠️  No old backups to clean${NC}"
    fi
}

# Main execution
main() {
    echo "Configuration:"
    echo "  Host: $DB_HOST:$DB_PORT"
    echo "  Database: $DB_NAME"
    echo "  User: $DB_USER"
    echo "  Backup Directory: $BACKUP_DIR"
    echo
    
    backup_database
    cleanup_old_backups
    
    echo
    print_status "🎉 Database backup completed successfully!"
    echo
    echo "Backup location: ${BACKUP_FILE}.gz"
    echo
    echo "To restore this backup:"
    echo "  gunzip ${BACKUP_FILE}.gz"
    echo "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
}

# Help text
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [options]"
    echo
    echo "Environment variables:"
    echo "  BACKUP_DIR    Directory to store backups (default: ./backups)"
    echo "  DB_HOST       Database host (default: localhost)"
    echo "  DB_PORT       Database port (default: 5432)"
    echo "  DB_NAME       Database name (default: lifebox_dev)"
    echo "  DB_USER       Database user (default: lifebox)"
    echo
    echo "Examples:"
    echo "  $0                                    # Backup with defaults"
    echo "  DB_NAME=lifebox_prod $0              # Backup production database"
    echo "  BACKUP_DIR=/backups $0               # Custom backup directory"
    exit 0
fi

# Run main function
main "$@"