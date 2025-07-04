# DigitalOcean Deployment Guide

## 🚨 **Quick Fix for Current Issue**

Your session creation error is caused by missing subject categories in the DigitalOcean database. Here's how to fix it:

### **Option 1: Run Deployment Script (Recommended)**

1. **SSH into your DigitalOcean server**:
   ```bash
   ssh your-server
   cd /path/to/your/aitutor/project
   ```

2. **Run the deployment script**:
   ```bash
   ./scripts/deploy-digitalocean.sh
   ```

### **Option 2: Manual Database Seeding**

If the script doesn't work, manually seed the database:

```bash
# Connect to your project directory
cd /path/to/your/aitutor/project

# Run database seed
npm run db:seed

# Or alternatively:
npx tsx prisma/seed.ts
```

### **Option 3: Direct Database Insert**

If seeding fails, manually insert the categories:

```bash
# Connect to your PostgreSQL database
psql "$DATABASE_URL"

# Insert the categories (this creates all 50 categories)
\i /path/to/manual-categories.sql
```

---

## 🚀 **Complete DigitalOcean Deployment**

### **Prerequisites**

- DigitalOcean Droplet (Ubuntu 20.04+ recommended)
- Node.js 18+ installed
- PostgreSQL database (DigitalOcean Managed Database recommended)
- Domain name (optional)

### **Environment Variables**

Set these on your DigitalOcean server:

```bash
export DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
export NEXTAUTH_SECRET="your-super-secret-key-here"
export NEXTAUTH_URL="https://your-domain.com"
export GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key"
```

### **Step-by-Step Deployment**

#### **1. Clone and Setup Project**
```bash
# Clone your repository
git clone https://github.com/your-username/your-repo.git
cd aitutor

# Install dependencies
npm ci --only=production
```

#### **2. Run Deployment Script**
```bash
# Make script executable
chmod +x scripts/deploy-digitalocean.sh

# Run deployment
./scripts/deploy-digitalocean.sh
```

#### **3. Start Application**
```bash
# Option A: Direct start
npm start

# Option B: With PM2 (recommended for production)
npm install -g pm2
pm2 start npm --name "aitutor" -- start
pm2 save
pm2 startup
```

#### **4. Setup Nginx (Optional)**
```bash
# Install Nginx
sudo apt update
sudo apt install nginx

# Create site configuration
sudo nano /etc/nginx/sites-available/aitutor

# Add this configuration:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/aitutor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔧 **Troubleshooting**

### **Session Creation Errors**

**Error**: `Foreign key constraint violated on the constraint: learning_sessions_subjectCategoryId_fkey`

**Cause**: Missing subject categories in database

**Solution**: 
1. Run the deployment script: `./scripts/deploy-digitalocean.sh`
2. Or manually seed: `npm run db:seed`

### **Database Connection Issues**

**Error**: `Can't reach database server`

**Solutions**:
1. Check `DATABASE_URL` is correct
2. Verify database server is running
3. Check firewall settings allow connections
4. Ensure SSL mode is set correctly

### **Build Failures**

**Error**: `Module not found` or compilation errors

**Solutions**:
1. Clear node_modules: `rm -rf node_modules && npm ci`
2. Clear Next.js cache: `rm -rf .next`
3. Regenerate Prisma client: `npx prisma generate`

### **Environment Variable Issues**

**Error**: `Missing required environment variable`

**Solutions**:
1. Check all required variables are set: `env | grep -E "(DATABASE_URL|NEXTAUTH|GOOGLE)"`
2. Add to your shell profile: `~/.bashrc` or `~/.zshrc`
3. Use a `.env` file in production (not recommended for secrets)

---

## 📊 **Verification Steps**

After deployment, verify everything works:

### **1. Database Check**
```bash
# Connect to database
psql "$DATABASE_URL"

# Check tables exist
\dt

# Check subject categories
SELECT COUNT(*) FROM subject_categories;
# Should return 50

# Check sample data
SELECT name FROM subject_categories LIMIT 5;
```

### **2. Application Check**
```bash
# Test application is running
curl http://localhost:3000

# Check logs for errors
pm2 logs aitutor  # if using PM2
# or
journalctl -f  # if using systemd
```

### **3. Feature Testing**
1. **Visit your application**: `https://your-domain.com`
2. **Sign up** for a new account
3. **Create learning session** - should work without foreign key errors
4. **Test tutor functionality** - AI should respond properly
5. **Check library** - should show categorized concepts

---

## 🚨 **Emergency Recovery**

If deployment fails completely:

### **Reset Database**
```bash
# Reset database to clean state
npx prisma migrate reset --force

# Rerun migrations
npx prisma migrate deploy

# Reseed categories
npm run db:seed
```

### **Rollback Code**
```bash
# Revert to last working commit
git log --oneline -10  # find last working commit
git reset --hard <commit-hash>

# Rebuild
npm ci
npm run build
```

---

## 📝 **Production Checklist**

- [ ] All environment variables set correctly
- [ ] Database migrations applied
- [ ] Subject categories seeded (50 categories)
- [ ] Application builds successfully
- [ ] SSL certificate configured (Let's Encrypt)
- [ ] Nginx configured and running
- [ ] PM2 or systemd service configured
- [ ] Firewall configured (ports 80, 443, 22)
- [ ] Backup strategy implemented
- [ ] Monitoring setup (optional)

---

## 🔗 **Useful Commands**

```bash
# Check deployment script status
./scripts/deploy-digitalocean.sh --dry-run

# Manual database operations
npx prisma migrate deploy     # Apply migrations
npx prisma generate          # Generate client
npm run db:seed              # Seed categories
npx prisma studio            # Open database GUI

# Application management
pm2 restart aitutor         # Restart app
pm2 logs aitutor           # View logs
pm2 status                 # Check status

# System monitoring
htop                       # System resources
netstat -tlnp | grep 3000  # Check port usage
journalctl -f              # System logs
```

---

## 🆘 **Support**

If you encounter issues:

1. **Check logs**: Application, Nginx, and system logs
2. **Verify environment**: All required variables set
3. **Test database**: Connection and data integrity
4. **Run verification**: Use deployment script verification steps

**Common Issue**: Session creation fails → Run `npm run db:seed`
**Quick Fix**: `./scripts/deploy-digitalocean.sh` handles everything automatically

---

**Status**: ✅ **Ready for production deployment!** 