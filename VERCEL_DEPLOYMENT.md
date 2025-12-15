# 🚀 Vercel Deployment Guide - Morningside Demo

## ✅ Deployment Status: LIVE!

Your Morningside Demo frontend is successfully deployed to Vercel!

---

## 🔗 Live URLs

- **Vercel URL:** https://deal-shield-295q7j3a8-josiah-purss-projects.vercel.app
- **Custom Domain:** morningside-demo.space (⚠️ DNS configuration required)
- **GitHub Repo:** https://github.com/jpurss/morningside-demo
- **Vercel Dashboard:** https://vercel.com/josiah-purss-projects/deal-shield

---

## 🌐 Configure Your Custom Domain on GoDaddy

To make your site accessible at `morningside-demo.space`, you need to update DNS records on GoDaddy:

### Step 1: Login to GoDaddy

1. Go to [godaddy.com](https://www.godaddy.com)
2. Login to your account
3. Go to **My Products** → **Domains**
4. Click on `morningside-demo.space` → **DNS**

### Step 2: Add DNS Records

Add/Update these DNS records:

#### Primary Domain (morningside-demo.space)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `76.76.21.21` | 600 |

#### WWW Subdomain (www.morningside-demo.space)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | www | cname.vercel-dns.com | 600 |

### Step 3: Wait for DNS Propagation

- DNS changes can take 1-48 hours to propagate (usually within 15-30 minutes)
- Check status: Run `dig morningside-demo.space` in terminal
- Vercel will automatically issue an SSL certificate once DNS is verified

### Step 4: Verify in Vercel

```bash
# Check domain status
vercel domains ls
```

Once DNS is configured, Vercel will automatically:
- ✅ Verify domain ownership
- ✅ Issue SSL certificate (HTTPS)
- ✅ Send you a confirmation email

---

## ⚠️ Important: Backend API Limitation

**Your app uses a Bun + Hono backend, which Vercel doesn't support.**

### What's Deployed:
- ✅ **Frontend** - Full React UI (all pages, components, styling)
- ❌ **Backend API** - NOT deployed (requires Bun runtime)

### What This Means:
- The UI will load perfectly
- Features requiring API calls will not work:
  - Data Audit tool
  - Scope Guard analysis
  - Executive Dashboard data

### Solution: Deploy Backend Separately

Choose one of these Bun-compatible platforms for your backend:

#### Option 1: Railway (Recommended - Easiest)
```bash
# Install Railway CLI
npm install -g railway

# Login and deploy
railway login
railway init
railway up

# Link your custom domain in Railway dashboard
```

**Railway Setup:**
1. Visit [railway.app](https://railway.app)
2. Connect your GitHub repo
3. Select `morningside-demo`
4. Railway auto-detects Bun
5. Add domain: `api.morningside-demo.space`
6. Add environment variable: `OPENROUTER_API_KEY`

#### Option 2: Fly.io (More Control)
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login and launch
fly auth login
fly launch

# Deploy
fly deploy
```

#### Option 3: Render (Simple)
1. Visit [render.com](https://render.com)
2. New Web Service → Connect GitHub
3. Select `morningside-demo`
4. Build Command: `bun install`
5. Start Command: `bun run start`
6. Add custom domain

### Update Frontend to Use Separate API

Once your backend is deployed, update the frontend:

1. Create `.env.production`:
   ```env
   VITE_API_URL=https://api.morningside-demo.space
   ```

2. Update API calls in your code to use `import.meta.env.VITE_API_URL`

3. Redeploy to Vercel:
   ```bash
   vercel --prod
   ```

---

## 📊 Current Deployment Configuration

### vercel.json
```json
{
  "buildCommand": "bun install && bun run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "installCommand": "bun install",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Build Settings
- **Framework:** Vite
- **Build Command:** `bun install && bun run build`
- **Output Directory:** `dist`
- **Install Command:** `bun install`

---

## 🔄 Redeploying

### Automatic Deployments
Vercel is connected to your GitHub repo. Every push to `main` automatically deploys:

```bash
# Make changes
git add .
git commit -m "your changes"
git push origin main

# Vercel automatically builds and deploys
```

### Manual Deployments
```bash
# Deploy to production
vercel --prod

# Deploy to preview (staging)
vercel
```

---

## 🛠️ Useful Commands

```bash
# View deployment logs
vercel logs https://deal-shield-295q7j3a8-josiah-purss-projects.vercel.app

# List all deployments
vercel list

# Check domain status
vercel domains ls

# Remove a domain
vercel domains rm morningside-demo.space

# Inspect a deployment
vercel inspect deal-shield-295q7j3a8-josiah-purss-projects.vercel.app

# Open Vercel dashboard
vercel open
```

---

## 🔐 Environment Variables

Add environment variables in Vercel dashboard:

1. Go to [Vercel Dashboard](https://vercel.com/josiah-purss-projects/deal-shield)
2. Settings → Environment Variables
3. Add:
   - `VITE_API_URL` (once backend is deployed)
   - `VITE_DOCUSEAL_FORM_URL` (optional)

Or via CLI:
```bash
# Add environment variable
vercel env add VITE_API_URL production

# List all environment variables
vercel env ls
```

---

## 📈 Monitoring & Analytics

### Vercel Analytics (Optional)
Enable analytics to track:
- Page views
- Performance metrics
- User demographics

```bash
# Install Vercel Analytics
npm install @vercel/analytics

# Add to your app (src/main.tsx)
import { Analytics } from '@vercel/analytics/react';

<Analytics />
```

### Deployment History
View all deployments: https://vercel.com/josiah-purss-projects/deal-shield/deployments

---

## 🐛 Troubleshooting

### Domain Not Working
```bash
# Check DNS propagation
dig morningside-demo.space

# Should show:
# morningside-demo.space. 600 IN A 76.76.21.21
```

### Build Failures
```bash
# View build logs
vercel logs <deployment-url> --build

# Common fixes:
# 1. Clear Vercel cache: Settings → Clear Cache
# 2. Check environment variables
# 3. Verify build locally: bun run build
```

### CORS Issues (when backend is separate)
Add CORS headers in your backend (server/app.ts):
```typescript
import { cors } from 'hono/cors'

app.use('/*', cors({
  origin: ['https://morningside-demo.space', 'https://deal-shield-*.vercel.app'],
  credentials: true,
}))
```

---

## 📚 Resources

- **Vercel Documentation:** https://vercel.com/docs
- **Deploy from CLI:** https://vercel.com/docs/cli/deploy
- **Custom Domains:** https://vercel.com/docs/projects/domains
- **Environment Variables:** https://vercel.com/docs/projects/environment-variables
- **Vercel Status:** https://www.vercel-status.com

---

## ✅ Next Steps

1. **Configure DNS on GoDaddy** (see instructions above)
2. **Deploy backend to Railway/Fly.io** (see backend deployment options)
3. **Update frontend with API URL** (environment variable)
4. **Test full functionality** once both are live
5. **Monitor deployments** via Vercel dashboard

---

## 🎉 Summary

Your Morningside Demo is deployed! Here's what's live:

- ✅ Frontend UI deployed to Vercel
- ✅ Custom domain configured (DNS setup needed)
- ✅ GitHub integration active (auto-deploys on push)
- ✅ SSL certificate will auto-provision after DNS
- ⏳ Backend API needs separate deployment

**Current Status:** Frontend deployed, awaiting DNS configuration and backend deployment.

---

For questions or issues, check the [Vercel Documentation](https://vercel.com/docs) or [Knowledge Base](https://vercel.com/knowledge).

**Deployed with ❤️ by the Morningside AI team**

