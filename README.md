# 🛡️ Deal Shield (Demo)

**A comprehensive consultant operations platform for Morningside AI**

Deal Shield is a full-stack web application designed to streamline consulting operations through intelligent data auditing, scope management, and executive planning tools. Built with modern web technologies, it provides consultants with powerful tools to assess data quality, manage project scope, and optimize resource allocation.

[![Built with Bun](https://img.shields.io/badge/Built%20with-Bun-000000?style=flat&logo=bun)](https://bun.sh)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-06B6D4?style=flat&logo=tailwindcss)](https://tailwindcss.com)

---

## 🎯 Overview

Deal Shield operationalizes critical consulting workflows through three integrated tools:

### 📊 **Data Audit**
Analyze client data assets (CSV, PDF, TXT) before project initiation. Provides:
- **Morningside Score** (0–100) assessing data quality
- **PII Detection** with automated flagging and masking
- **RAG Readiness Analysis** for AI/ML projects
- **Margin Impact Estimates** (hours + cost)
- **Go/No-Go Recommendations** with detailed rationale

### 🔒 **Scope Guard**
Intelligent SOW analysis and change order management:
- **Automated Request Classification** (in-scope, out-of-scope, grey area)
- **Change Order Generation** with professional formatting
- **Scope Drift Tracking** and bug/defect categorization
- **Revenue Impact Analysis** for change orders
- **Client Communication Tools** with embedded signature flow

### 📈 **Executive Dashboard**
Real-time operations visibility and planning:
- **KPI Tracking** (open requests, pipeline value, comms coverage)
- **Triage Queue Management** with stage-based workflows
- **Consulting Capacity Monitoring** (over/balanced/available)
- **Pipeline Breakdown** by workstream
- **Workstream Metrics** (bug-fix hours, cleanup value, change orders)

---

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- React 19 with TypeScript
- Tailwind CSS 4.1 for styling
- React Router for navigation
- Motion (Framer Motion) for animations
- Radix UI & shadcn/ui components
- Lottie for rich animations

**Backend:**
- Bun runtime & package manager
- Hono web framework
- Python (Pandas) for advanced CSV analysis
- OpenRouter API for LLM integration

**Developer Experience:**
- Vite for blazing-fast dev server & HMR
- ESLint for code quality
- TypeScript strict mode
- Concurrent dev processes with turbo-colored output

### Project Structure

```
deal-shield/
├── src/                      # Frontend React application
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base UI primitives (buttons, cards, dialogs)
│   │   ├── audit/          # Data audit components
│   │   └── scope-guard/    # Scope Guard components
│   ├── pages/              # Route-level page components
│   │   ├── home-page.tsx
│   │   ├── dashboard-page.tsx
│   │   ├── data-audit-page.tsx
│   │   ├── scope-guard-page.tsx
│   │   └── roster-page.tsx
│   ├── lib/                # Utilities & state management
│   └── main.tsx            # Application entry point
├── server/                  # Backend API server
│   ├── lib/
│   │   ├── audit/          # Data audit engine
│   │   │   ├── audit.ts    # Main orchestration
│   │   │   ├── csv.ts      # CSV analysis
│   │   │   ├── pdf.ts      # PDF analysis
│   │   │   ├── text.ts     # TXT analysis
│   │   │   ├── pii.ts      # PII detection & masking
│   │   │   ├── scoring.ts  # Morningside Score calculation
│   │   │   └── openrouter.ts # LLM integration
│   │   └── scope-guard/    # SOW analysis & change orders
│   │       ├── scope-guard.ts
│   │       ├── sow.ts
│   │       └── change-order-pack.ts
│   ├── python/             # Python utilities
│   │   └── csv_audit.py    # Pandas-based CSV validation
│   ├── app.ts              # Hono app setup
│   └── index.ts            # Server entry point
├── shared/                  # Shared types & config
│   ├── config.ts           # Centralized configuration
│   └── types.ts            # Shared TypeScript types
├── public/                  # Static assets
│   ├── assets/             # Images, logos, animations
│   └── demo/               # Sample files for testing
└── scripts/                 # Build & utility scripts
```

---

## 🚀 Getting Started

### Prerequisites

- **Bun** >= 1.0 ([installation guide](https://bun.sh))
- **Python** 3.9+ (for CSV audit functionality)
- **OpenRouter API Key** ([get one here](https://openrouter.ai))

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/deal-shield.git
   cd deal-shield
   ```

2. **Install JavaScript dependencies:**
   ```bash
   bun install
   ```

3. **Set up Python environment:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r server/python/requirements.txt
   ```

4. **Configure environment variables:**
   
   Create a `.env` file in the project root:
   ```env
   # Required: OpenRouter API key for LLM functionality
   OPENROUTER_API_KEY=your_api_key_here
   
   # Optional: DocuSeal form URL for embedded signature flow
   VITE_DOCUSEAL_FORM_URL=https://docuseal.com/d/your-form-id
   
   # Optional: Custom port (defaults to 8787)
   PORT=8787
   ```

### Development

**Run the full stack:**
```bash
bun run dev
```

This starts:
- ✅ Vite dev server on `http://localhost:5173`
- ✅ Bun API server on `http://localhost:8787`
- ✅ Hot Module Replacement (HMR) for instant updates
- ✅ API proxy configured automatically

**Run components individually:**
```bash
# Frontend only
bun run dev:web

# Backend only
bun run dev:api
```

### Production Build

```bash
# Build optimized production bundle
bun run build

# Start production server
bun run start
```

The production server serves the built frontend from `/dist` and handles API routes at `/api/*`.

---

## 📖 Usage Guide

### Data Audit Workflow

1. **Navigate to Data Audit** from the home page
2. **Upload files** (CSV, PDF, or TXT) via drag-and-drop or file picker
3. **Review analysis results:**
   - Overall Morningside Score and verdict (Green/Yellow/Red)
   - Per-file detailed reports with issue breakdowns
   - PII detection findings with masked previews
   - Estimated cleanup hours and cost impact
4. **Export results** or **add to executive dashboard** for tracking

### Scope Guard Workflow

1. **Navigate to Scope Guard** from the home page
2. **Upload SOW document** (PDF or TXT format)
3. **Submit client request** for classification
4. **Review verdict:**
   - ✅ **In-scope:** Add to backlog
   - ❌ **Out-of-scope:** Generate change order
   - ⚠️ **Grey area:** Flag for manual review
5. **Generate change order pack** with professional formatting
6. **Send to client** via embedded DocuSeal signature flow (if configured)

### Executive Dashboard Usage

1. **View KPIs** across all workstreams
2. **Manage triage queue:**
   - Filter by status (Now / Open / All)
   - Jump to specific stages
   - Assign owners and update stages
3. **Monitor consulting capacity:**
   - View over-capacity consultants (red)
   - Track available consultants (green)
   - Allocate unassigned work
4. **Review pipeline breakdown** by revenue opportunity
5. **Track workstream metrics:**
   - Scope Guard: bug-fix hours, change order value
   - Data Audit: cleanup hours, ready-to-ingest rate

---

## 🎨 Demo Files

Sample files are included in `public/demo/` for testing:

- **good_leads.csv** - Clean data, expected Green verdict
- **messy_supply_chain.pdf** - PII + mixed formats, expected Red verdict
- **morningside_sow_demo.txt** - Sample SOW for Scope Guard testing
- **sparse_inventory.txt** - Low-quality data sample

---

## ⚙️ Configuration

All audit parameters and thresholds are centralized in `shared/config.ts`:

### Key Configurable Values

- **Upload Limits:** Max 30MB total (adjustable)
- **Scoring Thresholds:** Green >= 80, Yellow >= 50
- **PII Penalty:** -45 points (critical severity)
- **Hourly Rate:** $150 USD (default)
- **Error Unit Multiplier:** 0.25 hours per unit
- **Client Estimate Buffer:** 1.5x (50% contingency)

### Security Features

- **PII Detection:** Email, phone, SSN, credit card patterns
- **Data Masking:** Preserves structure while protecting sensitive data
- **Path Traversal Protection:** Server validates all file paths
- **Upload Size Limits:** Prevents resource exhaustion

---

## 🧪 Testing & Quality

**Run linting:**
```bash
bun run lint
```

**Smoke tests:**
```bash
bun run smoke
```

The project uses TypeScript strict mode and ESLint with React-specific rules for maximum code quality.

---

## 📦 Deployment

### Production Deployment Checklist

1. ✅ Set production environment variables
2. ✅ Run `bun run build` to create optimized bundle
3. ✅ Ensure Python environment is activated in production
4. ✅ Configure reverse proxy (nginx/Caddy) if needed
5. ✅ Set up process manager (PM2/systemd) for `bun run start`
6. ✅ Enable HTTPS with valid SSL certificate

### Docker Deployment (Coming Soon)

A Dockerfile will be provided in a future release for containerized deployments.

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style

- Follow existing TypeScript/React patterns
- Use Tailwind CSS for styling (no inline styles)
- Add JSDoc comments for complex functions
- Keep components focused and under 300 lines
- Use semantic HTML and ARIA attributes for accessibility

---

## 📝 License

This project is proprietary software developed for Morningside AI. All rights reserved.

---

## 🙏 Acknowledgments

- **shadcn/ui** for beautiful, accessible component primitives
- **Tailwind CSS** for utility-first styling
- **Bun** for blazing-fast JavaScript runtime
- **OpenRouter** for unified LLM API access
- **Radix UI** for headless UI components

---

## 📞 Support

For questions or issues, please open an issue on GitHub or contact the Morningside AI team.

---

**Built with ❤️ by the Morningside AI team**
