# Database Migration Guide

## ⚠️ CRITICAL DATABASE OPERATIONS GUIDE

### **Environment Setup**
```bash
# ALWAYS set this environment variable first
export DATABASE_URL="postgresql://lifebox_user:SecureDbPass2024!@localhost:5432/lifebox_development?schema=public"
```

### **Database Commands (CORRECT WAY)**

#### **1. Schema Changes (New Models/Fields)**
```bash
# Change directory to database workspace
cd libs/database

# Push schema changes to database (creates tables/columns)
npx prisma db push

# Generate TypeScript client
npx prisma generate
```

#### **2. Proper Migration (Production)**
```bash
cd libs/database
export DATABASE_URL="postgresql://lifebox_user:SecureDbPass2024!@localhost:5432/lifebox_development?schema=public"

# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy
```

#### **3. Reset Database (Development Only)**
```bash
cd libs/database
export DATABASE_URL="postgresql://lifebox_user:SecureDbPass2024!@localhost:5432/lifebox_development?schema=public"

# Complete reset (DANGER: deletes all data)
npx prisma migrate reset --force
```

### **Common Errors and Solutions**

#### **Error: "Environment variable not found: DATABASE_URL"**
**Solution**: Always export DATABASE_URL before any prisma command
```bash
export DATABASE_URL="postgresql://lifebox_user:SecureDbPass2024!@localhost:5432/lifebox_development?schema=public"
```

#### **Error: "file or directory not found"**
**Solution**: Always run from `libs/database` directory
```bash
cd libs/database
# Then run prisma commands
```

#### **Error: "User denied access"**
**Solution**: Check DATABASE_URL credentials match .env file
```bash
# Check .env file for correct credentials:
# DB_USERNAME=lifebox_user
# DB_PASSWORD=SecureDbPass2024!
# DB_DATABASE=lifebox_development
```

### **Database Validation**
```bash
# Check database connection
cd libs/database
export DATABASE_URL="postgresql://lifebox_user:SecureDbPass2024!@localhost:5432/lifebox_development?schema=public"
npx prisma db pull

# Verify tables exist
npx prisma studio

# Check specific table
psql "postgresql://lifebox_user:SecureDbPass2024!@localhost:5432/lifebox_development" -c "\dt table_name"
```

### **✅ SUCCESSFUL PROCESS (VERIFIED)**
```bash
# 1. Change to database directory
cd libs/database

# 2. Set environment variable
export DATABASE_URL="postgresql://lifebox_user:SecureDbPass2024!@localhost:5432/lifebox_development?schema=public"

# 3. Push schema changes
npx prisma db push

# 4. Generate client (automatic)
# npx prisma generate (runs automatically after db push)

# 5. Verify table creation
psql "postgresql://lifebox_user:SecureDbPass2024!@localhost:5432/lifebox_development" -c "\dt template_permissions"
```

**Result**: ✅ `template_permissions` table created successfully!

### **⛔ NEVER DO THESE**
- ❌ Run prisma commands from root directory
- ❌ Forget to export DATABASE_URL
- ❌ Use wrong schema path
- ❌ Run migrations without proper environment setup

### **✅ ALWAYS DO THESE**
- ✅ cd libs/database first
- ✅ export DATABASE_URL first
- ✅ Check .env file for correct credentials
- ✅ Run npx prisma generate after schema changes
- ✅ Test with npx prisma studio to verify tables

### **Workspace Commands (Alternative)**
```bash
# From project root
export DATABASE_URL="postgresql://lifebox_user:SecureDbPass2024!@localhost:5432/lifebox_development?schema=public"
npm run migrate:dev --workspace=@lifebox/database
npm run generate --workspace=@lifebox/database
```

### **Docker Database (If Running)**
```bash
# Check if database container is running
docker ps | grep postgres

# Start database container
docker-compose -f infrastructure/docker/docker-compose.yml up -d postgres

# Access database directly
docker exec -it lifebox-postgres psql -U lifebox_user -d lifebox_development
```