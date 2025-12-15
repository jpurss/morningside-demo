# 🚀 Deployment Guide for Deal Shield

This guide covers deploying Deal Shield to various platforms and environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Production Build](#production-build)
- [Deployment Options](#deployment-options)
  - [VPS (Digital Ocean, Linode, etc.)](#vps-deployment)
  - [Platform-as-a-Service (Railway, Render, Fly.io)](#paas-deployment)
  - [Docker Deployment](#docker-deployment)
- [Post-Deployment](#post-deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

Before deploying, ensure you have:

- ✅ Bun runtime installed on the server
- ✅ Python 3.9+ installed
- ✅ OpenRouter API key
- ✅ Domain name (optional, but recommended)
- ✅ SSL certificate (Let's Encrypt recommended)

---

## Environment Variables

Create a `.env` file in production with the following variables:

```env
# Required
OPENROUTER_API_KEY=your_production_api_key
NODE_ENV=production

# Optional
PORT=8787
VITE_DOCUSEAL_FORM_URL=https://docuseal.com/d/your-form-id

# Security (recommended for production)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Security Best Practices:**
- Never commit `.env` files to version control
- Use different API keys for production and development
- Rotate API keys periodically
- Store secrets in a secure vault (e.g., AWS Secrets Manager, HashiCorp Vault)

---

## Production Build

### 1. Build the Frontend

```bash
bun run build
```

This creates an optimized production bundle in the `dist/` directory:
- Minified JavaScript and CSS
- Optimized assets
- Tree-shaken dependencies
- Source maps (for debugging)

### 2. Verify Build

```bash
# Check build size
du -sh dist/

# Expected output: ~2-5MB

# Test production build locally
bun run start
```

Visit `http://localhost:8787` to verify everything works.

---

## Deployment Options

### VPS Deployment

Deploy on a Virtual Private Server (Digital Ocean, Linode, Vultr, etc.)

#### Step 1: Server Setup

```bash
# SSH into your server
ssh user@your-server-ip

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required software
curl -fsSL https://bun.sh/install | bash
sudo apt install python3 python3-venv python3-pip nginx -y

# Install Node.js (for compatibility)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y
```

#### Step 2: Clone and Setup

```bash
# Create app directory
sudo mkdir -p /var/www/deal-shield
sudo chown $USER:$USER /var/www/deal-shield

# Clone repository
cd /var/www/deal-shield
git clone https://github.com/YOUR_USERNAME/deal-shield.git .

# Install dependencies
bun install

# Setup Python environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r server/python/requirements.txt

# Create .env file
nano .env
# (Add your environment variables)

# Build application
bun run build
```

#### Step 3: Process Manager (PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'deal-shield',
    script: 'bun',
    args: 'run start',
    cwd: '/var/www/deal-shield',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8787
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Setup PM2 to start on boot
pm2 startup
pm2 save
```

#### Step 4: Nginx Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/deal-shield

# Add the following configuration:
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS (after SSL setup)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration (update paths after certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Upload size limit (adjust as needed)
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/deal-shield /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### Step 5: SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured automatically
# Test renewal:
sudo certbot renew --dry-run
```

#### Step 6: Firewall

```bash
# Configure UFW firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

### PaaS Deployment

Deploy on Platform-as-a-Service providers (Railway, Render, Fly.io)

#### Railway

1. **Push to GitHub** (see instructions below)
2. **Connect to Railway:**
   - Visit [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub"
   - Select your `deal-shield` repository
3. **Configure Environment Variables:**
   - Add `OPENROUTER_API_KEY`
   - Add `NODE_ENV=production`
4. **Deploy:**
   - Railway auto-detects Bun and deploys
   - Custom domain: Settings → Domains

#### Render

1. **Create `render.yaml`:**

```yaml
services:
  - type: web
    name: deal-shield
    env: docker
    plan: starter
    buildCommand: bun install && bun run build
    startCommand: bun run start
    envVars:
      - key: NODE_ENV
        value: production
      - key: OPENROUTER_API_KEY
        sync: false
      - key: PORT
        value: 8787
```

2. **Deploy:**
   - Push to GitHub
   - Connect repository on [render.com](https://render.com)
   - Render auto-deploys on push

#### Fly.io

1. **Install Fly CLI:**

```bash
curl -L https://fly.io/install.sh | sh
```

2. **Login and Initialize:**

```bash
fly auth login
fly launch
```

3. **Configure `fly.toml`:**

```toml
app = "deal-shield"
primary_region = "sjc"

[build]
  [build.args]
    NODE_ENV = "production"

[env]
  PORT = "8787"

[http_service]
  internal_port = 8787
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 1024
```

4. **Set Secrets:**

```bash
fly secrets set OPENROUTER_API_KEY=your_key
```

5. **Deploy:**

```bash
fly deploy
```

---

### Docker Deployment

#### Dockerfile

Create a `Dockerfile` in the project root:

```dockerfile
FROM oven/bun:1 AS base

# Install Python
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
COPY server/python/requirements.txt ./server/python/

# Install dependencies
RUN bun install --frozen-lockfile

# Setup Python environment
RUN python3 -m venv .venv && \
    . .venv/bin/activate && \
    pip install -r server/python/requirements.txt

# Copy source code
COPY . .

# Build frontend
RUN bun run build

# Expose port
EXPOSE 8787

# Set environment
ENV NODE_ENV=production

# Start application
CMD ["bun", "run", "start"]
```

#### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  deal-shield:
    build: .
    ports:
      - "8787:8787"
    environment:
      - NODE_ENV=production
      - PORT=8787
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
    volumes:
      - ./dist:/app/dist
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8787"]
      interval: 30s
      timeout: 10s
      retries: 3
```

#### Build and Run

```bash
# Build image
docker build -t deal-shield .

# Run container
docker run -d \
  -p 8787:8787 \
  -e OPENROUTER_API_KEY=your_key \
  -e NODE_ENV=production \
  --name deal-shield \
  deal-shield

# Or use Docker Compose
docker-compose up -d
```

---

## Post-Deployment

### 1. Health Check

```bash
# Check if server is running
curl https://yourdomain.com

# Check API endpoint
curl https://yourdomain.com/api/health
```

### 2. Performance Testing

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Load test
ab -n 1000 -c 10 https://yourdomain.com/
```

### 3. Database (Future)

If you add database support:
- Use managed PostgreSQL (AWS RDS, DigitalOcean Managed DB)
- Set up regular backups
- Enable connection pooling

---

## Monitoring & Maintenance

### Logging

**PM2 Logs:**
```bash
# View logs
pm2 logs deal-shield

# Monitor in real-time
pm2 monit
```

**Nginx Logs:**
```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### Monitoring Tools

**Free Options:**
- [UptimeRobot](https://uptimerobot.com) - Uptime monitoring
- [Sentry](https://sentry.io) - Error tracking
- [LogTail](https://logtail.com) - Log aggregation

**Self-Hosted:**
- [Grafana](https://grafana.com) + [Prometheus](https://prometheus.io)
- [Netdata](https://www.netdata.cloud)

### Backup Strategy

```bash
# Backup script (save as backup.sh)
#!/bin/bash
BACKUP_DIR="/backups/deal-shield"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup application
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /var/www/deal-shield

# Backup .env
cp /var/www/deal-shield/.env $BACKUP_DIR/env_$DATE

# Keep only last 7 backups
find $BACKUP_DIR -type f -mtime +7 -delete
```

### Update Procedure

```bash
# Navigate to app directory
cd /var/www/deal-shield

# Pull latest changes
git pull origin main

# Install dependencies
bun install

# Rebuild
bun run build

# Restart PM2
pm2 restart deal-shield

# Check status
pm2 status
```

---

## Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Find process using port 8787
sudo lsof -i :8787

# Kill process
sudo kill -9 <PID>
```

**2. Permission Errors**
```bash
# Fix ownership
sudo chown -R $USER:$USER /var/www/deal-shield
```

**3. Python Module Not Found**
```bash
# Activate venv
source .venv/bin/activate

# Reinstall requirements
pip install -r server/python/requirements.txt
```

**4. Nginx 502 Bad Gateway**
```bash
# Check if app is running
pm2 status

# Check logs
pm2 logs deal-shield
sudo tail -f /var/log/nginx/error.log
```

---

## Security Checklist

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Environment variables stored securely
- [ ] Firewall configured (only ports 80, 443, SSH open)
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`
- [ ] Nginx security headers configured
- [ ] Rate limiting enabled (optional)
- [ ] DDoS protection (Cloudflare recommended)
- [ ] Regular backups scheduled
- [ ] Monitoring and alerting configured

---

## Support

For deployment issues, please open an issue on GitHub or contact the Morningside AI team.

---

**Happy Deploying! 🚀**

