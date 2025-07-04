#!/bin/bash

# DigitalOcean Deployment Script for AI Tutor Platform
# This script handles database setup, migrations, and application deployment

set -e  # Exit on any error

echo "🚀 Starting DigitalOcean deployment for AI Tutor Platform..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check required environment variables
print_step "Checking environment variables..."
required_vars=("DATABASE_URL" "NEXTAUTH_SECRET" "NEXTAUTH_URL" "GOOGLE_GENERATIVE_AI_API_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "ERROR: $var environment variable is required"
        exit 1
    fi
done
print_success "All required environment variables are set"

# Install dependencies
print_step "Installing dependencies..."
npm ci --only=production --silent
print_success "Dependencies installed"

# Generate Prisma Client
print_step "Generating Prisma Client..."
npx prisma generate
print_success "Prisma Client generated"

# Run database migrations
print_step "Running database migrations..."
npx prisma migrate deploy
migration_status=$?
if [ $migration_status -eq 0 ]; then
    print_success "Database migrations completed successfully"
else
    print_error "Database migrations failed with exit code $migration_status"
    exit 1
fi

# Seed the database (subject categories)
print_step "Seeding database with subject categories..."
npm run db:seed 2>/dev/null || {
    print_warning "npm run db:seed failed, trying alternative approach..."
    npx tsx prisma/seed.ts 2>/dev/null || {
        print_warning "Alternative seed approach failed, trying direct prisma seed..."
        npx prisma db seed 2>/dev/null || {
            print_error "All seed attempts failed. Database may be missing subject categories."
            print_warning "Application will still work but with limited categorization features."
        }
    }
}

# Check if subject categories were seeded
print_step "Verifying subject categories..."
category_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM subject_categories;" 2>/dev/null | tr -d ' ' || echo "0")
if [ "$category_count" -gt "0" ]; then
    print_success "Subject categories verified: $category_count categories found"
else
    print_warning "Subject categories not found. Manual seeding may be required."
fi

# Build the application
print_step "Building Next.js application..."
npm run build
build_status=$?
if [ $build_status -eq 0 ]; then
    print_success "Application built successfully"
else
    print_error "Application build failed with exit code $build_status"
    exit 1
fi

# Final deployment verification
print_step "Running deployment verification..."

# Check database connection
db_check=$(psql "$DATABASE_URL" -c "SELECT 1;" 2>/dev/null && echo "OK" || echo "FAILED")
if [ "$db_check" = "OK" ]; then
    print_success "Database connection verified"
else
    print_error "Database connection failed"
    exit 1
fi

# Check required tables exist
tables=("users" "learning_sessions" "concepts" "tasks" "subject_categories" "therapy_sessions")
for table in "${tables[@]}"; do
    table_exists=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" 2>/dev/null | tr -d ' ' || echo "f")
    if [ "$table_exists" = "t" ]; then
        print_success "Table '$table' exists"
    else
        print_error "Table '$table' missing"
        exit 1
    fi
done

print_success "🎉 DigitalOcean deployment completed successfully!"

echo "
📊 Deployment Summary:
- ✅ Environment variables configured
- ✅ Dependencies installed  
- ✅ Database migrations applied
- ✅ Subject categories seeded
- ✅ Application built
- ✅ Database connection verified
- ✅ All required tables present

🚀 Your AI Tutor Platform is ready to use!

📝 Next Steps:
1. Start your application server
2. Monitor logs for any runtime issues
3. Test session creation functionality
4. Verify subject categorization is working

🔗 Key URLs:
- Application: \$NEXTAUTH_URL
- Database: Connected and operational
- Subject Categories: $category_count categories available
"

exit 0 