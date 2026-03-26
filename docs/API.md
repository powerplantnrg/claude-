# R&D Financial OS - API Reference

All endpoints require authentication unless noted. Authentication uses NextAuth.js session cookies.

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register new user + organization |
| GET/POST | `/api/auth/[...nextauth]` | No | NextAuth.js handler (login/logout/session) |

## Accounts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/accounts` | List chart of accounts (filter: type, active, rdEligible) |
| POST | `/api/accounts` | Create account |

## Contacts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/contacts` | List contacts (search: name/email/ABN, filter: type, rdContractor) |
| POST | `/api/contacts` | Create contact |
| GET | `/api/contacts/[id]` | Get contact with invoice/bill counts |
| PATCH | `/api/contacts/[id]` | Update contact |
| DELETE | `/api/contacts/[id]` | Delete contact (only if no linked invoices/bills) |
| POST | `/api/contacts/import` | Bulk import contacts from CSV data |

## Invoices

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/invoices` | List invoices |
| POST | `/api/invoices` | Create invoice with line items |
| GET | `/api/invoices/[id]` | Get invoice detail |
| PATCH | `/api/invoices/[id]` | Update draft / change status (Sent creates journal entries) |
| POST | `/api/invoices/bulk` | Bulk actions: mark-sent, mark-paid, export |
| GET | `/api/invoices/recurring` | List recurring invoice templates |
| POST | `/api/invoices/recurring` | Create recurring template |
| PATCH | `/api/invoices/recurring` | Update/toggle recurring template |
| POST | `/api/invoices/recurring/generate` | Generate next invoice from template |

## Bills

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/bills` | List bills |
| POST | `/api/bills` | Create bill with line items |
| GET | `/api/bills/[id]` | Get bill detail |
| PATCH | `/api/bills/[id]` | Update draft / change status |

## Banking

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/banking` | List bank transactions (filter: reconciled) |
| POST | `/api/banking` | Create transaction, reconcile, or bulk CSV import |
| POST | `/api/banking/import` | Import bank transactions from CSV (duplicate detection) |

## Journal Entries

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/journal-entries` | List journal entries |
| POST | `/api/journal-entries` | Create journal entry (validates debits = credits) |

## Payments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/payments` | List payments (filter: type, dateFrom, dateTo) |
| POST | `/api/payments` | Record payment (creates journal entry, updates invoice/bill status) |

## Expense Claims

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/expenses` | List expense claims |
| POST | `/api/expenses` | Create claim with items |
| GET | `/api/expenses/[id]` | Get claim detail |
| PATCH | `/api/expenses/[id]` | Update status (submit, approve, reject, pay) |

## Reports

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reports?type=` | Generate report (pnl, balance-sheet, trial-balance, cash-flow, gst, rd-expenditure) |
| GET | `/api/reports/aging?type=` | Aged receivables or payables |
| GET | `/api/reports/bas` | Compute BAS data for period |
| POST | `/api/reports/bas` | Save/lodge BAS return |

## R&D Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/rd/projects` | List R&D projects |
| POST | `/api/rd/projects` | Create project (auto-creates compliance checklist) |

## R&D Activities

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/rd/activities` | List activities (filter: projectId) |
| POST | `/api/rd/activities` | Create activity |
| GET | `/api/rd/activities/[id]` | Get activity detail |
| PATCH | `/api/rd/activities/[id]` | Update activity |

## R&D Experiments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/rd/experiments` | List experiments |
| POST | `/api/rd/experiments` | Create experiment |
| GET | `/api/rd/experiments/[id]` | Get experiment with resources/outcomes |
| PATCH | `/api/rd/experiments/[id]` | Update experiment / status transition |

## R&D Time Entries

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/rd/time-entries` | List time entries |
| POST | `/api/rd/time-entries` | Create time entry |
| PATCH | `/api/rd/time-entries/[id]` | Update time entry |
| DELETE | `/api/rd/time-entries/[id]` | Delete time entry |

## R&D Evidence

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/rd/evidence` | List evidence files |
| POST | `/api/rd/evidence` | Create evidence record |

## R&D Claims & Compliance

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/rd/claims` | List claim drafts |
| POST | `/api/rd/claims` | Generate claim draft |
| PATCH | `/api/rd/compliance/[id]` | Toggle compliance checklist item |
| POST | `/api/rd/audit-pack` | Generate audit pack JSON |
| GET | `/api/rd/advice` | Get R&D advice items |
| POST | `/api/rd/eligibility` | Save eligibility assessment |
| GET | `/api/rd/recommendations` | Get computed recommendations |

## R&D Pipeline & Portfolio

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/rd/pipeline` | Get pipeline stages with experiments |
| POST | `/api/rd/pipeline` | Create stage / assign experiment |
| PATCH | `/api/rd/pipeline` | Update stage or move experiment |
| GET | `/api/rd/portfolio` | Get portfolio with computed metrics |
| PATCH | `/api/rd/portfolio` | Update portfolio entry (probability, ROI) |

## Cloud Costs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cloud/costs` | List cost entries (filter: date, provider) |
| POST | `/api/cloud/costs` | Create cost entry |
| POST | `/api/cloud/import` | Bulk import cloud costs from CSV |
| GET | `/api/cloud/providers` | List cloud providers |
| POST | `/api/cloud/providers` | Add provider |
| PATCH | `/api/cloud/providers` | Update provider |
| GET | `/api/cloud/usage` | Get token and compute usage |

## Grants

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/grants` | List grants |
| POST | `/api/grants` | Create grant |
| POST | `/api/grants/milestones` | Add milestone |
| PATCH | `/api/grants/milestones/[id]` | Update milestone |

## Carbon

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/carbon` | List carbon entries (filter: date, category) |
| POST | `/api/carbon` | Create carbon entry |

## Scenarios

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/scenarios` | List saved scenarios |
| POST | `/api/scenarios` | Save scenario |

## Currencies

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/currencies` | List currencies |
| POST | `/api/currencies` | Add currency |
| PATCH | `/api/currencies` | Update exchange rate |

## Data Room

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/data-room` | List share tokens |
| POST | `/api/data-room` | Create share token |
| PATCH | `/api/data-room` | Update token (toggle active, expiry) |
| DELETE | `/api/data-room` | Delete token |
| GET | `/api/data-room/[token]` | **Public** - Get data room content |

## Users & Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users` | List org users |
| POST | `/api/users` | Invite user |
| GET | `/api/users/[id]` | Get user |
| PATCH | `/api/users/[id]` | Update role/name |
| DELETE | `/api/users/[id]` | Deactivate user |
| GET | `/api/settings` | Get org settings |
| PATCH | `/api/settings` | Update org settings |
| GET | `/api/audit-log` | List audit logs (paginated, filterable) |

## Platform

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/search?q=` | Global search across entities |
| GET | `/api/notifications` | Get computed notifications |
| GET | `/api/onboarding` | Get onboarding checklist status |
| GET | `/api/quick-stats` | Get dashboard quick stats |
| GET | `/api/favorites` | List user favorites |
| POST | `/api/favorites` | Add favorite |
| DELETE | `/api/favorites` | Remove favorite |
| POST | `/api/upload` | Upload file (multipart form) |
