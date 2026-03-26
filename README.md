# R&D Financial OS

**The financial operating system for R&D-intensive and AI companies**

R&D Financial OS is a comprehensive accounting and financial management platform purpose-built for companies that invest heavily in research, development, and AI infrastructure. It combines full double-entry bookkeeping with R&D tax incentive tracking, cloud cost management, and grant administration -- all tuned for Australian tax compliance.

---

## Features

### Core Accounting
- Double-entry bookkeeping with full chart of accounts
- Invoices (with recurring invoice support and bulk operations)
- Bills and accounts payable
- Payments (received and made) with automatic journal entries
- Bank transaction import and reconciliation
- Journal entries with R&D project tagging
- Expense claims with approval workflows
- Multi-currency support (AUD, USD, EUR, GBP)

### Financial Reporting
- Profit & Loss statement
- Balance Sheet
- Trial Balance
- Cash Flow statement
- GST/BAS reporting and preparation
- R&D Expenditure report
- Aged Receivables and Aged Payables
- Tax Summary

### R&D Intelligence
- Project tracking with budgets and timelines
- Activity management (Core and Supporting R&D activities)
- Experiment tracking with hypothesis, methodology, and outcomes
- Evidence upload and categorization
- Time tracking with hourly rate costing
- Auto-classification of R&D expenses
- Eligibility wizard for R&D Tax Incentive assessment
- Recommendations engine for maximizing claims
- R&D pipeline with Kanban-style stage management
- Portfolio view with risk ratings and ROI analysis
- Compliance checklists (auto-generated per project)
- Audit pack generation for AusIndustry submissions
- Claim draft calculator (refundable vs. non-refundable offsets)

### AI Infrastructure Cost Tracking
- Cloud provider management (AWS, GCP, Azure, OpenAI, Anthropic)
- Token usage tracking (input/output tokens, cost per model)
- Compute usage monitoring (GPU hours, instance types)
- Cost-per-experiment analysis
- CSV import for cloud cost data

### Grant Management
- Grant tracking with provider, status, and amounts
- Milestone management with due dates
- Deadline alerts via notifications
- Spend-to-date tracking per milestone

### Scenario Simulation
- What-if analysis with variable sliders
- Baseline vs. scenario comparison
- Save and compare multiple scenarios

### Carbon Accounting
- Scope 1, 2, and 3 emissions tracking
- Emission factor calculations
- Cost association per emission entry
- Project-linked carbon entries

### Command Center
- Unified CFO + CTO dashboard
- Real-time notifications (overdue invoices, compliance warnings, budget alerts, grant deadlines)

### Investor Data Room
- Token-based shareable views (no login required)
- Expirable and revocable access tokens
- Auto-generated financial summary, R&D overview, and portfolio data

### Platform Features
- Dark mode UI
- Responsive design (mobile, tablet, desktop)
- Command palette (Cmd+K) with global search
- Keyboard shortcuts
- CSV import (contacts, bank transactions, cloud costs)
- PDF export support
- Full audit logging with user attribution
- Role-based access control (Admin, Accountant, Researcher, Viewer)

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 16.2.1 |
| Language | TypeScript | 5.x |
| UI | React | 19.2.4 |
| Styling | Tailwind CSS | 4.x |
| Components | Radix UI | Latest |
| Charts | Recharts | 3.8.1 |
| Forms | React Hook Form + Zod | 7.x / 4.x |
| Database ORM | Prisma | 6.19.2 |
| Authentication | NextAuth.js | 5.0 beta |
| Icons | Lucide React | 1.7.0 |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd claude-

# 2. Install dependencies
npm install

# 3. Set up the database
npx prisma db push

# 4. Seed demo data
npx tsx prisma/seed.ts

# 5. Start the development server
npm run dev

# 6. Open the application
open http://localhost:3000
```

### Demo Login

| Field | Value |
|-------|-------|
| Email | `admin@powerplantenergy.com.au` |
| Password | `admin123` |

---

## Project Structure

```
src/
  app/                  # Next.js App Router pages and API routes
    api/                # REST API endpoints (auth, invoices, bills, banking, R&D, etc.)
    (auth)/             # Authentication pages (login, register)
    (dashboard)/        # Dashboard and all application pages
  lib/                  # Shared utilities and server-side logic
    auth.ts             # NextAuth configuration
    prisma.ts           # Prisma client singleton
    claim-calculator.ts # R&D Tax Incentive claim calculations
    rd-recommendations.ts # R&D recommendations engine
    scenario-engine.ts  # What-if scenario calculations
    csv-import.ts       # CSV parsing utilities
    csv-export.ts       # CSV export utilities
  components/           # React components organized by domain
    layout/             # Sidebar, header, shell
    accounting/         # Invoice, bill, payment components
    rd/                 # R&D project, experiment, compliance components
    reports/            # Financial report components
    cloud/              # Cloud cost tracking components
    charts/             # Reusable chart components
    ui/                 # Base UI components (Radix-based)
prisma/
  schema.prisma         # Database schema
  seed.ts               # Demo data seeder
  dev.db                # SQLite development database
```

---

## Screenshots

> Screenshots coming soon. The application features a dark-themed sidebar navigation, responsive dashboards with charts, and detailed data tables across all modules.

---

## Australian Tax Compliance

R&D Financial OS is built with Australian tax requirements in mind:

- **BAS (Business Activity Statement)**: Quarterly and monthly BAS preparation with automated GST calculations. Supports all BAS labels (G1-G11, W1-W2) and can be saved as draft or lodged.
- **GST**: Automatic GST calculation on invoices and bills (10% standard rate). Tracks GST Collected and GST Paid through the general ledger. Supports GST-Free, Input-Taxed, and BAS-Excluded tax types.
- **R&D Tax Incentive**: Full support for the Australian R&D Tax Incentive program under Section 355 of the ITAA 1997. Calculates refundable (43.5%) and non-refundable (38.5%) offsets based on aggregated turnover. Generates audit packs for AusIndustry registration.
- **Financial Year**: Australian financial year (July-June) is used as the default reporting period.

---

## License

MIT
