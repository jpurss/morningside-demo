# 📦 GitHub Repository Setup

This guide will help you push Deal Shield to GitHub and set up the repository.

## Step 1: Create GitHub Repository

### Option A: Using GitHub Web Interface

1. **Go to GitHub:** Visit [github.com/new](https://github.com/new)
2. **Repository Details:**
   - **Name:** `deal-shield`
   - **Description:** `A comprehensive consultant operations platform for Morningside AI - featuring intelligent data auditing, scope management, and executive planning tools`
   - **Visibility:** Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
3. **Click "Create repository"**

### Option B: Using GitHub CLI

```bash
# Install GitHub CLI if not already installed
# macOS:
brew install gh

# Login to GitHub
gh auth login

# Create repository
gh repo create deal-shield \
  --public \
  --description "A comprehensive consultant operations platform for Morningside AI" \
  --source=. \
  --remote=origin

# Push code
git push -u origin main
```

---

## Step 2: Manual Git Setup (If Using Web Interface)

After creating the repository on GitHub, run these commands in your project directory:

```bash
# Navigate to project directory
cd /Users/jpurss/Documents/1.Projects/Morningside/deal-shield

# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/deal-shield.git

# Verify remote
git remote -v

# Push to GitHub
git push -u origin main
```

---

## Step 3: Repository Configuration

### Configure Repository Settings

1. **Go to Repository Settings:** `https://github.com/YOUR_USERNAME/deal-shield/settings`

2. **General Settings:**
   - ✅ Enable **Issues** for bug tracking
   - ✅ Enable **Discussions** for community discussions
   - ✅ Enable **Wiki** for extended documentation (optional)

3. **Branch Protection Rules:**
   - Navigate to: Settings → Branches → Add rule
   - Branch name pattern: `main`
   - Enable:
     - ✅ Require pull request reviews before merging
     - ✅ Require status checks to pass before merging
     - ✅ Require branches to be up to date before merging
     - ✅ Include administrators

4. **Security & Analysis:**
   - Settings → Security & analysis
   - Enable:
     - ✅ Dependency graph
     - ✅ Dependabot alerts
     - ✅ Dependabot security updates

---

## Step 4: Add Repository Secrets

For GitHub Actions (CI/CD), add secrets:

1. **Go to:** Settings → Secrets and variables → Actions
2. **Click "New repository secret"**
3. **Add:**
   - Name: `OPENROUTER_API_KEY`
   - Value: `your_openrouter_api_key`

---

## Step 5: Create GitHub Actions Workflow (Optional)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Run linter
        run: bun run lint
      
      - name: Build project
        run: bun run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/
```

Commit and push:

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow"
git push
```

---

## Step 6: Add Repository Topics

1. **Go to:** Repository main page
2. **Click the gear icon** next to "About"
3. **Add topics:**
   - `react`
   - `typescript`
   - `bun`
   - `tailwindcss`
   - `consulting`
   - `data-audit`
   - `ai`
   - `llm`
   - `morningside-ai`

---

## Step 7: Create Repository Social Image

1. **Go to:** Settings → Options
2. **Scroll to "Social preview"**
3. **Upload image:** Create or upload a 1280x640px preview image
4. Alternatively, use [GitHub Social Card Generator](https://github.com/marketplace/actions/github-social-image-generator)

---

## Step 8: Add Issue Templates

Create `.github/ISSUE_TEMPLATE/bug_report.md`:

```markdown
---
name: Bug Report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

## Bug Description
A clear description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Upload '...'
4. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- OS: [e.g., macOS 14.2]
- Bun version: [e.g., 1.0.20]
- Python version: [e.g., 3.11.5]
- Browser: [e.g., Chrome 120]

## Screenshots
If applicable, add screenshots.

## Additional Context
Any other context about the problem.
```

Create `.github/ISSUE_TEMPLATE/feature_request.md`:

```markdown
---
name: Feature Request
about: Suggest an idea for this project
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## Problem / Use Case
Describe the problem or use case this feature would address.

## Proposed Solution
Describe your proposed solution.

## Alternatives Considered
Describe alternative solutions or features you've considered.

## Additional Context
Add any other context or screenshots about the feature request.
```

---

## Step 9: Add Pull Request Template

Create `.github/pull_request_template.md`:

```markdown
## Description
<!-- Describe your changes in detail -->

## Motivation and Context
<!-- Why is this change required? What problem does it solve? -->
<!-- If it fixes an open issue, please link to the issue here. -->

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Code refactoring

## How Has This Been Tested?
<!-- Describe the tests you ran to verify your changes -->
- [ ] Tested locally
- [ ] Tested with demo files
- [ ] Tested on different browsers
- [ ] Tested responsive design

## Screenshots (if applicable)
<!-- Add screenshots to demonstrate the changes -->

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings or errors
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

---

## Step 10: Add GitHub Badges to README

Add these badges at the top of your `README.md`:

```markdown
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![GitHub Issues](https://img.shields.io/github/issues/YOUR_USERNAME/deal-shield)](https://github.com/YOUR_USERNAME/deal-shield/issues)
[![GitHub Stars](https://img.shields.io/github/stars/YOUR_USERNAME/deal-shield)](https://github.com/YOUR_USERNAME/deal-shield/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/YOUR_USERNAME/deal-shield)](https://github.com/YOUR_USERNAME/deal-shield/network)
[![CI Status](https://github.com/YOUR_USERNAME/deal-shield/workflows/CI/badge.svg)](https://github.com/YOUR_USERNAME/deal-shield/actions)
```

---

## Step 11: Commit and Push Everything

```bash
# Stage all new files
git add .

# Commit
git commit -m "docs: add GitHub setup and CI/CD configuration"

# Push
git push origin main
```

---

## Step 12: Create Initial Release

1. **Go to:** Releases → Create a new release
2. **Tag version:** `v1.0.0`
3. **Release title:** `v1.0.0 - Initial Release`
4. **Description:**

```markdown
## 🎉 Initial Release

First public release of Deal Shield - a comprehensive consultant operations platform.

### Features
- 📊 **Data Audit Tool** - CSV/PDF/TXT analysis with Morningside Score
- 🔒 **Scope Guard** - SOW analysis and change order generation
- 📈 **Executive Dashboard** - KPI tracking and resource planning
- 🎨 **Modern UI** - Built with React 19 and Tailwind CSS 4
- 🚀 **High Performance** - Powered by Bun runtime

### Installation
See [README.md](https://github.com/YOUR_USERNAME/deal-shield#readme) for installation instructions.

### Documentation
- [README](https://github.com/YOUR_USERNAME/deal-shield/blob/main/README.md)
- [Contributing Guide](https://github.com/YOUR_USERNAME/deal-shield/blob/main/CONTRIBUTING.md)
- [Deployment Guide](https://github.com/YOUR_USERNAME/deal-shield/blob/main/DEPLOYMENT.md)
```

5. **Click "Publish release"**

---

## Verification Checklist

After setup, verify:

- [ ] Repository is accessible at `https://github.com/YOUR_USERNAME/deal-shield`
- [ ] README displays correctly with all formatting
- [ ] Code is pushed to `main` branch
- [ ] Issues tab is enabled
- [ ] Branch protection rules are active
- [ ] Secrets are configured (if using Actions)
- [ ] GitHub Actions workflow runs successfully (if added)
- [ ] Issue templates are available when creating new issues
- [ ] PR template shows when creating new pull requests

---

## Next Steps

1. **Share Repository:** Share the link with your team
2. **Clone on Other Machines:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/deal-shield.git
   cd deal-shield
   bun install
   ```
3. **Set Up Collaboration:** Add collaborators in Settings → Collaborators
4. **Star Your Repo:** Give your own project a star! ⭐
5. **Start Contributing:** Follow the [Contributing Guide](CONTRIBUTING.md)

---

## Troubleshooting

### Authentication Issues

If you have authentication problems:

```bash
# Use SSH instead of HTTPS
git remote set-url origin git@github.com:YOUR_USERNAME/deal-shield.git

# Or configure Git credentials
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"

# Use GitHub CLI for easier authentication
gh auth login
```

### Large Files Warning

If you get warnings about large files:

```bash
# Check file sizes
find . -type f -size +10M

# Remove large files from history (if needed)
git filter-branch --tree-filter 'rm -f path/to/large-file' HEAD
```

---

## Support

For GitHub-specific questions, see [GitHub Docs](https://docs.github.com).

For project-specific questions, open an issue on the repository.

---

**Your repository is now live on GitHub! 🚀**

