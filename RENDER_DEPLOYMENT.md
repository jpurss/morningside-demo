# 🚀 Render Full-Stack Deployment Guide

## ✅ Configuration Complete!

Your project is now configured for Render with:
- ✅ `Dockerfile` - Full-stack Docker container
- ✅ `render.yaml` - Infrastructure as code
- ✅ Committed and pushed to GitHub

---

## 🎯 Deploy to Render (2 Methods)

### Method 1: Via Render Dashboard (Recommended - Easiest)

#### Step 1: Create New Web Service

1. **Go to [dashboard.render.com](https://dashboard.render.com)**
2. Click **"New +"** button in top right
3. Select **"Web Service"**

#### Step 2: Connect GitHub Repository

1. Click **"Connect GitHub"** (if not already connected)
2. Authorize Render to access your repositories
3. Find and select: **`morningside-demo`**
4. Click **"Connect"**

#### Step 3: Configure Service

Render should auto-detect the `render.yaml` configuration. Verify these settings:

**Basic Settings:**
```
Name: morningside-demo
Region: Oregon (or closest to you)
Branch: main
Runtime: Docker
```

**Build Settings:**
```
Dockerfile Path: ./Dockerfile
Docker Build Context Directory: .
```

**Instance Type:**
```
Plan: Starter ($7/month) or Free (with limitations)
```

#### Step 4: Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `8787` |
| `OPENROUTER_API_KEY` | `your_actual_api_key_here` |
| `VITE_DOCUSEAL_FORM_URL` | `your_docuseal_url` (optional) |

**Important:** Don't add `OPENROUTER_API_KEY` in `render.yaml` - always add it via dashboard for security!

#### Step 5: Deploy!

1. Click **"Create Web Service"**
2. Render will:
   - Clone your repository
   - Build the Docker container
   - Install Bun, Python, and all dependencies
   - Build your frontend
   - Start your backend server

**First deployment takes ~5-10 minutes** (subsequent deploys are faster)

#### Step 6: Monitor Deployment

Watch the logs in real-time:
- Look for "Build successful"
- Look for "Your service is live 🎉"
- You'll get a URL like: `https://morningside-demo.onrender.com`

---

### Method 2: Using render.yaml Blueprint (Alternative)

If you already have the GitHub connected:

1. Go to **[dashboard.render.com](https://dashboard.render.com)**
2. Click **"New +"** → **"Blueprint"**
3. Select your **morningside-demo** repository
4. Render will read `render.yaml` and create the service automatically
5. Add environment variables in the dashboard after creation

---

## 🌐 Add Custom Domain

Once your service is deployed:

### Step 1: Add Domain in Render

1. Go to your service in Render Dashboard
2. Click **"Settings"** tab
3. Scroll to **"Custom Domain"** section
4. Click **"Add Custom Domain"**
5. Enter: `morningside-demo.space`
6. Click **"Save"**

Render will show you DNS instructions like:

```
Add this CNAME record to your DNS:
morningside-demo.space → <your-service>.onrender.com
```

### Step 2: Configure DNS on GoDaddy

1. **Login to [godaddy.com](https://www.godaddy.com)**
2. Go to: **My Products** → **Domains** → **morningside-demo.space** → **DNS**
3. **Add/Update these records:**

#### For Root Domain (morningside-demo.space)

**Option A: CNAME (Recommended by Render)**
| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | @ | `morningside-demo.onrender.com` | 600 |

**Option B: A Record (if GoDaddy doesn't allow CNAME for @)**
Render will provide specific IP addresses in the dashboard. Use those.

#### For WWW Subdomain

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | www | `morningside-demo.onrender.com` | 600 |

### Step 3: SSL Certificate (Automatic)

Once DNS propagates (15-30 minutes):
- ✅ Render automatically provisions SSL certificate
- ✅ HTTPS will be enabled
- ✅ You'll receive confirmation email
- ✅ Site accessible at `https://morningside-demo.space`

---

## 🔄 Auto-Deployments

Render is now connected to your GitHub repo!

**Every push to `main` branch automatically:**
1. Triggers a new build
2. Runs tests (if configured)
3. Builds Docker container
4. Deploys new version
5. Zero-downtime rollout

```bash
# Make changes
git add .
git commit -m "Update features"
git push origin main

# Render automatically deploys!
```

---

## 📊 Monitor Your Service

### Render Dashboard Features

- **Logs:** Real-time application logs
- **Metrics:** CPU, Memory, Network usage
- **Events:** Deployment history
- **Shell:** Access to container shell
- **Scaling:** Upgrade instance type

### Health Check

Your app has a health endpoint configured:
```
GET https://morningside-demo.space/api/health
```

Render pings this every 30 seconds to ensure your app is healthy.

---

## 🛠️ Useful Commands

### View Logs
```bash
# Via CLI (if working)
render logs -s morningside-demo

# Or via Dashboard: Service → Logs tab
```

### Manually Trigger Deploy
```bash
# Via CLI
render deploy -s morningside-demo

# Or via Dashboard: Service → Manual Deploy button
```

### Access Shell
```bash
# Via CLI
render shell -s morningside-demo

# Or via Dashboard: Service → Shell tab
```

---

## 🔐 Environment Variables Management

### Add New Variable
1. Dashboard → Service → Environment
2. Click "Add Environment Variable"
3. Enter key and value
4. Save (triggers automatic redeploy)

### Update Existing Variable
1. Dashboard → Service → Environment
2. Click pencil icon next to variable
3. Update value
4. Save (triggers automatic redeploy)

### Sensitive Variables
- Never commit API keys to GitHub
- Always add via Render Dashboard
- Mark as "Secret" so values are hidden in logs

---

## 💰 Pricing

### Free Tier
- ✅ 750 hours/month free
- ⚠️ Spins down after 15 min inactivity
- ⚠️ Cold start: 30-60 seconds to wake up
- Good for: Testing, demos, low-traffic apps

### Starter Plan ($7/month)
- ✅ Always running (no spin down)
- ✅ 0.5 GB RAM, 0.5 CPU
- ✅ 100 GB bandwidth/month
- ✅ Custom domains with SSL
- Good for: Production apps with moderate traffic

### Standard Plan ($25/month+)
- ✅ More resources (2 GB RAM, 1 CPU)
- ✅ Multiple instances for HA
- ✅ Better performance
- Good for: High-traffic production apps

---

## 🐛 Troubleshooting

### Build Failures

**Check build logs in Dashboard:**
1. Service → Events tab
2. Click failed deployment
3. Check "Build" logs

**Common issues:**
- Missing environment variables
- Dependencies not installing
- Out of memory during build

**Solutions:**
```bash
# Test build locally first
docker build -t morningside-demo .
docker run -p 8787:8787 -e OPENROUTER_API_KEY=test morningside-demo
```

### Runtime Errors

**Check application logs:**
1. Service → Logs tab
2. Look for error messages

**Common issues:**
- Missing `OPENROUTER_API_KEY`
- Python environment not activated
- Port mismatch (must be 8787)

### Slow Performance (Free Tier)

Free tier spins down after 15 min. Solutions:
1. Upgrade to Starter plan ($7/mo)
2. Use cron job to ping every 14 minutes
3. Accept cold starts for low-traffic demo

### Domain Not Working

**Check DNS propagation:**
```bash
dig morningside-demo.space
nslookup morningside-demo.space
```

**Wait time:** 15 mins - 48 hours (usually 30 mins)

**Verify in Render:**
Dashboard → Settings → Custom Domain (should show "Verified ✓")

---

## 🔄 Rollback to Previous Version

If a deployment breaks something:

1. **Via Dashboard:**
   - Service → Events
   - Find working deployment
   - Click "Redeploy"

2. **Via Git:**
   ```bash
   git revert HEAD
   git push origin main
   # Automatic redeploy with previous code
   ```

---

## 📈 Scaling

### Vertical Scaling (More Power)
1. Dashboard → Settings → Instance Type
2. Select larger plan
3. Save (triggers redeploy)

### Horizontal Scaling (More Instances)
Available on Standard+ plans:
1. Dashboard → Settings → Scaling
2. Set number of instances
3. Render load balances automatically

---

## 🎯 Complete Deployment Checklist

- [ ] GitHub repository connected to Render
- [ ] `Dockerfile` and `render.yaml` in repo
- [ ] Web Service created in Render Dashboard
- [ ] Environment variables configured:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=8787`
  - [ ] `OPENROUTER_API_KEY` (your actual key)
- [ ] First deployment completed successfully
- [ ] Service URL works: `https://morningside-demo.onrender.com`
- [ ] Health check passing: `/api/health`
- [ ] Custom domain added in Render
- [ ] DNS configured on GoDaddy
- [ ] SSL certificate provisioned
- [ ] Custom domain works: `https://morningside-demo.space`
- [ ] All features tested (Data Audit, Scope Guard, Dashboard)

---

## 📚 Resources

- **Render Docs:** https://render.com/docs
- **Render Status:** https://status.render.com
- **Support:** https://render.com/support
- **Community:** https://community.render.com

---

## ✅ What You Get

After deployment, your **complete Morningside Demo** will be live with:

- ✅ **Full React Frontend** - All UI pages and components
- ✅ **Bun Backend API** - Data audit, Scope Guard, all endpoints
- ✅ **Python CSV Processing** - Pandas analysis
- ✅ **Auto-deployments** - Every push to GitHub
- ✅ **Custom Domain** - Your own domain with SSL
- ✅ **One Platform** - Everything on Render (no split setup)
- ✅ **Zero CORS Issues** - Frontend and backend on same origin

---

## 🎉 Next Steps

1. **Create Web Service** in Render Dashboard (see Step 1 above)
2. **Add Environment Variables** (especially `OPENROUTER_API_KEY`)
3. **Wait for First Deploy** (~5-10 minutes)
4. **Test Your App** at the `.onrender.com` URL
5. **Add Custom Domain** and configure DNS
6. **Share Your Live App!**

---

**Questions?** Check the [Render Documentation](https://render.com/docs) or the logs in your dashboard!

**Deployed with ❤️ by the Morningside AI team**

