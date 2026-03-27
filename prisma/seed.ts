import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Create default organization
  const org = await prisma.organization.create({
    data: {
      name: "Power Plant Energy",
      abn: "12 345 678 901",
      address: "123 Innovation Drive",
      city: "Sydney",
      state: "NSW",
      postcode: "2000",
      country: "Australia",
      financialYearEnd: 6,
      baseCurrency: "AUD",
    },
  })

  // Create admin user
  const passwordHash = await bcrypt.hash("admin123", 12)
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@powerplantenergy.com.au",
      name: "Admin User",
      passwordHash,
      role: "Admin",
      organizationId: org.id,
    },
  })

  // Create Tax Rates
  const taxRates = [
    { name: "GST on Income", rate: 10, taxType: "GST", isDefault: true },
    { name: "GST on Expenses", rate: 10, taxType: "GST", isDefault: false },
    { name: "GST Free Income", rate: 0, taxType: "GST-Free", isDefault: false },
    { name: "GST Free Expenses", rate: 0, taxType: "GST-Free", isDefault: false },
    { name: "Input Taxed", rate: 0, taxType: "Input-Taxed", isDefault: false },
    { name: "BAS Excluded", rate: 0, taxType: "BAS-Excluded", isDefault: false },
  ]
  for (const tr of taxRates) {
    await prisma.taxRate.create({ data: { ...tr, organizationId: org.id } })
  }

  // Create Standard Australian Chart of Accounts
  const accounts = [
    // Assets
    { code: "1000", name: "Cheque Account", type: "Asset", subType: "Bank", taxType: "BAS-Excluded", isSystemAccount: true },
    { code: "1050", name: "Savings Account", type: "Asset", subType: "Bank", taxType: "BAS-Excluded" },
    { code: "1100", name: "Accounts Receivable", type: "Asset", subType: "Current Asset", taxType: "BAS-Excluded", isSystemAccount: true },
    { code: "1150", name: "Prepayments", type: "Asset", subType: "Current Asset", taxType: "BAS-Excluded" },
    { code: "1200", name: "Inventory", type: "Asset", subType: "Current Asset", taxType: "BAS-Excluded" },
    { code: "1300", name: "Office Equipment", type: "Asset", subType: "Fixed Asset", taxType: "GST" },
    { code: "1310", name: "Computer Equipment", type: "Asset", subType: "Fixed Asset", taxType: "GST" },
    { code: "1320", name: "Lab Equipment", type: "Asset", subType: "Fixed Asset", taxType: "GST", isRdEligible: true },
    { code: "1400", name: "Accumulated Depreciation", type: "Asset", subType: "Fixed Asset", taxType: "BAS-Excluded" },

    // Liabilities
    { code: "2000", name: "Accounts Payable", type: "Liability", subType: "Current Liability", taxType: "BAS-Excluded", isSystemAccount: true },
    { code: "2050", name: "Credit Card", type: "Liability", subType: "Current Liability", taxType: "BAS-Excluded" },
    { code: "2100", name: "GST Collected", type: "Liability", subType: "Current Liability", taxType: "BAS-Excluded", isSystemAccount: true },
    { code: "2150", name: "GST Paid", type: "Liability", subType: "Current Liability", taxType: "BAS-Excluded", isSystemAccount: true },
    { code: "2200", name: "PAYG Withholding", type: "Liability", subType: "Current Liability", taxType: "BAS-Excluded" },
    { code: "2300", name: "Superannuation Payable", type: "Liability", subType: "Current Liability", taxType: "BAS-Excluded" },
    { code: "2400", name: "Wages Payable", type: "Liability", subType: "Current Liability", taxType: "BAS-Excluded" },
    { code: "2500", name: "Loan - Current", type: "Liability", subType: "Current Liability", taxType: "BAS-Excluded" },
    { code: "2600", name: "Loan - Non-Current", type: "Liability", subType: "Non-Current Liability", taxType: "BAS-Excluded" },

    // Equity
    { code: "3000", name: "Owner's Equity", type: "Equity", subType: "Equity", taxType: "BAS-Excluded" },
    { code: "3100", name: "Retained Earnings", type: "Equity", subType: "Equity", taxType: "BAS-Excluded", isSystemAccount: true },
    { code: "3200", name: "Current Year Earnings", type: "Equity", subType: "Equity", taxType: "BAS-Excluded", isSystemAccount: true },

    // Revenue
    { code: "4000", name: "Sales Revenue", type: "Revenue", subType: "Revenue", taxType: "GST" },
    { code: "4100", name: "Consulting Revenue", type: "Revenue", subType: "Revenue", taxType: "GST" },
    { code: "4200", name: "R&D Tax Incentive Income", type: "Revenue", subType: "Other Revenue", taxType: "BAS-Excluded" },
    { code: "4300", name: "Grant Income", type: "Revenue", subType: "Other Revenue", taxType: "GST-Free" },
    { code: "4400", name: "Interest Income", type: "Revenue", subType: "Other Revenue", taxType: "GST-Free" },
    { code: "4500", name: "Other Revenue", type: "Revenue", subType: "Other Revenue", taxType: "GST" },

    // Expenses
    { code: "5000", name: "Cost of Goods Sold", type: "Expense", subType: "Direct Costs", taxType: "GST" },
    { code: "6000", name: "Advertising & Marketing", type: "Expense", subType: "Operating Expense", taxType: "GST" },
    { code: "6050", name: "Bank Fees", type: "Expense", subType: "Operating Expense", taxType: "GST-Free" },
    { code: "6100", name: "Consulting & Accounting", type: "Expense", subType: "Operating Expense", taxType: "GST" },
    { code: "6150", name: "Depreciation", type: "Expense", subType: "Operating Expense", taxType: "BAS-Excluded" },
    { code: "6200", name: "Entertainment", type: "Expense", subType: "Operating Expense", taxType: "GST" },
    { code: "6250", name: "Insurance", type: "Expense", subType: "Operating Expense", taxType: "GST-Free" },
    { code: "6300", name: "Legal Fees", type: "Expense", subType: "Operating Expense", taxType: "GST" },
    { code: "6350", name: "Office Supplies", type: "Expense", subType: "Operating Expense", taxType: "GST" },
    { code: "6400", name: "Rent", type: "Expense", subType: "Operating Expense", taxType: "GST" },
    { code: "6450", name: "Subscriptions & Software", type: "Expense", subType: "Operating Expense", taxType: "GST" },
    { code: "6500", name: "Telephone & Internet", type: "Expense", subType: "Operating Expense", taxType: "GST" },
    { code: "6550", name: "Travel - Domestic", type: "Expense", subType: "Operating Expense", taxType: "GST" },
    { code: "6600", name: "Travel - International", type: "Expense", subType: "Operating Expense", taxType: "GST-Free" },
    { code: "6650", name: "Utilities", type: "Expense", subType: "Operating Expense", taxType: "GST" },

    // R&D Specific Expenses
    { code: "7000", name: "R&D Staff Salaries", type: "Expense", subType: "R&D Expense", taxType: "BAS-Excluded", isRdEligible: true },
    { code: "7050", name: "R&D Contractor Costs", type: "Expense", subType: "R&D Expense", taxType: "GST", isRdEligible: true },
    { code: "7100", name: "R&D Materials & Consumables", type: "Expense", subType: "R&D Expense", taxType: "GST", isRdEligible: true },
    { code: "7150", name: "R&D Cloud Computing", type: "Expense", subType: "R&D Expense", taxType: "GST", isRdEligible: true },
    { code: "7200", name: "R&D Software & Licenses", type: "Expense", subType: "R&D Expense", taxType: "GST", isRdEligible: true },
    { code: "7250", name: "R&D Equipment Depreciation", type: "Expense", subType: "R&D Expense", taxType: "BAS-Excluded", isRdEligible: true },
    { code: "7300", name: "R&D Overhead Allocation", type: "Expense", subType: "R&D Expense", taxType: "BAS-Excluded", isRdEligible: true },
    { code: "7350", name: "R&D Travel & Conference", type: "Expense", subType: "R&D Expense", taxType: "GST", isRdEligible: true },

    // Wages & Payroll
    { code: "8000", name: "Wages & Salaries", type: "Expense", subType: "Payroll", taxType: "BAS-Excluded" },
    { code: "8050", name: "Superannuation", type: "Expense", subType: "Payroll", taxType: "BAS-Excluded" },
    { code: "8100", name: "Workers Compensation", type: "Expense", subType: "Payroll", taxType: "GST-Free" },
    { code: "8150", name: "Payroll Tax", type: "Expense", subType: "Payroll", taxType: "BAS-Excluded" },
  ]

  for (const acc of accounts) {
    await prisma.account.create({
      data: {
        ...acc,
        isSystemAccount: acc.isSystemAccount || false,
        isRdEligible: acc.isRdEligible || false,
        organizationId: org.id,
      },
    })
  }

  // Create R&D Pipeline Stages
  const stages = [
    { name: "Ideation", stageOrder: 1, description: "Initial concept and hypothesis formation" },
    { name: "Planning", stageOrder: 2, description: "Experiment design and resource planning" },
    { name: "In Progress", stageOrder: 3, description: "Active experimentation" },
    { name: "Analysis", stageOrder: 4, description: "Analyzing results and outcomes" },
    { name: "Complete", stageOrder: 5, description: "Experiment concluded with documented outcomes" },
  ]
  for (const stage of stages) {
    await prisma.rdPipelineStage.create({ data: { ...stage, organizationId: org.id } })
  }

  // Create R&D Advice Items
  const adviceItems = [
    {
      title: "What qualifies as R&D under the ATO?",
      content: `Under the Australian R&D Tax Incentive, eligible R&D activities must involve:\n\n**Core R&D Activities:**\n- Experimental activities whose outcome cannot be known or determined in advance\n- Can only be determined by applying a systematic progression of work based on principles of established science\n- Conducted for the purpose of generating new knowledge\n\n**Supporting R&D Activities:**\n- Directly related to core R&D activities\n- Must be undertaken for the dominant purpose of supporting core activities\n\n**Key Tests:**\n1. Is there genuine technical uncertainty?\n2. Is there a systematic investigation or experimentation?\n3. Is the purpose to generate new knowledge?\n\n**Excluded Activities:**\n- Market research or sales promotion\n- Quality control or routine testing\n- Commercial, legal or administrative aspects\n- Activities related to the arts\n- Prospecting, exploring or drilling for minerals`,
      category: "Eligibility",
      priority: 1,
    },
    {
      title: "Contemporaneous Documentation Requirements",
      content: `The ATO requires that R&D records be created at or around the time the activities are conducted (contemporaneous). Key documentation:\n\n**Essential Records:**\n1. **Project plans** - Hypothesis, methodology, expected outcomes\n2. **Experiment logs** - What was tried, when, by whom, what happened\n3. **Time records** - Staff time spent on R&D vs non-R&D\n4. **Financial records** - All expenditure linked to R&D activities\n5. **Technical reports** - Results, analysis, conclusions\n6. **Meeting minutes** - Technical discussions and decisions\n\n**Best Practices:**\n- Record entries within 1 week of the activity\n- Use timestamped digital records where possible\n- Link evidence directly to specific activities\n- Keep both successful and failed experiment records\n- Document the technical uncertainty clearly\n\n**Common Mistakes:**\n- Creating records retrospectively at claim time\n- Not linking time records to specific R&D activities\n- Failing to document negative or inconclusive results`,
      category: "RecordKeeping",
      priority: 2,
    },
    {
      title: "Structuring Expenses for Maximum R&D Offset",
      content: `**Eligible Expenditure Categories:**\n\n1. **Staff costs** (typically largest component)\n   - Salaries, wages, bonuses for R&D personnel\n   - Superannuation contributions\n   - Leave entitlements (pro-rated for R&D time)\n\n2. **Contractor costs**\n   - Research organisations (CSIRO, universities)\n   - Independent contractors performing R&D\n   - Note: Only the portion for R&D work qualifies\n\n3. **Materials & consumables**\n   - Raw materials used in experiments\n   - Prototype materials\n   - Less any feedstock adjustments\n\n4. **Overhead allocation**\n   - Rent (pro-rated for R&D space)\n   - Utilities for R&D facilities\n   - IT infrastructure supporting R&D\n\n5. **Cloud computing & software**\n   - Model training costs (GPU/TPU)\n   - Cloud infrastructure for experiments\n   - Research software licenses\n\n**Offset Rates (2024-25):**\n- Turnover < $20M: 43.5% refundable offset\n- Turnover >= $20M: 38.5% non-refundable offset\n- $150M+ turnover: Additional intensity threshold applies`,
      category: "FinancialStructuring",
      priority: 3,
    },
    {
      title: "R&D Tax Incentive Claim Timeline",
      content: `**Annual Claim Process:**\n\n1. **During the year** - Maintain contemporaneous records, track expenses\n2. **After year end (1 July)** - Compile R&D expenditure, review eligibility\n3. **Register with AusIndustry** - Within 10 months of financial year end (usually by 30 April)\n4. **Lodge tax return** - Include R&D Tax Incentive Schedule\n\n**Key Deadlines (June 30 FY):**\n- Register R&D activities: By April 30 following year\n- Lodge company tax return: Usually by the following March (with extension)\n- Advance/Overseas Finding: Apply before activities commence if needed\n\n**Registration Requirements:**\n- Must register EACH financial year\n- Registration is per activity, not per project\n- Cannot retrospectively register after the deadline\n\n**Tips:**\n- Don't wait until year-end to organise documentation\n- Consider quarterly reviews of R&D spend\n- Engage R&D tax advisors early in the process`,
      category: "ClaimPreparation",
      priority: 4,
    },
    {
      title: "Common R&D Claim Rejection Reasons",
      content: `**Top Reasons Claims Are Rejected or Reduced:**\n\n1. **No genuine technical uncertainty**\n   - The outcome was already known or could be determined by a competent professional\n   - Fix: Clearly document what was unknown before the work\n\n2. **Insufficient hypothesis documentation**\n   - No clear hypothesis was formed before experimentation\n   - Fix: Write hypotheses BEFORE starting experiments\n\n3. **Records created retrospectively**\n   - Documentation created months after activities occurred\n   - Fix: Use this platform to record activities in real-time\n\n4. **Ineligible activities claimed**\n   - Routine software development, testing, or deployment\n   - Fix: Only claim activities with genuine experimentation\n\n5. **Poor expense allocation**\n   - Cannot demonstrate which expenses relate to R&D\n   - Fix: Tag expenses to R&D projects from the start\n\n6. **No systematic progression of work**\n   - Ad-hoc development without a structured approach\n   - Fix: Document methodology and systematic approach\n\n7. **Supporting activities not linked to core**\n   - Supporting activities claimed without connection to core R&D\n   - Fix: Clearly map supporting to core activities`,
      category: "CommonMistakes",
      priority: 5,
    },
    {
      title: "AI & Machine Learning as R&D",
      content: `**How AI/ML Work Qualifies as R&D:**\n\nAI and machine learning development can qualify when there is genuine technical uncertainty:\n\n**Typically Eligible:**\n- Developing novel algorithms or architectures\n- Adapting existing models to solve problems where outcome is uncertain\n- Creating new training methodologies\n- Building systems that require experimentation to determine viability\n- Developing new approaches to data processing or feature engineering\n\n**Typically NOT Eligible:**\n- Routine application of existing ML libraries\n- Standard fine-tuning with known techniques\n- Deploying pre-trained models without modification\n- Standard data pipeline development\n\n**Documentation for AI R&D:**\n1. Document the technical challenge (why existing approaches are insufficient)\n2. Record each experiment: model architecture, hyperparameters, training config\n3. Track compute costs per experiment (GPU hours, cloud costs)\n4. Document results including failures and iterations\n5. Record the knowledge gained from each experiment\n\n**Cost Tracking for AI R&D:**\n- Cloud compute costs (AWS/GCP/Azure)\n- API costs (OpenAI, Anthropic, etc.)\n- Dataset acquisition or creation costs\n- Personnel time on experimentation vs. routine development`,
      category: "AISpecific",
      priority: 6,
    },
    {
      title: "Core vs Supporting Activity Classification",
      content: `**Core R&D Activities:**\nActivities where the outcome cannot be known in advance and require systematic experimentation.\n\n**Examples:**\n- Testing whether a new algorithm can achieve target accuracy\n- Experimenting with novel materials or processes\n- Investigating whether a new approach to energy optimization works\n\n**Supporting R&D Activities:**\nActivities directly related to core R&D, undertaken for the dominant purpose of supporting the core activity.\n\n**Examples:**\n- Building test infrastructure for experiments\n- Collecting and preparing datasets for ML experiments\n- Creating measurement tools for experimental outcomes\n- Developing prototypes to test hypotheses\n\n**Key Distinction:**\n- Supporting activities must have core R&D as their DOMINANT purpose\n- If an activity has equal commercial and R&D purposes, it likely doesn't qualify as supporting\n- Supporting activities can only be claimed if linked to a registered core activity\n\n**Tip:** Always document the link between each supporting activity and its core R&D activity in this platform.`,
      category: "Eligibility",
      priority: 7,
    },
  ]

  for (const advice of adviceItems) {
    await prisma.rdAdviceItem.create({
      data: { ...advice, organizationId: org.id },
    })
  }

  // Create default cloud providers
  const providers = [
    { name: "AWS", displayName: "Amazon Web Services" },
    { name: "GCP", displayName: "Google Cloud Platform" },
    { name: "Azure", displayName: "Microsoft Azure" },
    { name: "OpenAI", displayName: "OpenAI" },
    { name: "Anthropic", displayName: "Anthropic" },
  ]
  for (const p of providers) {
    await prisma.cloudProvider.create({
      data: { ...p, enabled: false, organizationId: org.id },
    })
  }

  // ============================================
  // DEMO DATA: Realistic sample data
  // ============================================

  // Helper: date offsets from today
  const today = new Date()
  const daysAgo = (n: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() - n)
    return d
  }

  // Look up accounts we need by code
  const accountByCode = async (code: string) => {
    const acc = await prisma.account.findFirst({ where: { code, organizationId: org.id } })
    if (!acc) throw new Error(`Account ${code} not found`)
    return acc
  }

  const salesRevenueAcct = await accountByCode("4000")
  const consultingRevenueAcct = await accountByCode("4100")
  const rdCloudAcct = await accountByCode("7150")
  const rdContractorAcct = await accountByCode("7050")
  const rdMaterialsAcct = await accountByCode("7100")
  const rdSoftwareAcct = await accountByCode("7200")
  const officeSuppliesAcct = await accountByCode("6350")
  const chequeAcct = await accountByCode("1000")

  // Look up cloud providers
  const awsProvider = await prisma.cloudProvider.findFirst({ where: { name: "AWS", organizationId: org.id } })
  const openaiProvider = await prisma.cloudProvider.findFirst({ where: { name: "OpenAI", organizationId: org.id } })
  if (!awsProvider || !openaiProvider) throw new Error("Cloud providers not found")

  // Look up pipeline stages
  const inProgressStage = await prisma.rdPipelineStage.findFirst({ where: { name: "In Progress", organizationId: org.id } })
  const completeStage = await prisma.rdPipelineStage.findFirst({ where: { name: "Complete", organizationId: org.id } })
  const planningStage = await prisma.rdPipelineStage.findFirst({ where: { name: "Planning", organizationId: org.id } })

  // --- 1. Contacts (6) ---
  const techCorp = await prisma.contact.create({
    data: {
      name: "TechCorp Solutions",
      email: "accounts@techcorp.com.au",
      phone: "02 9876 5432",
      abn: "51 824 753 556",
      contactType: "Customer",
      address: "100 Tech Park Drive",
      city: "Sydney",
      state: "NSW",
      postcode: "2000",
      organizationId: org.id,
    },
  })

  const greenEnergy = await prisma.contact.create({
    data: {
      name: "GreenEnergy Partners",
      email: "billing@greenenergy.com.au",
      phone: "03 8765 4321",
      abn: "33 612 489 173",
      contactType: "Customer",
      address: "45 Renewable Way",
      city: "Melbourne",
      state: "VIC",
      postcode: "3000",
      organizationId: org.id,
    },
  })

  const dataFlow = await prisma.contact.create({
    data: {
      name: "DataFlow Analytics",
      email: "ap@dataflow.io",
      phone: "07 3456 7890",
      abn: "29 445 678 902",
      contactType: "Customer",
      address: "12 Data Lane",
      city: "Brisbane",
      state: "QLD",
      postcode: "4000",
      organizationId: org.id,
    },
  })

  const awsContact = await prisma.contact.create({
    data: {
      name: "AWS Cloud Services",
      email: "invoicing@aws.amazon.com",
      contactType: "Supplier",
      address: "410 Terry Avenue North",
      city: "Seattle",
      state: "WA",
      postcode: "98109",
      organizationId: org.id,
    },
  })

  const nvidia = await prisma.contact.create({
    data: {
      name: "NVIDIA Computing",
      email: "enterprise@nvidia.com",
      abn: "88 166 369 001",
      contactType: "Supplier",
      isRdContractor: true,
      address: "2788 San Tomas Expressway",
      city: "Santa Clara",
      state: "CA",
      postcode: "95051",
      organizationId: org.id,
    },
  })

  const uniMelb = await prisma.contact.create({
    data: {
      name: "University of Melbourne",
      email: "research.finance@unimelb.edu.au",
      phone: "03 9035 5511",
      abn: "84 002 705 224",
      contactType: "Both",
      isRdContractor: true,
      address: "Grattan Street",
      city: "Parkville",
      state: "VIC",
      postcode: "3010",
      organizationId: org.id,
    },
  })

  // --- 2. Invoices (6) ---
  // Paid invoices
  const inv1 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-0001",
      contactId: techCorp.id,
      date: daysAgo(90),
      dueDate: daysAgo(60),
      status: "Paid",
      subtotal: 40909.09,
      taxTotal: 4090.91,
      total: 45000,
      amountDue: 0,
      notes: "AI model development consulting - Phase 1",
      organizationId: org.id,
      lines: {
        create: [
          { description: "AI Model Architecture Design", quantity: 80, unitPrice: 350, accountId: consultingRevenueAcct.id, taxType: "GST", amount: 28000 },
          { description: "Data Pipeline Setup", quantity: 40, unitPrice: 280, accountId: consultingRevenueAcct.id, taxType: "GST", amount: 11200 },
          { description: "Project Documentation", quantity: 8, unitPrice: 213.64, accountId: salesRevenueAcct.id, taxType: "GST", amount: 1709.09 },
        ],
      },
    },
  })

  const inv2 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-0002",
      contactId: greenEnergy.id,
      date: daysAgo(75),
      dueDate: daysAgo(45),
      status: "Paid",
      subtotal: 70909.09,
      taxTotal: 7090.91,
      total: 78000,
      amountDue: 0,
      notes: "Energy grid optimization platform - Milestone 2",
      organizationId: org.id,
      lines: {
        create: [
          { description: "Grid Optimization Algorithm Development", quantity: 120, unitPrice: 400, accountId: consultingRevenueAcct.id, taxType: "GST", amount: 48000 },
          { description: "Real-time Monitoring Dashboard", quantity: 60, unitPrice: 350, accountId: salesRevenueAcct.id, taxType: "GST", amount: 21000 },
          { description: "Performance Testing & QA", quantity: 10, unitPrice: 190.91, accountId: salesRevenueAcct.id, taxType: "GST", amount: 1909.09 },
        ],
      },
    },
  })

  // Sent invoices
  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-0003",
      contactId: dataFlow.id,
      date: daysAgo(30),
      dueDate: daysAgo(-1),
      status: "Sent",
      subtotal: 29090.91,
      taxTotal: 2909.09,
      total: 32000,
      amountDue: 32000,
      notes: "Data analytics platform integration",
      organizationId: org.id,
      lines: {
        create: [
          { description: "API Integration Development", quantity: 50, unitPrice: 320, accountId: consultingRevenueAcct.id, taxType: "GST", amount: 16000 },
          { description: "Data Migration Services", quantity: 40, unitPrice: 327.27, accountId: salesRevenueAcct.id, taxType: "GST", amount: 13090.91 },
        ],
      },
    },
  })

  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-0004",
      contactId: uniMelb.id,
      date: daysAgo(15),
      dueDate: daysAgo(-15),
      status: "Sent",
      subtotal: 50000,
      taxTotal: 5000,
      total: 55000,
      amountDue: 55000,
      notes: "Research collaboration - ML model training services",
      organizationId: org.id,
      lines: {
        create: [
          { description: "ML Model Training Infrastructure", quantity: 100, unitPrice: 300, accountId: salesRevenueAcct.id, taxType: "GST", amount: 30000 },
          { description: "Research Data Processing", quantity: 50, unitPrice: 400, accountId: consultingRevenueAcct.id, taxType: "GST", amount: 20000 },
        ],
      },
    },
  })

  // Draft invoices
  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-0005",
      contactId: techCorp.id,
      date: daysAgo(5),
      dueDate: daysAgo(-25),
      status: "Draft",
      subtotal: 13636.36,
      taxTotal: 1363.64,
      total: 15000,
      amountDue: 15000,
      notes: "AI model maintenance - Q1 2026",
      organizationId: org.id,
      lines: {
        create: [
          { description: "Model Monitoring & Maintenance", quantity: 30, unitPrice: 300, accountId: consultingRevenueAcct.id, taxType: "GST", amount: 9000 },
          { description: "Performance Tuning", quantity: 15, unitPrice: 309.09, accountId: consultingRevenueAcct.id, taxType: "GST", amount: 4636.36 },
        ],
      },
    },
  })

  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-0006",
      contactId: greenEnergy.id,
      date: daysAgo(2),
      dueDate: daysAgo(-28),
      status: "Draft",
      subtotal: 20000,
      taxTotal: 2000,
      total: 22000,
      amountDue: 22000,
      notes: "Energy forecasting module - Phase 3",
      organizationId: org.id,
      lines: {
        create: [
          { description: "Forecasting Algorithm Development", quantity: 40, unitPrice: 350, accountId: consultingRevenueAcct.id, taxType: "GST", amount: 14000 },
          { description: "Dashboard Integration", quantity: 20, unitPrice: 300, accountId: salesRevenueAcct.id, taxType: "GST", amount: 6000 },
        ],
      },
    },
  })

  // --- 3. Bills (4) ---
  // Received bills
  await prisma.bill.create({
    data: {
      billNumber: "BILL-0001",
      contactId: awsContact.id,
      date: daysAgo(60),
      dueDate: daysAgo(30),
      status: "Received",
      subtotal: 10909.09,
      taxTotal: 1090.91,
      total: 12000,
      amountDue: 12000,
      notes: "AWS cloud infrastructure - December 2025",
      organizationId: org.id,
      lines: {
        create: [
          { description: "EC2 GPU Instances (p4d.24xlarge)", quantity: 1, unitPrice: 7272.73, accountId: rdCloudAcct.id, taxType: "GST", amount: 7272.73 },
          { description: "S3 Storage & Data Transfer", quantity: 1, unitPrice: 2181.82, accountId: rdCloudAcct.id, taxType: "GST", amount: 2181.82 },
          { description: "CloudWatch Monitoring", quantity: 1, unitPrice: 1454.54, accountId: rdCloudAcct.id, taxType: "GST", amount: 1454.54 },
        ],
      },
    },
  })

  await prisma.bill.create({
    data: {
      billNumber: "BILL-0002",
      contactId: nvidia.id,
      date: daysAgo(45),
      dueDate: daysAgo(15),
      status: "Received",
      subtotal: 7272.73,
      taxTotal: 727.27,
      total: 8000,
      amountDue: 8000,
      notes: "NVIDIA DGX Cloud computing allocation",
      organizationId: org.id,
      lines: {
        create: [
          { description: "DGX Cloud A100 GPU Hours", quantity: 200, unitPrice: 28.18, accountId: rdCloudAcct.id, taxType: "GST", amount: 5636 },
          { description: "Enterprise Support License", quantity: 1, unitPrice: 1636.73, accountId: rdSoftwareAcct.id, taxType: "GST", amount: 1636.73 },
        ],
      },
    },
  })

  // Draft bills
  await prisma.bill.create({
    data: {
      billNumber: "BILL-0003",
      contactId: awsContact.id,
      date: daysAgo(10),
      dueDate: daysAgo(-20),
      status: "Draft",
      subtotal: 4545.45,
      taxTotal: 454.55,
      total: 5000,
      amountDue: 5000,
      notes: "AWS cloud infrastructure - January 2026",
      organizationId: org.id,
      lines: {
        create: [
          { description: "EC2 GPU Instances", quantity: 1, unitPrice: 3181.82, accountId: rdCloudAcct.id, taxType: "GST", amount: 3181.82 },
          { description: "S3 Storage", quantity: 1, unitPrice: 1363.63, accountId: rdCloudAcct.id, taxType: "GST", amount: 1363.63 },
        ],
      },
    },
  })

  await prisma.bill.create({
    data: {
      billNumber: "BILL-0004",
      contactId: uniMelb.id,
      date: daysAgo(7),
      dueDate: daysAgo(-23),
      status: "Draft",
      subtotal: 2727.27,
      taxTotal: 272.73,
      total: 3000,
      amountDue: 3000,
      notes: "Research collaboration materials",
      organizationId: org.id,
      lines: {
        create: [
          { description: "Research Dataset License", quantity: 1, unitPrice: 1818.18, accountId: rdMaterialsAcct.id, taxType: "GST", amount: 1818.18 },
          { description: "Lab Equipment Rental", quantity: 1, unitPrice: 909.09, accountId: rdMaterialsAcct.id, taxType: "GST", amount: 909.09 },
        ],
      },
    },
  })

  // --- 4. R&D Projects (2) ---
  const nasProject = await prisma.rdProject.create({
    data: {
      name: "Neural Architecture Search",
      description: "Developing novel neural architecture search algorithms to automatically discover optimal deep learning model architectures for energy grid applications. The project investigates whether evolutionary strategies combined with differentiable architecture search can reduce model training time by 60% while maintaining accuracy.",
      startDate: daysAgo(180),
      endDate: null,
      status: "Active",
      coreActivityDescription: "Systematic experimentation with novel NAS algorithms combining evolutionary strategies and gradient-based optimization to discover architectures that cannot be predicted by existing methods.",
      hypothesisSummary: "A hybrid evolutionary-differentiable NAS approach can discover architectures that achieve within 2% of SOTA accuracy while requiring 60% less compute for training.",
      technicalUncertainty: "It is unknown whether combining evolutionary strategies with differentiable architecture search will produce viable architectures, or whether the search space explosion will make the approach computationally infeasible.",
      newKnowledgeSought: "New understanding of how evolutionary and gradient-based search strategies interact in architecture search spaces, and whether hybrid approaches can overcome known limitations of each individual method.",
      eligibilityStatus: "Eligible",
      budget: 500000,
      organizationId: org.id,
    },
  })

  const energyProject = await prisma.rdProject.create({
    data: {
      name: "Energy Grid Optimization",
      description: "Investigating machine learning approaches to real-time energy grid load balancing and demand forecasting. The project explores whether transformer-based models can predict grid demand with sufficient accuracy to enable autonomous load management.",
      startDate: daysAgo(120),
      endDate: null,
      status: "Active",
      coreActivityDescription: "Experimentation with transformer-based architectures for multi-horizon energy demand forecasting, where it is uncertain whether attention mechanisms can capture the complex temporal and spatial dependencies in grid data.",
      hypothesisSummary: "Transformer models with custom attention mechanisms can predict energy grid demand within 3% MAPE across 24-hour horizons, enabling real-time autonomous load balancing.",
      technicalUncertainty: "Standard transformer architectures have not been demonstrated to work effectively with irregular time-series grid data. It is unknown whether custom attention patterns can capture the non-linear interactions between weather, usage patterns, and grid topology.",
      newKnowledgeSought: "Novel understanding of how attention mechanisms in transformer models can be adapted for irregular temporal patterns in energy grid data.",
      eligibilityStatus: "Eligible",
      budget: 350000,
      organizationId: org.id,
    },
  })

  // Activities for NAS Project (1 Core, 1 Supporting)
  const nasCore = await prisma.rdActivity.create({
    data: {
      rdProjectId: nasProject.id,
      name: "Hybrid NAS Algorithm Development",
      activityType: "Core",
      hypothesis: "Combining evolutionary mutation operators with differentiable relaxation of the architecture search space will yield novel architectures not discoverable by either method alone.",
      methodology: "1. Define a search space of candidate operations. 2. Implement evolutionary population with gradient-guided mutation. 3. Run search experiments with varying population sizes and mutation rates. 4. Evaluate discovered architectures against baselines.",
      technicalUncertainty: "Cannot predict whether gradient signals from the differentiable relaxation will provide meaningful guidance to the evolutionary operators, or whether the combined approach will converge.",
      newKnowledgeSought: "Understanding of gradient-evolution interaction dynamics in NAS.",
      status: "InProgress",
    },
  })

  const nasSupporting = await prisma.rdActivity.create({
    data: {
      rdProjectId: nasProject.id,
      name: "NAS Evaluation Infrastructure",
      activityType: "Supporting",
      hypothesis: null,
      methodology: "Build automated evaluation pipeline: architecture sampling, training, validation, metric collection. Create reproducible benchmarking framework.",
      status: "InProgress",
    },
  })

  // Activities for Energy Project (1 Core, 1 Supporting)
  const energyCore = await prisma.rdActivity.create({
    data: {
      rdProjectId: energyProject.id,
      name: "Transformer Demand Forecasting",
      activityType: "Core",
      hypothesis: "Custom sparse attention patterns that encode grid topology can achieve sub-3% MAPE on 24-hour demand forecasting, outperforming LSTM baselines.",
      methodology: "1. Collect and preprocess grid sensor data. 2. Design topology-aware attention masks. 3. Train transformer variants with different attention configurations. 4. Compare against LSTM and statistical baselines across multiple grid regions.",
      technicalUncertainty: "Sparse attention patterns have not been tested on grid topology data; unknown whether they can capture long-range spatial dependencies between grid nodes.",
      newKnowledgeSought: "Whether topology-encoded attention can model spatial-temporal dependencies in energy grids.",
      status: "InProgress",
    },
  })

  const energySupporting = await prisma.rdActivity.create({
    data: {
      rdProjectId: energyProject.id,
      name: "Grid Data Collection Pipeline",
      activityType: "Supporting",
      methodology: "Develop real-time data ingestion from smart meters and grid sensors. Build preprocessing pipeline with anomaly detection and missing data imputation.",
      status: "InProgress",
    },
  })

  // --- 5. Experiments (3) ---
  const expRunning = await prisma.experiment.create({
    data: {
      rdActivityId: nasCore.id,
      name: "Hybrid NAS v3 - Large Search Space",
      hypothesis: "Expanding the search space to include squeeze-excitation and attention operations will discover more efficient architectures than the restricted v2 space.",
      status: "Running",
      startDate: daysAgo(14),
      iterationNumber: 3,
      pipelineStageId: inProgressStage?.id,
    },
  })

  const expCompleted = await prisma.experiment.create({
    data: {
      rdActivityId: energyCore.id,
      name: "Sparse Attention Grid Forecasting - 6hr Horizon",
      hypothesis: "Topology-aware sparse attention achieves sub-5% MAPE on 6-hour demand forecasting for the Victorian grid region.",
      status: "Completed",
      startDate: daysAgo(45),
      endDate: daysAgo(20),
      outcome: "Achieved 4.2% MAPE on 6-hour horizon, exceeding target. Topology-aware attention reduced error by 18% vs dense attention baseline. Key finding: local grid topology connections account for 72% of attention weight.",
      iterationNumber: 2,
      pipelineStageId: completeStage?.id,
    },
  })

  const expPlanned = await prisma.experiment.create({
    data: {
      rdActivityId: energyCore.id,
      name: "Multi-Region Transfer Learning",
      hypothesis: "A model pre-trained on Victorian grid data can be fine-tuned for NSW grid with <500 samples while maintaining sub-5% MAPE.",
      status: "Planned",
      iterationNumber: 1,
      pipelineStageId: planningStage?.id,
    },
  })

  // --- 6. Time Entries (8) ---
  const timeEntries = [
    { rdActivityId: nasCore.id, date: daysAgo(3), hours: 6, description: "Implemented squeeze-excitation search operations for v3 experiment", hourlyRate: 175 },
    { rdActivityId: nasCore.id, date: daysAgo(7), hours: 4, description: "Analyzed v2 experiment results and designed v3 search space expansion", hourlyRate: 175 },
    { rdActivityId: nasSupporting.id, date: daysAgo(5), hours: 3, description: "Updated evaluation pipeline to support new operation types", hourlyRate: 150 },
    { rdActivityId: nasSupporting.id, date: daysAgo(10), hours: 2, description: "Fixed GPU memory profiling in benchmarking framework", hourlyRate: 150 },
    { rdActivityId: energyCore.id, date: daysAgo(2), hours: 5, description: "Implemented topology-aware attention masks for NSW grid region", hourlyRate: 180 },
    { rdActivityId: energyCore.id, date: daysAgo(8), hours: 4, description: "Ran ablation study on attention head configurations", hourlyRate: 180 },
    { rdActivityId: energySupporting.id, date: daysAgo(4), hours: 3, description: "Deployed anomaly detection module for smart meter data", hourlyRate: 120 },
    { rdActivityId: energySupporting.id, date: daysAgo(12), hours: 5, description: "Built data imputation pipeline for missing sensor readings", hourlyRate: 120 },
  ]

  for (const te of timeEntries) {
    await prisma.rdTimeEntry.create({
      data: {
        userId: adminUser.id,
        ...te,
      },
    })
  }

  // --- 7. Cloud Cost Entries (6) ---
  const cloudCosts = [
    { providerId: awsProvider.id, date: daysAgo(75), service: "EC2", description: "p4d.24xlarge GPU instances for NAS training", amount: 4850, projectId: nasProject.id, experimentId: null as string | null },
    { providerId: awsProvider.id, date: daysAgo(45), service: "EC2", description: "p4d.24xlarge GPU instances for grid forecasting", amount: 3200, projectId: energyProject.id, experimentId: expCompleted.id },
    { providerId: awsProvider.id, date: daysAgo(15), service: "S3", description: "Grid sensor data storage and retrieval", amount: 680, projectId: energyProject.id, experimentId: null as string | null },
    { providerId: awsProvider.id, date: daysAgo(10), service: "EC2", description: "p4d.24xlarge instances for NAS v3 experiment", amount: 5200, projectId: nasProject.id, experimentId: expRunning.id },
    { providerId: openaiProvider.id, date: daysAgo(30), service: "GPT-4 API", description: "Code generation assistance for experiment design", amount: 450, projectId: nasProject.id, experimentId: null as string | null },
    { providerId: openaiProvider.id, date: daysAgo(8), service: "GPT-4 API", description: "Experiment report summarization", amount: 320, projectId: energyProject.id, experimentId: expCompleted.id },
  ]

  for (const cc of cloudCosts) {
    await prisma.cloudCostEntry.create({ data: cc })
  }

  // --- 8. Bank Transactions (8) ---
  const bankTransactions = [
    { date: daysAgo(85), description: "TechCorp Solutions - INV-0001 Payment", amount: 45000, reference: "TFR-88291", reconciled: true },
    { date: daysAgo(70), description: "GreenEnergy Partners - INV-0002 Payment", amount: 78000, reference: "TFR-88445", reconciled: true },
    { date: daysAgo(60), description: "AWS Cloud Services - Dec 2025 Invoice", amount: -12000, reference: "DD-AWS-1225", reconciled: true },
    { date: daysAgo(45), description: "NVIDIA Computing - DGX Cloud", amount: -8000, reference: "DD-NV-0126", reconciled: true },
    { date: daysAgo(30), description: "Payroll - January 2026", amount: -42500, reference: "PAY-202601", reconciled: false },
    { date: daysAgo(15), description: "Office Supplies - Officeworks", amount: -1250, reference: "POS-8832", reconciled: false },
    { date: daysAgo(5), description: "Client deposit - DataFlow Analytics", amount: 16000, reference: "TFR-89102", reconciled: false },
    { date: daysAgo(2), description: "AWS Cloud Services - Jan 2026 Invoice", amount: -5000, reference: "DD-AWS-0126", reconciled: false },
  ]

  for (const bt of bankTransactions) {
    await prisma.bankTransaction.create({
      data: { ...bt, organizationId: org.id },
    })
  }

  // ============================================
  // PAYROLL MODULE: Seed Data
  // ============================================

  // Additional payroll-related accounts (only if not already present)
  const payrollAccounts = [
    { code: "2250", name: "Salary Sacrifice Liability", type: "Liability", subType: "Current Liability", taxType: "BAS-Excluded" },
    { code: "2350", name: "FBT Payable", type: "Liability", subType: "Current Liability", taxType: "BAS-Excluded" },
    { code: "2450", name: "Workers Comp Payable", type: "Liability", subType: "Current Liability", taxType: "BAS-Excluded" },
    { code: "8200", name: "Salary Sacrifice - Super", type: "Expense", subType: "Payroll", taxType: "BAS-Excluded" },
    { code: "8250", name: "Novated Lease Deductions", type: "Expense", subType: "Payroll", taxType: "BAS-Excluded" },
    { code: "8300", name: "FBT Expense", type: "Expense", subType: "Payroll", taxType: "BAS-Excluded" },
    { code: "8350", name: "Leave Entitlements", type: "Expense", subType: "Payroll", taxType: "BAS-Excluded" },
    { code: "8400", name: "Overtime", type: "Expense", subType: "Payroll", taxType: "BAS-Excluded" },
    { code: "8450", name: "Allowances", type: "Expense", subType: "Payroll", taxType: "BAS-Excluded" },
    { code: "8500", name: "Bonuses", type: "Expense", subType: "Payroll", taxType: "BAS-Excluded" },
  ]

  for (const acc of payrollAccounts) {
    const exists = await prisma.account.findFirst({ where: { code: acc.code, organizationId: org.id } })
    if (!exists) {
      await prisma.account.create({
        data: {
          ...acc,
          isSystemAccount: false,
          isRdEligible: false,
          organizationId: org.id,
        },
      })
    }
  }

  // --- Employees (4: full-time, full-time, part-time, contractor) ---
  const empSarah = await prisma.employee.create({
    data: {
      organizationId: org.id,
      userId: adminUser.id,
      firstName: "Sarah",
      lastName: "Chen",
      email: "sarah.chen@powerplantenergy.com.au",
      dateOfBirth: new Date("1990-03-15"),
      startDate: daysAgo(730),
      employmentType: "FullTime",
      taxFileNumber: "***-***-***",
      residencyStatus: "Resident",
      taxFreeThreshold: true,
      helpDebt: true,
      sfssDebt: false,
      medicareLevyExemption: "None",
      superFundName: "Australian Super",
      superMemberNumber: "MEM-1234567",
      superRate: 11.5,
      bankBSB: "062-000",
      bankAccountNumber: "****4321",
      bankAccountName: "Sarah Chen",
      annualSalary: 145000,
      payFrequency: "Monthly",
      leaveBalanceAnnual: 120,
      leaveBalanceSick: 80,
      leaveBalancePersonal: 16,
      notes: "Lead ML Engineer - R&D team lead",
      active: true,
    },
  })

  const empJames = await prisma.employee.create({
    data: {
      organizationId: org.id,
      firstName: "James",
      lastName: "Nguyen",
      email: "james.nguyen@powerplantenergy.com.au",
      dateOfBirth: new Date("1985-08-22"),
      startDate: daysAgo(365),
      employmentType: "FullTime",
      taxFileNumber: "***-***-***",
      residencyStatus: "Resident",
      taxFreeThreshold: true,
      helpDebt: false,
      sfssDebt: false,
      medicareLevyExemption: "None",
      superFundName: "REST Super",
      superMemberNumber: "MEM-7654321",
      superRate: 11.5,
      bankBSB: "033-000",
      bankAccountNumber: "****8765",
      bankAccountName: "James Nguyen",
      annualSalary: 125000,
      payFrequency: "Monthly",
      leaveBalanceAnnual: 80,
      leaveBalanceSick: 60,
      leaveBalancePersonal: 16,
      notes: "Senior Software Engineer - Energy platform",
      active: true,
    },
  })

  const empLisa = await prisma.employee.create({
    data: {
      organizationId: org.id,
      firstName: "Lisa",
      lastName: "Patel",
      email: "lisa.patel@powerplantenergy.com.au",
      dateOfBirth: new Date("1995-11-05"),
      startDate: daysAgo(180),
      employmentType: "PartTime",
      taxFileNumber: "***-***-***",
      residencyStatus: "Resident",
      taxFreeThreshold: true,
      helpDebt: true,
      sfssDebt: true,
      medicareLevyExemption: "None",
      superFundName: "Hostplus",
      superMemberNumber: "MEM-3456789",
      superRate: 11.5,
      bankBSB: "084-004",
      bankAccountNumber: "****2345",
      bankAccountName: "Lisa Patel",
      hourlyRate: 65,
      payFrequency: "Fortnightly",
      leaveBalanceAnnual: 40,
      leaveBalanceSick: 30,
      leaveBalancePersonal: 8,
      notes: "Part-time data analyst - 3 days per week",
      active: true,
    },
  })

  const empMike = await prisma.employee.create({
    data: {
      organizationId: org.id,
      firstName: "Mike",
      lastName: "Thompson",
      email: "mike.thompson@contractor.io",
      dateOfBirth: new Date("1982-06-30"),
      startDate: daysAgo(90),
      employmentType: "Contractor",
      taxFileNumber: "***-***-***",
      residencyStatus: "Resident",
      taxFreeThreshold: false,
      helpDebt: false,
      sfssDebt: false,
      medicareLevyExemption: "Full",
      superFundName: "Self Managed Super Fund",
      superMemberNumber: "SMSF-001",
      superRate: 11.5,
      bankBSB: "012-003",
      bankAccountNumber: "****9876",
      bankAccountName: "Thompson Consulting Pty Ltd",
      hourlyRate: 150,
      payFrequency: "Monthly",
      leaveBalanceAnnual: 0,
      leaveBalanceSick: 0,
      leaveBalancePersonal: 0,
      notes: "DevOps contractor - infrastructure automation",
      active: true,
    },
  })

  // --- Pay Run (1 completed) ---
  const payPeriodStart = new Date("2026-03-01")
  const payPeriodEnd = new Date("2026-03-31")
  const payDate = new Date("2026-03-31")

  // Calculate gross pays
  const sarahGross = 145000 / 12  // ~12083.33
  const jamesGross = 125000 / 12  // ~10416.67
  const lisaHours = 24 * (26 / 14) // ~44.57 hours in March (3 days/wk fortnightly approx)
  const lisaGross = 65 * 24 * 2  // 2 fortnights, 24 hrs each = 3120
  const mikeHours = 160
  const mikeGross = 150 * mikeHours  // 24000

  const sarahTax = 3547
  const jamesTax = 2812
  const lisaTax = 468
  const mikeTax = 7200

  const sarahSuper = Math.round(sarahGross * 0.115 * 100) / 100  // ~1389.58
  const jamesSuper = Math.round(jamesGross * 0.115 * 100) / 100  // ~1197.92
  const lisaSuper = Math.round(lisaGross * 0.115 * 100) / 100    // ~358.80
  const mikeSuper = Math.round(mikeGross * 0.115 * 100) / 100    // ~2760.00

  const sarahHelpRepayment = 604
  const lisaHelpRepayment = 47
  const lisaSfssRepayment = 23
  const sarahSalarySacrifice = 500

  const sarahNet = Math.round((sarahGross - sarahTax - sarahHelpRepayment - sarahSalarySacrifice) * 100) / 100
  const jamesNet = Math.round((jamesGross - jamesTax) * 100) / 100
  const lisaNet = Math.round((lisaGross - lisaTax - lisaHelpRepayment - lisaSfssRepayment) * 100) / 100
  const mikeNet = Math.round((mikeGross - mikeTax) * 100) / 100

  const totalGross = Math.round((sarahGross + jamesGross + lisaGross + mikeGross) * 100) / 100
  const totalTax = sarahTax + jamesTax + lisaTax + mikeTax
  const totalSuper = Math.round((sarahSuper + jamesSuper + lisaSuper + mikeSuper) * 100) / 100
  const totalNet = Math.round((sarahNet + jamesNet + lisaNet + mikeNet) * 100) / 100
  const totalDeductions = sarahHelpRepayment + lisaHelpRepayment + lisaSfssRepayment + sarahSalarySacrifice

  const payRun = await prisma.payRun.create({
    data: {
      organizationId: org.id,
      payPeriodStart,
      payPeriodEnd,
      payDate,
      status: "Completed",
      totalGross,
      totalTax,
      totalSuper,
      totalNet,
      totalDeductions,
      processedAt: payDate,
      processedById: adminUser.id,
      notes: "March 2026 payroll",
    },
  })

  // --- Payslips (4) ---
  // Sarah's payslip
  const payslipSarah = await prisma.payslip.create({
    data: {
      payRunId: payRun.id,
      employeeId: empSarah.id,
      organizationId: org.id,
      payPeriodStart,
      payPeriodEnd,
      payDate,
      hoursWorked: 160,
      hourlyRate: Math.round(sarahGross / 160 * 100) / 100,
      grossPay: Math.round(sarahGross * 100) / 100,
      overtimeHours: 0,
      overtimePay: 0,
      allowances: 0,
      bonuses: 0,
      taxWithheld: sarahTax,
      medicareLevyAmount: 242,
      helpRepayment: sarahHelpRepayment,
      sfssRepayment: 0,
      superContribution: sarahSuper,
      superSalarySacrifice: sarahSalarySacrifice,
      preTaxDeductions: sarahSalarySacrifice,
      postTaxDeductions: 0,
      netPay: sarahNet,
      yearToDateGross: Math.round(sarahGross * 9 * 100) / 100,
      yearToDateTax: sarahTax * 9,
      yearToDateSuper: Math.round(sarahSuper * 9 * 100) / 100,
      status: "Paid",
      earnings: {
        create: [
          { type: "Ordinary", description: "Base Salary", hours: 160, rate: Math.round(sarahGross / 160 * 100) / 100, amount: Math.round(sarahGross * 100) / 100 },
        ],
      },
      deductions: {
        create: [
          { type: "PreTax", category: "SalarySacrifice", description: "Salary sacrifice to super", amount: sarahSalarySacrifice },
        ],
      },
      leave: {
        create: [
          { type: "Annual", hoursAccrued: 12.67, hoursTaken: 0, balance: 120 },
          { type: "Sick", hoursAccrued: 6.33, hoursTaken: 0, balance: 80 },
          { type: "Personal", hoursAccrued: 1.33, hoursTaken: 0, balance: 16 },
        ],
      },
    },
  })

  // James's payslip
  const payslipJames = await prisma.payslip.create({
    data: {
      payRunId: payRun.id,
      employeeId: empJames.id,
      organizationId: org.id,
      payPeriodStart,
      payPeriodEnd,
      payDate,
      hoursWorked: 168,
      hourlyRate: Math.round(jamesGross / 160 * 100) / 100,
      grossPay: Math.round(jamesGross + 8 * (jamesGross / 160) * 1.5),
      overtimeHours: 8,
      overtimePay: Math.round(8 * (jamesGross / 160) * 1.5 * 100) / 100,
      allowances: 0,
      bonuses: 0,
      taxWithheld: jamesTax,
      medicareLevyAmount: 208,
      helpRepayment: 0,
      sfssRepayment: 0,
      superContribution: jamesSuper,
      superSalarySacrifice: 0,
      preTaxDeductions: 0,
      postTaxDeductions: 0,
      netPay: jamesNet,
      yearToDateGross: Math.round(jamesGross * 9 * 100) / 100,
      yearToDateTax: jamesTax * 9,
      yearToDateSuper: Math.round(jamesSuper * 9 * 100) / 100,
      status: "Paid",
      earnings: {
        create: [
          { type: "Ordinary", description: "Base Salary", hours: 160, rate: Math.round(jamesGross / 160 * 100) / 100, amount: Math.round(jamesGross * 100) / 100 },
          { type: "Overtime", description: "Overtime (1.5x)", hours: 8, rate: Math.round((jamesGross / 160) * 1.5 * 100) / 100, amount: Math.round(8 * (jamesGross / 160) * 1.5 * 100) / 100 },
        ],
      },
      leave: {
        create: [
          { type: "Annual", hoursAccrued: 12.67, hoursTaken: 0, balance: 80 },
          { type: "Sick", hoursAccrued: 6.33, hoursTaken: 0, balance: 60 },
        ],
      },
    },
  })

  // Lisa's payslip
  const payslipLisa = await prisma.payslip.create({
    data: {
      payRunId: payRun.id,
      employeeId: empLisa.id,
      organizationId: org.id,
      payPeriodStart,
      payPeriodEnd,
      payDate,
      hoursWorked: 48,
      hourlyRate: 65,
      grossPay: lisaGross,
      overtimeHours: 0,
      overtimePay: 0,
      allowances: 0,
      bonuses: 0,
      taxWithheld: lisaTax,
      medicareLevyAmount: 62,
      helpRepayment: lisaHelpRepayment,
      sfssRepayment: lisaSfssRepayment,
      superContribution: lisaSuper,
      superSalarySacrifice: 0,
      preTaxDeductions: 0,
      postTaxDeductions: 0,
      netPay: lisaNet,
      yearToDateGross: lisaGross * 6,
      yearToDateTax: lisaTax * 6,
      yearToDateSuper: Math.round(lisaSuper * 6 * 100) / 100,
      status: "Paid",
      earnings: {
        create: [
          { type: "Ordinary", description: "Hourly - Part Time", hours: 48, rate: 65, amount: lisaGross },
        ],
      },
      leave: {
        create: [
          { type: "Annual", hoursAccrued: 5.54, hoursTaken: 0, balance: 40 },
          { type: "Sick", hoursAccrued: 2.77, hoursTaken: 0, balance: 30 },
        ],
      },
    },
  })

  // Mike's payslip (contractor)
  const payslipMike = await prisma.payslip.create({
    data: {
      payRunId: payRun.id,
      employeeId: empMike.id,
      organizationId: org.id,
      payPeriodStart,
      payPeriodEnd,
      payDate,
      hoursWorked: mikeHours,
      hourlyRate: 150,
      grossPay: mikeGross,
      overtimeHours: 0,
      overtimePay: 0,
      allowances: 0,
      bonuses: 0,
      taxWithheld: mikeTax,
      medicareLevyAmount: 0,
      helpRepayment: 0,
      sfssRepayment: 0,
      superContribution: mikeSuper,
      superSalarySacrifice: 0,
      preTaxDeductions: 0,
      postTaxDeductions: 0,
      netPay: mikeNet,
      yearToDateGross: mikeGross * 3,
      yearToDateTax: mikeTax * 3,
      yearToDateSuper: Math.round(mikeSuper * 3 * 100) / 100,
      status: "Paid",
      earnings: {
        create: [
          { type: "Ordinary", description: "Contractor Hours", hours: mikeHours, rate: 150, amount: mikeGross },
        ],
      },
      leave: {
        create: [],
      },
    },
  })

  // --- Tax Minimisation Strategies (2) ---
  await prisma.taxMinimisationStrategy.create({
    data: {
      organizationId: org.id,
      category: "SalarySacrifice",
      title: "Salary Sacrifice to Superannuation",
      description: "Employees can sacrifice up to $30,000 total (including employer SG contributions) into superannuation at the concessional 15% tax rate instead of their marginal rate. For employees earning over $120,000, this can save between $5,000-$12,000 per year in personal tax. The employer also saves on payroll tax for the sacrificed amount.",
      estimatedSaving: 18500,
      implemented: true,
      implementedDate: daysAgo(365),
      applicableTo: "Individual",
      priority: "High",
      notes: "Currently active for Sarah Chen ($500/month). James Nguyen has been advised but not yet opted in. Review concessional cap annually.",
    },
  })

  await prisma.taxMinimisationStrategy.create({
    data: {
      organizationId: org.id,
      category: "NovatedLease",
      title: "Novated Lease - Electric Vehicle FBT Exemption",
      description: "Under the Electric Car Discount legislation, electric vehicles under the luxury car tax threshold for fuel-efficient vehicles ($91,387 for 2025-26) are exempt from FBT. A novated lease on an eligible EV allows employees to pay for the vehicle and running costs from pre-tax income with zero FBT, providing significant savings compared to purchasing outright or leasing a non-exempt vehicle.",
      estimatedSaving: 12000,
      implemented: false,
      applicableTo: "Individual",
      priority: "High",
      notes: "James Nguyen has expressed interest in a Tesla Model 3 (~$65,000). Estimated annual benefit: $12,000+ in combined tax and GST savings. Need to set up novated lease agreement with fleet provider.",
    },
  })

  // ============================================
  // FIXED ASSETS, APPROVALS, EXCHANGE RATES
  // ============================================

  // Additional accounts for fixed assets and FX
  const assetAccounts = [
    { code: "1330", name: "Motor Vehicles at Cost", type: "Asset", subType: "Fixed Asset", taxType: "GST" },
    { code: "1340", name: "Software at Cost", type: "Asset", subType: "Fixed Asset", taxType: "GST" },
    { code: "1410", name: "Accumulated Depreciation - Vehicles", type: "Asset", subType: "Fixed Asset", taxType: "BAS-Excluded" },
    { code: "1420", name: "Accumulated Depreciation - Software", type: "Asset", subType: "Fixed Asset", taxType: "BAS-Excluded" },
    { code: "1430", name: "Accumulated Depreciation - Computers", type: "Asset", subType: "Fixed Asset", taxType: "BAS-Excluded" },
    { code: "1440", name: "Accumulated Depreciation - Lab Equipment", type: "Asset", subType: "Fixed Asset", taxType: "BAS-Excluded" },
    { code: "6155", name: "Depreciation - Vehicles", type: "Expense", subType: "Operating Expense", taxType: "BAS-Excluded" },
    { code: "6160", name: "Depreciation - Software", type: "Expense", subType: "Operating Expense", taxType: "BAS-Excluded" },
    { code: "6165", name: "Depreciation - Computers", type: "Expense", subType: "Operating Expense", taxType: "BAS-Excluded" },
    { code: "6170", name: "Depreciation - Lab Equipment", type: "Expense", subType: "Operating Expense", taxType: "BAS-Excluded", isRdEligible: true },
    { code: "4600", name: "FX Gains", type: "Revenue", subType: "Other Revenue", taxType: "BAS-Excluded" },
    { code: "6700", name: "FX Losses", type: "Expense", subType: "Operating Expense", taxType: "BAS-Excluded" },
    { code: "4700", name: "Gain on Disposal of Assets", type: "Revenue", subType: "Other Revenue", taxType: "BAS-Excluded" },
    { code: "6750", name: "Loss on Disposal of Assets", type: "Expense", subType: "Operating Expense", taxType: "BAS-Excluded" },
  ]

  const createdAssetAccounts: Record<string, string> = {}
  for (const acc of assetAccounts) {
    const exists = await prisma.account.findFirst({ where: { code: acc.code, organizationId: org.id } })
    if (!exists) {
      const created = await prisma.account.create({
        data: {
          ...acc,
          isSystemAccount: false,
          isRdEligible: (acc as { isRdEligible?: boolean }).isRdEligible || false,
          organizationId: org.id,
        },
      })
      createdAssetAccounts[acc.code] = created.id
    } else {
      createdAssetAccounts[acc.code] = exists.id
    }
  }

  // Look up existing accounts we need
  const computerEquipmentAccount = await prisma.account.findFirst({ where: { code: "1310", organizationId: org.id } })
  const labEquipmentAccount = await prisma.account.findFirst({ where: { code: "1320", organizationId: org.id } })
  const accumulatedDepAccount = await prisma.account.findFirst({ where: { code: "1400", organizationId: org.id } })
  const depreciationExpenseAccount = await prisma.account.findFirst({ where: { code: "6150", organizationId: org.id } })

  // --- Fixed Assets (5) ---

  // Asset 1: MacBook Pro (Computer)
  const assetMacBook = await prisma.fixedAsset.create({
    data: {
      organizationId: org.id,
      assetNumber: "FA-001",
      name: "MacBook Pro 16\" M3 Max",
      description: "Developer workstation for ML engineering",
      category: "Computer",
      purchaseDate: new Date("2025-07-15"),
      purchasePrice: 6499,
      residualValue: 500,
      usefulLifeYears: 4,
      depreciationMethod: "DiminishingValue",
      accountId: computerEquipmentAccount!.id,
      depreciationAccountId: createdAssetAccounts["6165"],
      accumulatedDepreciationAccountId: createdAssetAccounts["1430"],
      currentBookValue: 4459.94,
      status: "Active",
      location: "Sydney Office - Desk 12",
      serialNumber: "C02ZT1ABCD01",
      supplier: "Apple Store Sydney",
      warrantyExpiry: new Date("2028-07-15"),
      isRdAsset: false,
      notes: "Primary development machine for Sarah Chen",
    },
  })

  // Asset 2: Dell Precision Workstation (Computer)
  const assetDell = await prisma.fixedAsset.create({
    data: {
      organizationId: org.id,
      assetNumber: "FA-002",
      name: "Dell Precision 7875 Tower",
      description: "High-performance workstation with NVIDIA RTX 6000",
      category: "Computer",
      purchaseDate: new Date("2025-09-01"),
      purchasePrice: 12500,
      residualValue: 800,
      usefulLifeYears: 4,
      depreciationMethod: "DiminishingValue",
      accountId: computerEquipmentAccount!.id,
      depreciationAccountId: createdAssetAccounts["6165"],
      accumulatedDepreciationAccountId: createdAssetAccounts["1430"],
      currentBookValue: 9234.38,
      status: "Active",
      location: "Sydney Office - Server Room",
      serialNumber: "DPR-7875-X9K2",
      supplier: "Dell Technologies Australia",
      warrantyExpiry: new Date("2028-09-01"),
      isRdAsset: true,
      notes: "Used for local ML model training and experiments",
    },
  })

  // Asset 3: Toyota HiLux (Vehicle)
  const assetVehicle = await prisma.fixedAsset.create({
    data: {
      organizationId: org.id,
      assetNumber: "FA-003",
      name: "Toyota HiLux SR5 4x4",
      description: "Company vehicle for site visits and equipment transport",
      category: "Vehicle",
      purchaseDate: new Date("2025-03-10"),
      purchasePrice: 62000,
      residualValue: 25000,
      usefulLifeYears: 8,
      depreciationMethod: "StraightLine",
      accountId: createdAssetAccounts["1330"],
      depreciationAccountId: createdAssetAccounts["6155"],
      accumulatedDepreciationAccountId: createdAssetAccounts["1410"],
      currentBookValue: 57375,
      status: "Active",
      location: "Sydney Office - Basement Parking",
      serialNumber: "VIN-JTFDA21R350123456",
      supplier: "Sydney City Toyota",
      warrantyExpiry: new Date("2030-03-10"),
      isRdAsset: false,
      notes: "Novated lease arrangement under consideration",
    },
  })

  // Asset 4: JIRA & Confluence Perpetual License (Software)
  const assetSoftware = await prisma.fixedAsset.create({
    data: {
      organizationId: org.id,
      assetNumber: "FA-004",
      name: "Atlassian Data Center License",
      description: "Perpetual license for JIRA and Confluence Data Center",
      category: "Software",
      purchaseDate: new Date("2025-06-01"),
      purchasePrice: 18000,
      residualValue: 0,
      usefulLifeYears: 3,
      depreciationMethod: "StraightLine",
      accountId: createdAssetAccounts["1340"],
      depreciationAccountId: createdAssetAccounts["6160"],
      accumulatedDepreciationAccountId: createdAssetAccounts["1420"],
      currentBookValue: 13000,
      status: "Active",
      location: "Cloud / On-Premise",
      supplier: "Atlassian Pty Ltd",
      isRdAsset: false,
      notes: "Used across all teams for project management and documentation",
    },
  })

  // Asset 5: Lab Equipment - Spectral Analyzer (linked to R&D project)
  // Get the NAS project for linking
  const nasProjectForAsset = await prisma.rdProject.findFirst({
    where: { organizationId: org.id, name: { contains: "Neural Architecture" } },
  })

  const assetLabEquipment = await prisma.fixedAsset.create({
    data: {
      organizationId: org.id,
      assetNumber: "FA-005",
      name: "Keysight N9040B Signal Analyzer",
      description: "UXA signal analyzer for IoT sensor calibration and energy grid signal analysis",
      category: "Equipment",
      purchaseDate: new Date("2025-08-20"),
      purchasePrice: 45000,
      residualValue: 5000,
      usefulLifeYears: 10,
      depreciationMethod: "StraightLine",
      accountId: labEquipmentAccount!.id,
      depreciationAccountId: createdAssetAccounts["6170"],
      accumulatedDepreciationAccountId: createdAssetAccounts["1440"],
      currentBookValue: 42666.67,
      status: "Active",
      location: "Sydney Office - R&D Lab",
      serialNumber: "MY-N9040B-00234",
      supplier: "Keysight Technologies Australia",
      warrantyExpiry: new Date("2028-08-20"),
      isRdAsset: true,
      rdProjectId: nasProjectForAsset?.id || null,
      notes: "Primary R&D equipment - 100% R&D eligible. Used for energy grid sensor signal analysis.",
    },
  })

  // --- Depreciation Schedules for current FY (Jul 2025 - Jun 2026) ---
  // Generate monthly schedules for each asset from Jul 2025 to Mar 2026

  const fyMonths: Array<{ start: Date; end: Date }> = []
  for (let m = 6; m <= 14; m++) { // Jul 2025 (month 6) to Mar 2026 (month 14 = 2+12)
    const year = m < 12 ? 2025 : 2026
    const month = m % 12
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0) // Last day of month
    fyMonths.push({ start, end })
  }

  // Helper: straight-line monthly dep
  const slMonthly = (cost: number, residual: number, years: number) =>
    Math.round(((cost - residual) / years / 12) * 100) / 100

  // Helper: diminishing value monthly dep
  const dvMonthly = (bookValue: number, years: number) =>
    Math.round((bookValue * (2 / years) / 12) * 100) / 100

  // MacBook Pro - purchased Jul 15 2025, DV method
  let macBookBV = 6499
  for (const period of fyMonths) {
    if (period.start < new Date("2025-07-01")) continue
    const isFirstMonth = period.start.getFullYear() === 2025 && period.start.getMonth() === 6
    const fraction = isFirstMonth ? 17 / 31 : 1 // Jul 15 -> Jul 31 = 17 days
    const dep = Math.round(dvMonthly(macBookBV, 4) * fraction * 100) / 100
    const prevAccum = 6499 - macBookBV
    await prisma.depreciationSchedule.create({
      data: {
        fixedAssetId: assetMacBook.id,
        periodStart: period.start,
        periodEnd: period.end,
        openingValue: Math.round(macBookBV * 100) / 100,
        depreciationAmount: dep,
        accumulatedDepreciation: Math.round((prevAccum + dep) * 100) / 100,
        closingValue: Math.round((macBookBV - dep) * 100) / 100,
        status: "Scheduled",
      },
    })
    macBookBV -= dep
  }

  // Dell Precision - purchased Sep 1 2025, DV method
  let dellBV = 12500
  for (const period of fyMonths) {
    if (period.start < new Date("2025-09-01")) continue
    const dep = dvMonthly(dellBV, 4)
    const prevAccum = 12500 - dellBV
    await prisma.depreciationSchedule.create({
      data: {
        fixedAssetId: assetDell.id,
        periodStart: period.start,
        periodEnd: period.end,
        openingValue: Math.round(dellBV * 100) / 100,
        depreciationAmount: dep,
        accumulatedDepreciation: Math.round((prevAccum + dep) * 100) / 100,
        closingValue: Math.round((dellBV - dep) * 100) / 100,
        status: "Scheduled",
      },
    })
    dellBV -= dep
  }

  // Toyota HiLux - purchased Mar 10 2025, SL method
  let vehicleBV = 62000
  const vehicleMonthlyDep = slMonthly(62000, 25000, 8)
  // Vehicle starts depreciating before FY (March 2025), calculate opening BV
  // Mar 2025 (pro-rata ~22/31 days), Apr, May, Jun = 3.71 months
  const vehiclePreFYDep = Math.round((vehicleMonthlyDep * (22 / 31) + vehicleMonthlyDep * 3) * 100) / 100
  vehicleBV = Math.round((62000 - vehiclePreFYDep) * 100) / 100

  for (const period of fyMonths) {
    const dep = vehicleMonthlyDep
    const prevAccum = 62000 - vehicleBV
    await prisma.depreciationSchedule.create({
      data: {
        fixedAssetId: assetVehicle.id,
        periodStart: period.start,
        periodEnd: period.end,
        openingValue: Math.round(vehicleBV * 100) / 100,
        depreciationAmount: dep,
        accumulatedDepreciation: Math.round((prevAccum + dep) * 100) / 100,
        closingValue: Math.round((vehicleBV - dep) * 100) / 100,
        status: "Scheduled",
      },
    })
    vehicleBV -= dep
  }

  // Atlassian License - purchased Jun 1 2025, SL method
  let softwareBV = 18000
  const softwareMonthlyDep = slMonthly(18000, 0, 3)
  // Pre-FY: 1 month (Jun 2025)
  softwareBV = Math.round((18000 - softwareMonthlyDep) * 100) / 100

  for (const period of fyMonths) {
    const dep = softwareMonthlyDep
    const prevAccum = 18000 - softwareBV
    await prisma.depreciationSchedule.create({
      data: {
        fixedAssetId: assetSoftware.id,
        periodStart: period.start,
        periodEnd: period.end,
        openingValue: Math.round(softwareBV * 100) / 100,
        depreciationAmount: dep,
        accumulatedDepreciation: Math.round((prevAccum + dep) * 100) / 100,
        closingValue: Math.round((softwareBV - dep) * 100) / 100,
        status: "Scheduled",
      },
    })
    softwareBV -= dep
  }

  // Signal Analyzer - purchased Aug 20 2025, SL method
  let labBV = 45000
  const labMonthlyDep = slMonthly(45000, 5000, 10)
  for (const period of fyMonths) {
    if (period.start < new Date("2025-08-01")) continue
    const isFirstMonth = period.start.getFullYear() === 2025 && period.start.getMonth() === 7
    const fraction = isFirstMonth ? 12 / 31 : 1 // Aug 20 -> Aug 31 = 12 days
    const dep = Math.round(labMonthlyDep * fraction * 100) / 100
    const prevAccum = 45000 - labBV
    await prisma.depreciationSchedule.create({
      data: {
        fixedAssetId: assetLabEquipment.id,
        periodStart: period.start,
        periodEnd: period.end,
        openingValue: Math.round(labBV * 100) / 100,
        depreciationAmount: dep,
        accumulatedDepreciation: Math.round((prevAccum + dep) * 100) / 100,
        closingValue: Math.round((labBV - dep) * 100) / 100,
        status: "Scheduled",
      },
    })
    labBV -= dep
  }

  // --- Approval Workflows (2) ---

  // Workflow 1: Bills over $5,000 need manager approval
  const billWorkflow = await prisma.approvalWorkflow.create({
    data: {
      organizationId: org.id,
      name: "Bill Approval - Manager Sign-off",
      entityType: "Bill",
      minAmount: 5000,
      maxAmount: null,
      requiredApprovers: 1,
      autoApproveBelow: 5000,
      active: true,
      steps: {
        create: [
          {
            stepOrder: 1,
            approverId: adminUser.id,
            role: "Approver",
            canDelegate: true,
          },
        ],
      },
    },
  })

  // Workflow 2: Expenses over $1,000 need approval
  const expenseWorkflow = await prisma.approvalWorkflow.create({
    data: {
      organizationId: org.id,
      name: "Expense Claim Approval",
      entityType: "Expense",
      minAmount: 1000,
      maxAmount: null,
      requiredApprovers: 1,
      autoApproveBelow: 1000,
      active: true,
      steps: {
        create: [
          {
            stepOrder: 1,
            approverId: adminUser.id,
            role: "Approver",
            canDelegate: false,
          },
        ],
      },
    },
  })

  // --- Exchange Rates (USD, GBP, EUR, NZD against AUD) ---
  const exchangeRateDates = [
    new Date("2025-07-01"),
    new Date("2025-10-01"),
    new Date("2026-01-01"),
    new Date("2026-03-01"),
  ]

  const fxRates = [
    // USD/AUD rates across quarters
    { from: "USD", to: "AUD", rates: [1.53, 1.55, 1.57, 1.54] },
    // GBP/AUD rates
    { from: "GBP", to: "AUD", rates: [1.92, 1.95, 1.97, 1.94] },
    // EUR/AUD rates
    { from: "EUR", to: "AUD", rates: [1.67, 1.69, 1.71, 1.68] },
    // NZD/AUD rates
    { from: "NZD", to: "AUD", rates: [0.92, 0.93, 0.91, 0.92] },
  ]

  for (const pair of fxRates) {
    for (let i = 0; i < exchangeRateDates.length; i++) {
      await prisma.exchangeRate.create({
        data: {
          organizationId: org.id,
          fromCurrency: pair.from,
          toCurrency: pair.to,
          rate: pair.rates[i],
          effectiveDate: exchangeRateDates[i],
          source: "Manual",
        },
      })
    }
  }

  // ============================================
  // INVENTORY: Items & Movements
  // ============================================

  const inventoryAcct = await accountByCode("1200") // Inventory asset account
  const cogsAcct = await accountByCode("5000") // Cost of Goods Sold

  const gstTaxRate = await prisma.taxRate.findFirst({
    where: { organizationId: org.id, taxType: "GST", isDefault: true },
  })

  const inventoryItems = [
    { sku: "OFF-001", name: "A4 Copy Paper (Ream)", category: "Office Supplies", unitOfMeasure: "ream", costPrice: 5.50, sellingPrice: 8.00, quantityOnHand: 200, reorderLevel: 50, reorderQuantity: 100, location: "Storeroom A" },
    { sku: "OFF-002", name: "Ballpoint Pens (Box of 12)", category: "Office Supplies", unitOfMeasure: "box", costPrice: 3.20, sellingPrice: 6.00, quantityOnHand: 80, reorderLevel: 20, reorderQuantity: 50, location: "Storeroom A" },
    { sku: "TECH-001", name: "USB-C Hub Docking Station", category: "Tech Equipment", unitOfMeasure: "each", costPrice: 89.00, sellingPrice: 149.00, quantityOnHand: 15, reorderLevel: 5, reorderQuantity: 10, location: "IT Cupboard" },
    { sku: "TECH-002", name: "Wireless Mouse", category: "Tech Equipment", unitOfMeasure: "each", costPrice: 25.00, sellingPrice: 45.00, quantityOnHand: 30, reorderLevel: 10, reorderQuantity: 20, location: "IT Cupboard" },
    { sku: "TECH-003", name: "27\" Monitor", category: "Tech Equipment", unitOfMeasure: "each", costPrice: 380.00, sellingPrice: 599.00, quantityOnHand: 8, reorderLevel: 3, reorderQuantity: 5, location: "Warehouse B" },
    { sku: "LAB-001", name: "Thermal Paste Compound (Tube)", category: "Lab Materials", unitOfMeasure: "tube", costPrice: 12.50, sellingPrice: 22.00, quantityOnHand: 45, reorderLevel: 15, reorderQuantity: 30, location: "Lab Storage" },
    { sku: "LAB-002", name: "Circuit Board Prototype Kit", category: "Lab Materials", unitOfMeasure: "kit", costPrice: 65.00, sellingPrice: 120.00, quantityOnHand: 12, reorderLevel: 5, reorderQuantity: 10, location: "Lab Storage" },
    { sku: "LAB-003", name: "Anti-static Wrist Strap", category: "Lab Materials", unitOfMeasure: "each", costPrice: 8.00, sellingPrice: 15.00, quantityOnHand: 3, reorderLevel: 10, reorderQuantity: 20, location: "Lab Storage" },
  ]

  const createdItems: Record<string, string> = {}
  for (const item of inventoryItems) {
    const created = await prisma.inventoryItem.create({
      data: {
        organizationId: org.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        unitOfMeasure: item.unitOfMeasure,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        quantityOnHand: item.quantityOnHand,
        reorderLevel: item.reorderLevel,
        reorderQuantity: item.reorderQuantity,
        isTracked: true,
        isActive: true,
        location: item.location,
        accountId: inventoryAcct.id,
        cogsAccountId: cogsAcct.id,
        revenueAccountId: salesRevenueAcct.id,
        taxRateId: gstTaxRate?.id,
        supplierId: nvidia.id,
      },
    })
    createdItems[item.sku] = created.id
  }

  // Inventory movements
  const movements = [
    { sku: "OFF-001", type: "Purchase", quantity: 200, unitCost: 5.50, ref: "PO-001", refType: "Bill" },
    { sku: "OFF-001", type: "Sale", quantity: -25, unitCost: 5.50, ref: "INV-0003", refType: "Invoice" },
    { sku: "TECH-001", type: "Purchase", quantity: 20, unitCost: 89.00, ref: "PO-002", refType: "Bill" },
    { sku: "TECH-001", type: "Sale", quantity: -5, unitCost: 89.00, ref: "INV-0004", refType: "Invoice" },
    { sku: "TECH-003", type: "Purchase", quantity: 10, unitCost: 380.00, ref: "PO-003", refType: "Bill" },
    { sku: "TECH-003", type: "Sale", quantity: -2, unitCost: 380.00, ref: "INV-0005", refType: "Invoice" },
    { sku: "LAB-001", type: "Purchase", quantity: 50, unitCost: 12.50, ref: "PO-004", refType: "Bill" },
    { sku: "LAB-001", type: "Adjustment", quantity: -5, unitCost: 12.50, ref: "ADJ-001", refType: "Manual", notes: "Expired stock write-off" },
    { sku: "LAB-002", type: "Purchase", quantity: 15, unitCost: 65.00, ref: "PO-005", refType: "Bill" },
    { sku: "LAB-002", type: "Sale", quantity: -3, unitCost: 65.00, ref: "INV-0006", refType: "Invoice" },
    { sku: "LAB-003", type: "Purchase", quantity: 25, unitCost: 8.00, ref: "PO-006", refType: "Bill" },
    { sku: "LAB-003", type: "WriteOff", quantity: -2, unitCost: 8.00, ref: "WO-001", refType: "Manual", notes: "Damaged units" },
  ]

  for (const m of movements) {
    await prisma.inventoryMovement.create({
      data: {
        organizationId: org.id,
        inventoryItemId: createdItems[m.sku],
        type: m.type,
        quantity: m.quantity,
        unitCost: m.unitCost,
        totalCost: m.quantity * m.unitCost,
        reference: m.ref,
        referenceType: m.refType,
        date: daysAgo(Math.floor(Math.random() * 60) + 10),
        notes: (m as { notes?: string }).notes,
      },
    })
  }

  // ============================================
  // PROJECTS: 3 projects with tasks and time entries
  // ============================================

  // Project 1: Client fixed-price project
  const project1 = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: "TechCorp AI Platform",
      code: "PRJ-001",
      description: "Fixed-price AI platform development for TechCorp Solutions",
      clientId: techCorp.id,
      status: "Active",
      startDate: daysAgo(120),
      endDate: daysAgo(-60),
      budgetAmount: 95000,
      budgetHours: 400,
      estimatedRevenue: 120000,
      projectType: "FixedPrice",
      billingMethod: "Milestone",
      managerId: adminUser.id,
      notes: "Phase 2 of the AI consulting engagement",
    },
  })

  // Project 2: T&M project
  const project2 = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: "Green Energy Dashboard",
      code: "PRJ-002",
      description: "Time and materials dashboard development for Green Energy Co",
      clientId: greenEnergy.id,
      status: "Active",
      startDate: daysAgo(90),
      budgetAmount: 60000,
      budgetHours: 250,
      estimatedRevenue: 75000,
      projectType: "TimeAndMaterials",
      billingMethod: "Hourly",
      hourlyRate: 280,
      managerId: adminUser.id,
    },
  })

  // Project 3: Internal R&D project linked to existing RdProject
  const project3 = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: "Neural Architecture Search - Internal",
      code: "PRJ-RD01",
      description: "Internal R&D project tracking for NAS research aligned with R&D tax incentive claim",
      status: "Active",
      startDate: daysAgo(150),
      budgetAmount: 150000,
      budgetHours: 800,
      projectType: "RD",
      billingMethod: "NonBillable",
      managerId: adminUser.id,
      isRdProject: true,
      rdProjectId: nasProject.id,
      notes: "Linked to R&D Tax Incentive project for NAS research",
    },
  })

  // Tasks for project 1
  const task1_1 = await prisma.projectTask.create({
    data: {
      projectId: project1.id,
      name: "Requirements Analysis",
      description: "Gather and document detailed requirements",
      assigneeId: adminUser.id,
      status: "Done",
      estimatedHours: 40,
      budgetAmount: 12000,
      startDate: daysAgo(120),
      dueDate: daysAgo(100),
      completedDate: daysAgo(102),
      sortOrder: 1,
    },
  })

  const task1_2 = await prisma.projectTask.create({
    data: {
      projectId: project1.id,
      name: "Architecture Design",
      description: "Design system architecture and data models",
      assigneeId: adminUser.id,
      status: "Done",
      estimatedHours: 60,
      budgetAmount: 18000,
      startDate: daysAgo(100),
      dueDate: daysAgo(75),
      completedDate: daysAgo(78),
      sortOrder: 2,
    },
  })

  const task1_3 = await prisma.projectTask.create({
    data: {
      projectId: project1.id,
      name: "Core Development",
      description: "Build core AI processing pipeline",
      assigneeId: adminUser.id,
      status: "InProgress",
      estimatedHours: 200,
      budgetAmount: 45000,
      startDate: daysAgo(75),
      dueDate: daysAgo(-10),
      sortOrder: 3,
    },
  })

  const task1_4 = await prisma.projectTask.create({
    data: {
      projectId: project1.id,
      name: "Testing & QA",
      description: "End-to-end testing and quality assurance",
      assigneeId: adminUser.id,
      status: "Todo",
      estimatedHours: 80,
      budgetAmount: 16000,
      startDate: daysAgo(-10),
      dueDate: daysAgo(-40),
      sortOrder: 4,
    },
  })

  // Tasks for project 2
  const task2_1 = await prisma.projectTask.create({
    data: {
      projectId: project2.id,
      name: "Dashboard UI Design",
      assigneeId: adminUser.id,
      status: "Done",
      estimatedHours: 30,
      startDate: daysAgo(90),
      dueDate: daysAgo(75),
      completedDate: daysAgo(76),
      sortOrder: 1,
    },
  })

  const task2_2 = await prisma.projectTask.create({
    data: {
      projectId: project2.id,
      name: "API Integration",
      assigneeId: adminUser.id,
      status: "InProgress",
      estimatedHours: 60,
      startDate: daysAgo(75),
      dueDate: daysAgo(-5),
      sortOrder: 2,
    },
  })

  // Tasks for project 3 (R&D)
  const task3_1 = await prisma.projectTask.create({
    data: {
      projectId: project3.id,
      name: "Literature Review & Hypothesis Formation",
      assigneeId: adminUser.id,
      status: "Done",
      estimatedHours: 80,
      startDate: daysAgo(150),
      dueDate: daysAgo(120),
      completedDate: daysAgo(122),
      sortOrder: 1,
    },
  })

  const task3_2 = await prisma.projectTask.create({
    data: {
      projectId: project3.id,
      name: "Experimental Architecture Prototyping",
      assigneeId: adminUser.id,
      status: "InProgress",
      estimatedHours: 200,
      startDate: daysAgo(120),
      dueDate: daysAgo(-30),
      sortOrder: 2,
    },
  })

  // Time entries for project 1
  const timeEntryData = [
    { projectId: project1.id, taskId: task1_1.id, hours: 38, date: daysAgo(105), desc: "Requirements workshops and documentation", billable: true, billed: true, rate: 350, invoiceId: inv1.id },
    { projectId: project1.id, taskId: task1_2.id, hours: 55, date: daysAgo(85), desc: "System architecture and technical design", billable: true, billed: true, rate: 350, invoiceId: inv1.id },
    { projectId: project1.id, taskId: task1_3.id, hours: 120, date: daysAgo(40), desc: "Core pipeline development - sprint 1-3", billable: true, billed: false, rate: 350 },
    { projectId: project1.id, taskId: task1_3.id, hours: 45, date: daysAgo(15), desc: "Core pipeline development - sprint 4", billable: true, billed: false, rate: 350 },
    // Project 2 entries
    { projectId: project2.id, taskId: task2_1.id, hours: 28, date: daysAgo(80), desc: "Dashboard mockups and Figma designs", billable: true, billed: true, rate: 280, invoiceId: inv2.id },
    { projectId: project2.id, taskId: task2_2.id, hours: 42, date: daysAgo(50), desc: "REST API integration for energy feeds", billable: true, billed: false, rate: 280 },
    { projectId: project2.id, taskId: task2_2.id, hours: 18, date: daysAgo(20), desc: "WebSocket real-time data streaming", billable: true, billed: false, rate: 280 },
    // Project 3 (R&D, non-billable)
    { projectId: project3.id, taskId: task3_1.id, hours: 75, date: daysAgo(130), desc: "Literature review of NAS techniques", billable: false, billed: false, rate: 0 },
    { projectId: project3.id, taskId: task3_2.id, hours: 160, date: daysAgo(60), desc: "Evolutionary architecture search experiments", billable: false, billed: false, rate: 0 },
    { projectId: project3.id, taskId: task3_2.id, hours: 85, date: daysAgo(20), desc: "Differentiable NAS prototyping", billable: false, billed: false, rate: 0 },
  ]

  for (const te of timeEntryData) {
    await prisma.timeEntry.create({
      data: {
        organizationId: org.id,
        projectId: te.projectId,
        taskId: te.taskId,
        userId: adminUser.id,
        date: te.date,
        hours: te.hours,
        description: te.desc,
        billable: te.billable,
        billed: te.billed,
        invoiceId: (te as { invoiceId?: string }).invoiceId,
        hourlyRate: te.rate,
        amount: te.hours * te.rate,
        approvalStatus: "Approved",
        approvedById: adminUser.id,
      },
    })
  }

  // Project expenses
  const projectExpenses = [
    { projectId: project1.id, desc: "Cloud hosting for dev environment", amount: 450, date: daysAgo(60), category: "Infrastructure", billable: true, billed: false },
    { projectId: project1.id, desc: "AI model training compute (GPU)", amount: 2200, date: daysAgo(35), category: "Compute", billable: true, billed: false },
    { projectId: project2.id, desc: "Third-party energy data API subscription", amount: 180, date: daysAgo(70), category: "Software", billable: true, billed: false },
    { projectId: project3.id, desc: "NAS experiment GPU compute (A100 cluster)", amount: 8500, date: daysAgo(45), category: "Compute", billable: false, billed: false },
    { projectId: project3.id, desc: "Research paper access and datasets", amount: 320, date: daysAgo(100), category: "Research", billable: false, billed: false },
  ]

  for (const pe of projectExpenses) {
    await prisma.projectExpense.create({
      data: {
        organizationId: org.id,
        projectId: pe.projectId,
        description: pe.desc,
        amount: pe.amount,
        date: pe.date,
        category: pe.category,
        billable: pe.billable,
        billed: pe.billed,
        approvalStatus: "Approved",
        approvedById: adminUser.id,
      },
    })
  }

  // Project milestones (2 for the fixed-price project)
  await prisma.projectMilestone.create({
    data: {
      projectId: project1.id,
      name: "Phase 1 - Requirements & Design Complete",
      description: "Delivery of requirements document and architectural design",
      amount: 45000,
      dueDate: daysAgo(75),
      status: "Paid",
      invoiceId: inv1.id,
    },
  })

  await prisma.projectMilestone.create({
    data: {
      projectId: project1.id,
      name: "Phase 2 - Core Platform Delivery",
      description: "Working AI pipeline with testing and documentation",
      amount: 75000,
      dueDate: daysAgo(-60),
      status: "Pending",
    },
  })

  // ============================================
  // DOCUMENTS: 5 sample documents (metadata only)
  // ============================================

  const documents = [
    { name: "TechCorp SOW", fileName: "techcorp-sow-v2.pdf", fileSize: 245760, mimeType: "application/pdf", entityType: "Project", entityId: project1.id, description: "Statement of Work for AI Platform project", tags: "contract,sow,techcorp" },
    { name: "Invoice INV-0001 PDF", fileName: "INV-0001.pdf", fileSize: 102400, mimeType: "application/pdf", entityType: "Invoice", entityId: inv1.id, description: "Generated invoice PDF for TechCorp Phase 1", tags: "invoice,techcorp" },
    { name: "NAS Research Summary", fileName: "nas-research-summary-q4.docx", fileSize: 512000, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", entityType: "Project", entityId: project3.id, description: "Quarterly research summary for NAS project", tags: "research,rd,nas" },
    { name: "GPU Receipt - A100 Cluster", fileName: "gpu-receipt-dec2025.pdf", fileSize: 87040, mimeType: "application/pdf", entityType: "Expense", entityId: null, description: "Receipt for A100 GPU cluster usage", tags: "receipt,compute,gpu" },
    { name: "Employee Handbook 2026", fileName: "employee-handbook-2026.pdf", fileSize: 1048576, mimeType: "application/pdf", entityType: "General", entityId: null, description: "Updated employee handbook for FY 2025-26", tags: "hr,handbook,policy" },
  ]

  for (const doc of documents) {
    await prisma.document.create({
      data: {
        organizationId: org.id,
        name: doc.name,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        storageKey: `docs/${org.id}/${doc.fileName}`,
        entityType: doc.entityType,
        entityId: doc.entityId,
        uploadedById: adminUser.id,
        description: doc.description,
        tags: doc.tags,
      },
    })
  }

  // ============================================
  // BANK FEEDS: 1 feed with sample transactions
  // ============================================

  const bankFeed = await prisma.bankFeed.create({
    data: {
      organizationId: org.id,
      bankName: "Commonwealth Bank",
      accountNumber: "0623-1234-5678",
      accountName: "Business Cheque Account",
      status: "Active",
      lastSyncAt: daysAgo(1),
      connectionRef: "CBA-FEED-001",
      feedType: "Direct",
    },
  })

  const feedTransactions = [
    { externalId: "CBA-TXN-001", date: daysAgo(5), amount: -1250.00, description: "NVIDIA Computing - Invoice Payment", reference: "BPAY-88166", category: "Supplier Payment", status: "Matched" },
    { externalId: "CBA-TXN-002", date: daysAgo(4), amount: 45000.00, description: "TechCorp Solutions - Payment Received", reference: "DIRECT-TC01", category: "Customer Payment", status: "Matched" },
    { externalId: "CBA-TXN-003", date: daysAgo(3), amount: -89.00, description: "AWS SERVICES - Monthly Charge", reference: "AWS-2026-03", category: "Cloud Services", status: "Pending" },
    { externalId: "CBA-TXN-004", date: daysAgo(2), amount: -320.00, description: "OFFICE WORKS SUPPLIES", reference: "OW-98712", category: "Office Supplies", status: "Pending" },
    { externalId: "CBA-TXN-005", date: daysAgo(1), amount: 12500.00, description: "Green Energy Co - Milestone Payment", reference: "DIRECT-GE02", category: "Customer Payment", status: "Pending" },
  ]

  for (const ft of feedTransactions) {
    await prisma.bankFeedTransaction.create({
      data: {
        bankFeedId: bankFeed.id,
        externalId: ft.externalId,
        date: ft.date,
        amount: ft.amount,
        description: ft.description,
        reference: ft.reference,
        category: ft.category,
        status: ft.status,
      },
    })
  }

  // ============================================
  // MARKETPLACE: Providers, Requirements, Listings, Bids
  // ============================================

  // 6 MarketplaceProviders
  const providerMitchell = await prisma.marketplaceProvider.create({
    data: {
      name: "Dr. Sarah Mitchell",
      email: "s.mitchell@researchconsulting.com.au",
      description: "Expert research consultant specialising in materials science with 15+ years of experience in sample analysis, characterisation, and research methodology design.",
      category: "Consultant",
      subcategories: "Research Consultant",
      location: "Sydney, NSW",
      serviceArea: "NSW,VIC,QLD",
      hourlyRate: 250,
      dailyRate: 1800,
      rating: 4.8,
      reviewCount: 12,
      verified: true,
      verifiedAt: new Date(),
      status: "Active",
      profileCompleteness: 90,
      preferredPayment: "Standard",
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    },
  })

  const providerTechLab = await prisma.marketplaceProvider.create({
    data: {
      name: "TechLab Solutions Pty Ltd",
      businessName: "TechLab Solutions Pty Ltd",
      abn: "98 765 432 109",
      email: "bookings@techlabsolutions.com.au",
      website: "https://techlabsolutions.com.au",
      description: "Full-service laboratory providing X-ray diffraction, NIR spectroscopy, and core scanning services for the mining, energy, and materials science sectors.",
      category: "LabService",
      subcategories: "X-ray,NIR,Core Scanning",
      location: "Melbourne, VIC",
      serviceArea: "VIC,NSW,QLD,SA",
      hourlyRate: 350,
      dailyRate: 2500,
      rating: 4.9,
      reviewCount: 24,
      verified: true,
      verifiedAt: new Date(),
      status: "Active",
      profileCompleteness: 95,
      preferredPayment: "Milestone",
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    },
  })

  const providerGreenEquip = await prisma.marketplaceProvider.create({
    data: {
      name: "GreenEquip Leasing",
      businessName: "GreenEquip Leasing Pty Ltd",
      abn: "55 432 109 876",
      email: "leasing@greenequip.com.au",
      website: "https://greenequip.com.au",
      description: "Specialising in laboratory and field equipment leasing for research organisations, universities, and corporate R&D teams.",
      category: "EquipmentLeasing",
      subcategories: "Lab Equipment,Field Equipment",
      location: "Brisbane, QLD",
      serviceArea: "QLD,NSW,VIC",
      dailyRate: 800,
      rating: 4.5,
      reviewCount: 8,
      verified: true,
      verifiedAt: new Date(),
      status: "Active",
      profileCompleteness: 80,
      preferredPayment: "Monthly",
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    },
  })

  const providerRdTax = await prisma.marketplaceProvider.create({
    data: {
      name: "R&D Tax Partners",
      businessName: "R&D Tax Partners Pty Ltd",
      abn: "33 210 987 654",
      email: "info@rdtaxpartners.com.au",
      website: "https://rdtaxpartners.com.au",
      description: "Specialist R&D tax incentive advisory firm helping Australian companies maximise their R&D tax offset claims with full ATO compliance.",
      category: "TaxAgent",
      subcategories: "R&D Tax Incentive",
      location: "Sydney, NSW",
      serviceArea: "NSW,VIC,QLD,WA,SA,TAS,NT,ACT",
      hourlyRate: 400,
      rating: 4.7,
      reviewCount: 18,
      verified: true,
      verifiedAt: new Date(),
      status: "Active",
      profileCompleteness: 85,
      preferredPayment: "Standard",
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    },
  })

  const providerDataMinds = await prisma.marketplaceProvider.create({
    data: {
      name: "DataMinds Research",
      businessName: "DataMinds Research Pty Ltd",
      abn: "77 654 321 098",
      email: "hello@datamindsresearch.com.au",
      website: "https://datamindsresearch.com.au",
      description: "Data science and AI research consultancy providing machine learning model development, statistical analysis, and data pipeline engineering for R&D projects.",
      category: "Researcher",
      subcategories: "Data Science,AI",
      location: "Perth, WA",
      serviceArea: "WA,NSW,VIC,QLD",
      hourlyRate: 200,
      dailyRate: 1500,
      rating: 4.6,
      reviewCount: 10,
      verified: true,
      verifiedAt: new Date(),
      status: "Active",
      profileCompleteness: 88,
      preferredPayment: "QuarterlyFinancing",
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    },
  })

  const providerBuildRight = await prisma.marketplaceProvider.create({
    data: {
      name: "BuildRight Trades",
      businessName: "BuildRight Trades Pty Ltd",
      abn: "44 321 098 765",
      email: "jobs@buildrighttrades.com.au",
      description: "Licensed builders and tradespeople specialising in laboratory construction, cleanroom fitout, and electrical installations for research facilities.",
      category: "Tradesperson",
      subcategories: "Lab Construction,Fitout",
      location: "Adelaide, SA",
      serviceArea: "SA,VIC",
      hourlyRate: 120,
      dailyRate: 900,
      rating: 4.4,
      reviewCount: 6,
      verified: false,
      status: "Active",
      profileCompleteness: 70,
      preferredPayment: "Milestone",
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    },
  })

  // ProviderCapabilities (3-4 per provider)
  // Dr. Mitchell
  for (const cap of [
    { capabilityType: "Skill", name: "Materials Characterisation", description: "Expert in advanced materials characterisation techniques including XRD, SEM, and TEM" },
    { capabilityType: "Skill", name: "Sample Analysis", description: "Comprehensive sample analysis for minerals, metals, and composite materials" },
    { capabilityType: "Skill", name: "Research Methodology Design", description: "Designing rigorous experimental methodologies for R&D projects" },
  ]) {
    await prisma.providerCapability.create({ data: { providerId: providerMitchell.id, ...cap, verificationStatus: "Verified" } })
  }

  // TechLab Solutions
  for (const cap of [
    { capabilityType: "Equipment", name: "X-Ray Diffraction", description: "Bruker D8 Advance XRD system for phase identification and crystal structure analysis" },
    { capabilityType: "Equipment", name: "NIR Spectroscopy", description: "Thermo Fisher Antaris II NIR analyser for rapid material identification" },
    { capabilityType: "Equipment", name: "Core Scanning", description: "Minalyze CS core scanner for high-resolution elemental analysis" },
    { capabilityType: "Service", name: "Sample Preparation", description: "Full sample preparation services including crushing, grinding, and polishing" },
  ]) {
    await prisma.providerCapability.create({ data: { providerId: providerTechLab.id, ...cap, verificationStatus: "Verified" } })
  }

  // GreenEquip Leasing
  for (const cap of [
    { capabilityType: "Service", name: "Laboratory Equipment Lease", description: "Short and long-term lease of laboratory instruments and analytical equipment" },
    { capabilityType: "Service", name: "Field Equipment Hire", description: "Portable field equipment hire for on-site sampling and analysis" },
    { capabilityType: "Service", name: "Equipment Maintenance", description: "Preventive maintenance and calibration services for leased equipment" },
  ]) {
    await prisma.providerCapability.create({ data: { providerId: providerGreenEquip.id, ...cap, verificationStatus: "Verified" } })
  }

  // R&D Tax Partners
  for (const cap of [
    { capabilityType: "Service", name: "R&D Tax Incentive Claims", description: "End-to-end preparation and lodgement of R&D tax incentive applications" },
    { capabilityType: "Certification", name: "ATO Compliance", description: "Ensuring full compliance with ATO requirements for R&D tax incentive claims" },
    { capabilityType: "Service", name: "Technical Assessment Reports", description: "Preparation of technical assessment reports documenting eligible R&D activities" },
  ]) {
    await prisma.providerCapability.create({ data: { providerId: providerRdTax.id, ...cap, verificationStatus: "Verified" } })
  }

  // DataMinds Research
  for (const cap of [
    { capabilityType: "Skill", name: "Machine Learning Models", description: "Development and deployment of custom ML models for research applications" },
    { capabilityType: "Skill", name: "Statistical Analysis", description: "Advanced statistical analysis including hypothesis testing, regression, and Bayesian methods" },
    { capabilityType: "Skill", name: "Data Pipeline Engineering", description: "Building scalable data pipelines for research data ingestion, processing, and analysis" },
  ]) {
    await prisma.providerCapability.create({ data: { providerId: providerDataMinds.id, ...cap, verificationStatus: "Verified" } })
  }

  // BuildRight Trades
  for (const cap of [
    { capabilityType: "Service", name: "Lab Construction", description: "Complete laboratory construction from design to handover" },
    { capabilityType: "Service", name: "Cleanroom Fitout", description: "ISO-certified cleanroom design and fitout for research facilities" },
    { capabilityType: "Service", name: "Electrical Installation", description: "Specialised electrical installations for laboratory and research equipment" },
  ]) {
    await prisma.providerCapability.create({ data: { providerId: providerBuildRight.id, ...cap, verificationStatus: "Pending" } })
  }

  // 1 ProjectRequirement linked to the first R&D project (nasProject)
  const projectRequirement = await prisma.projectRequirement.create({
    data: {
      organizationId: org.id,
      rdProjectId: nasProject.id,
      projectName: "Neural Architecture Search - Resource Requirements",
      description: "Resources required for the NAS project including researchers, lab equipment, and lab assistants for sample analysis and experimentation.",
      status: "Published",
      extractedFrom: "ProjectPlan",
      createdById: adminUser.id,
      approvedById: adminUser.id,
      approvedAt: new Date(),
      totalBudget: 113880,
      currency: "AUD",
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      notes: "Initial resource plan for Q1-Q2 2026",
    },
  })

  // 3 RequirementItems
  const reqItemResearchers = await prisma.requirementItem.create({
    data: {
      requirementId: projectRequirement.id,
      title: "Sample Analysis Researchers",
      description: "Experienced researchers with materials science background for ongoing sample analysis work supporting the NAS project.",
      category: "Researcher",
      quantity: 3,
      unitType: "Weeks",
      duration: "12 weeks",
      frequencyDescription: "weekly analysis sessions",
      requiredSkills: "Materials science,Sample analysis,XRD",
      estimatedBudget: 21600,
      status: "InMarket",
      priority: "High",
      sortOrder: 1,
    },
  })

  await prisma.requirementItem.create({
    data: {
      requirementId: projectRequirement.id,
      title: "X-ray, NIR and Core Scanning Equipment",
      description: "Access to X-ray diffraction, NIR spectroscopy, and core scanning equipment for materials characterisation.",
      category: "Equipment",
      quantity: 1,
      unitType: "Months",
      duration: "3 months",
      estimatedBudget: 75000,
      requiredEquipment: "X-ray diffraction,NIR spectrometer,Core scanner",
      alternativeOptions: JSON.stringify({ options: "Lease from TechLab at $2500/day or lease equipment at Location Y with lab assistants" }),
      status: "Draft",
      priority: "High",
      sortOrder: 2,
    },
  })

  await prisma.requirementItem.create({
    data: {
      requirementId: projectRequirement.id,
      title: "Lab Assistants",
      description: "Lab assistants to support researchers with sample preparation, equipment operation, and data recording.",
      category: "Laborer",
      quantity: 2,
      unitType: "Hours",
      duration: "12 weeks",
      frequencyDescription: "24 hours per week per assistant",
      estimatedBudget: 17280,
      status: "Draft",
      priority: "Medium",
      sortOrder: 3,
    },
  })

  // 3 RequirementSuggestions (AI-generated)
  await prisma.requirementSuggestion.create({
    data: {
      requirementId: projectRequirement.id,
      suggestedByAI: true,
      itemTitle: "R&D Tax Claim Review",
      itemDescription: "Engage a specialist tax agent to review and prepare R&D tax incentive claims for the NAS project to maximise eligible offset.",
      category: "TaxAgent",
      quantity: 1,
      unitType: "Months",
      duration: "1 month",
      estimatedCost: 8000,
      rationale: "R&D tax incentive claims can offset up to 43.5% of eligible expenditure. A specialist review ensures maximum claim value and ATO compliance.",
      confidence: 0.85,
    },
  })

  await prisma.requirementSuggestion.create({
    data: {
      requirementId: projectRequirement.id,
      suggestedByAI: true,
      itemTitle: "Equipment Maintenance Contract",
      itemDescription: "Establish a preventive maintenance contract for leased laboratory equipment to minimise downtime during the 3-month analysis period.",
      category: "Equipment",
      quantity: 1,
      unitType: "Months",
      duration: "3 months",
      estimatedCost: 4500,
      rationale: "Equipment downtime can delay research timelines. A maintenance contract ensures 95%+ uptime and includes calibration services.",
      confidence: 0.72,
    },
  })

  await prisma.requirementSuggestion.create({
    data: {
      requirementId: projectRequirement.id,
      suggestedByAI: true,
      itemTitle: "Data Analyst for Results Compilation",
      itemDescription: "A data analyst to compile, clean, and visualise experimental results from the sample analysis phase for reporting and further modelling.",
      category: "Researcher",
      quantity: 1,
      unitType: "Weeks",
      duration: "4 weeks",
      estimatedCost: 6000,
      rationale: "Structured data compilation accelerates the transition from experimentation to modelling, reducing overall project timeline.",
      confidence: 0.68,
    },
  })

  // 1 MarketplaceListing published from the first requirement item
  const marketplaceListing = await prisma.marketplaceListing.create({
    data: {
      organizationId: org.id,
      requirementId: projectRequirement.id,
      requirementItemId: reqItemResearchers.id,
      title: "Sample Analysis Researchers - Materials Science",
      description: "Seeking 3 experienced researchers with materials science background for weekly sample analysis sessions over 12 weeks. Must have experience with XRD and materials characterisation techniques.",
      category: "Researcher",
      budget: 21600,
      budgetType: "Fixed",
      duration: "12 weeks",
      location: "Sydney, NSW",
      remoteOk: false,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      status: "Open",
      visibility: "Public",
      paymentTerms: "Milestone",
      viewCount: 14,
      responseCount: 2,
    },
  })

  // 2 MarketplaceBids on that listing
  await prisma.marketplaceBid.create({
    data: {
      listingId: marketplaceListing.id,
      providerId: providerMitchell.id,
      bidType: "Offer",
      amount: 19800,
      currency: "AUD",
      rateType: "Fixed",
      proposedStartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      proposedEndDate: new Date(Date.now() + 91 * 24 * 60 * 60 * 1000),
      proposalDescription: "I can provide weekly sample analysis sessions leveraging my 15+ years of materials science experience. My approach includes XRD phase identification, SEM imaging, and comprehensive reporting. Rate reflects a discount for the 12-week engagement.",
      includedServices: "XRD analysis, SEM imaging, weekly reports, methodology design",
      exclusions: "Sample preparation, equipment costs",
      paymentPreference: "Standard",
      status: "Submitted",
    },
  })

  await prisma.marketplaceBid.create({
    data: {
      listingId: marketplaceListing.id,
      providerId: providerTechLab.id,
      bidType: "Offer",
      amount: 24000,
      currency: "AUD",
      rateType: "Fixed",
      proposedStartDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      proposedEndDate: new Date(Date.now() + 89 * 24 * 60 * 60 * 1000),
      proposalDescription: "TechLab Solutions can assign a team of 3 researchers with full access to our XRD, NIR, and core scanning facilities. Price includes sample preparation and all analytical services.",
      includedServices: "3 researchers, XRD/NIR/Core scanning access, sample preparation, weekly progress reports",
      exclusions: "Travel costs outside Melbourne metro",
      paymentPreference: "Milestone",
      status: "Submitted",
    },
  })

  console.log("Marketplace: 6 providers, 19 capabilities, 1 project requirement, 3 requirement items, 3 AI suggestions, 1 listing, 2 bids")

  // ============================================
  // NEW: Quotes, Locked Periods, Loans, Cost Centers, Compliance, Report Templates
  // ============================================

  // Additional accounts needed for loans
  const loanAdditionalAccounts = [
    { code: "2550", name: "Business Loan", type: "Liability", subType: "Non-Current Liability", taxType: "BAS-Excluded" },
    { code: "6800", name: "Interest Expense", type: "Expense", subType: "Operating Expense", taxType: "GST-Free" },
  ]
  const loanAcctIds: Record<string, string> = {}
  for (const acc of loanAdditionalAccounts) {
    const exists = await prisma.account.findFirst({ where: { code: acc.code, organizationId: org.id } })
    if (!exists) {
      const created = await prisma.account.create({
        data: { ...acc, isSystemAccount: false, isRdEligible: false, organizationId: org.id },
      })
      loanAcctIds[acc.code] = created.id
    } else {
      loanAcctIds[acc.code] = exists.id
    }
  }

  // Look up GST tax rate for quotes
  const gstRate = await prisma.taxRate.findFirst({
    where: { organizationId: org.id, taxType: "GST", isDefault: true },
  })

  // --- Quotes (2) ---
  const quote1 = await prisma.quote.create({
    data: {
      organizationId: org.id,
      quoteNumber: "QT-0001",
      contactId: techCorp.id,
      issueDate: daysAgo(14),
      expiryDate: daysAgo(-16),
      reference: "Energy Monitoring System",
      status: "Sent",
      subtotal: 25000,
      taxTotal: 2500,
      total: 27500,
      notes: "Includes installation and 12-month warranty",
      terms: "Payment within 30 days of acceptance",
      lines: {
        create: [
          {
            description: "Energy Monitoring Platform - Annual License",
            quantity: 1,
            unitPrice: 18000,
            taxRateId: gstRate?.id,
            taxAmount: 1800,
            lineAmount: 18000,
            accountId: salesRevenueAcct.id,
            sortOrder: 1,
          },
          {
            description: "Installation & Configuration",
            quantity: 1,
            unitPrice: 5000,
            taxRateId: gstRate?.id,
            taxAmount: 500,
            lineAmount: 5000,
            accountId: consultingRevenueAcct.id,
            sortOrder: 2,
          },
          {
            description: "Staff Training (2 days)",
            quantity: 2,
            unitPrice: 1000,
            taxRateId: gstRate?.id,
            taxAmount: 200,
            lineAmount: 2000,
            accountId: consultingRevenueAcct.id,
            sortOrder: 3,
          },
        ],
      },
    },
  })

  const quote2 = await prisma.quote.create({
    data: {
      organizationId: org.id,
      quoteNumber: "QT-0002",
      contactId: greenEnergy.id,
      issueDate: daysAgo(5),
      expiryDate: daysAgo(-25),
      reference: "Solar Analytics Integration",
      status: "Draft",
      subtotal: 42000,
      taxTotal: 4200,
      total: 46200,
      notes: "Phase 1 of solar analytics platform integration",
      terms: "50% upfront, 50% on completion",
      lines: {
        create: [
          {
            description: "Solar Analytics API Integration",
            quantity: 1,
            unitPrice: 30000,
            taxRateId: gstRate?.id,
            taxAmount: 3000,
            lineAmount: 30000,
            accountId: salesRevenueAcct.id,
            sortOrder: 1,
          },
          {
            description: "Data Migration & Historical Import",
            quantity: 1,
            unitPrice: 12000,
            taxRateId: gstRate?.id,
            taxAmount: 1200,
            lineAmount: 12000,
            accountId: consultingRevenueAcct.id,
            sortOrder: 2,
          },
        ],
      },
    },
  })

  console.log("Quotes: 2 quotes (QT-0001 Sent, QT-0002 Draft)")

  // --- Locked Period (Q1 FY 2025-26: Jul-Sep 2025) ---
  await prisma.lockedPeriod.create({
    data: {
      organizationId: org.id,
      periodStart: new Date(2025, 6, 1),    // Jul 1, 2025
      periodEnd: new Date(2025, 8, 30, 23, 59, 59, 999), // Sep 30, 2025
      lockedById: adminUser.id,
      reason: "Q1 FY2025-26 period closed after BAS lodgement",
      status: "Locked",
    },
  })

  console.log("Locked periods: 1 (Q1 FY2025-26)")

  // --- Loan (Business Loan $100K) ---
  const businessLoan = await prisma.loan.create({
    data: {
      organizationId: org.id,
      name: "NAB Business Loan",
      lender: "National Australia Bank",
      loanType: "BusinessLoan",
      principalAmount: 100000,
      interestRate: 6.5,
      interestType: "Fixed",
      termMonths: 60,
      startDate: new Date(2025, 0, 15), // Jan 15, 2025
      maturityDate: new Date(2030, 0, 15), // Jan 15, 2030
      monthlyPayment: 1956.61,
      currentBalance: 91250.00,
      liabilityAccountId: loanAcctIds["2550"],
      interestExpenseAccountId: loanAcctIds["6800"],
      status: "Active",
      notes: "5-year fixed rate business loan for equipment expansion",
      payments: {
        create: [
          {
            date: new Date(2025, 1, 15),
            principalAmount: 1414.94,
            interestAmount: 541.67,
            totalAmount: 1956.61,
            balance: 98585.06,
            notes: "February 2025 payment",
          },
          {
            date: new Date(2025, 2, 15),
            principalAmount: 1422.61,
            interestAmount: 534.00,
            totalAmount: 1956.61,
            balance: 97162.45,
            notes: "March 2025 payment",
          },
          {
            date: new Date(2025, 3, 15),
            principalAmount: 1430.32,
            interestAmount: 526.29,
            totalAmount: 1956.61,
            balance: 95732.13,
            notes: "April 2025 payment",
          },
        ],
      },
    },
  })

  console.log("Loans: 1 business loan ($100K, NAB)")

  // --- Compliance Deadlines for FY 2025-26 ---
  const complianceDeadlines = [
    { title: "BAS Q1 2025-26", description: "Business Activity Statement for Q1 (Jul-Sep 2025)", category: "BAS", dueDate: new Date(2025, 9, 28), frequency: "Quarterly", status: "Completed", completedAt: new Date(2025, 9, 25), completedById: adminUser.id, reminderDays: 14 },
    { title: "BAS Q2 2025-26", description: "Business Activity Statement for Q2 (Oct-Dec 2025)", category: "BAS", dueDate: new Date(2026, 1, 28), frequency: "Quarterly", status: "Upcoming", reminderDays: 14 },
    { title: "BAS Q3 2025-26", description: "Business Activity Statement for Q3 (Jan-Mar 2026)", category: "BAS", dueDate: new Date(2026, 3, 28), frequency: "Quarterly", status: "Upcoming", reminderDays: 14 },
    { title: "BAS Q4 2025-26", description: "Business Activity Statement for Q4 (Apr-Jun 2026)", category: "BAS", dueDate: new Date(2026, 6, 28), frequency: "Quarterly", status: "Upcoming", reminderDays: 14 },
    { title: "STP Finalisation 2025-26", description: "Single Touch Payroll finalisation declaration for FY 2025-26", category: "STP", dueDate: new Date(2026, 6, 14), frequency: "Annually", status: "Upcoming", reminderDays: 21 },
    { title: "Super Guarantee Q1 2025-26", description: "Superannuation guarantee payment for Q1 (Jul-Sep 2025)", category: "SuperGuarantee", dueDate: new Date(2025, 9, 28), frequency: "Quarterly", status: "Completed", completedAt: new Date(2025, 9, 20), completedById: adminUser.id, reminderDays: 14 },
    { title: "Super Guarantee Q2 2025-26", description: "Superannuation guarantee payment for Q2 (Oct-Dec 2025)", category: "SuperGuarantee", dueDate: new Date(2026, 0, 28), frequency: "Quarterly", status: "Upcoming", reminderDays: 14 },
    { title: "Super Guarantee Q3 2025-26", description: "Superannuation guarantee payment for Q3 (Jan-Mar 2026)", category: "SuperGuarantee", dueDate: new Date(2026, 3, 28), frequency: "Quarterly", status: "Upcoming", reminderDays: 14 },
    { title: "Super Guarantee Q4 2025-26", description: "Superannuation guarantee payment for Q4 (Apr-Jun 2026)", category: "SuperGuarantee", dueDate: new Date(2026, 6, 28), frequency: "Quarterly", status: "Upcoming", reminderDays: 14 },
    { title: "FBT Return 2025-26", description: "Fringe Benefits Tax return for FBT year ending 31 March 2026", category: "FBT", dueDate: new Date(2026, 4, 21), frequency: "Annually", status: "Upcoming", reminderDays: 28 },
    { title: "R&D Tax Incentive Registration 2025-26", description: "Register R&D activities with AusIndustry for FY 2025-26", category: "RDTaxIncentive", dueDate: new Date(2027, 3, 30), frequency: "Annually", status: "Upcoming", reminderDays: 60 },
    { title: "Company Tax Return 2025-26", description: "Company income tax return for FY 2025-26", category: "IncomeTax", dueDate: new Date(2027, 4, 15), frequency: "Annually", status: "Upcoming", reminderDays: 30 },
  ]

  for (const dl of complianceDeadlines) {
    await prisma.complianceDeadline.create({
      data: {
        organizationId: org.id,
        ...dl,
      },
    })
  }

  console.log("Compliance deadlines: 12 for FY 2025-26")

  // --- Cost Centers (3: Engineering, Research, Operations) ---
  const engineeringCC = await prisma.costCenter.create({
    data: {
      organizationId: org.id,
      code: "CC-ENG",
      name: "Engineering",
      description: "Software and hardware engineering department",
      type: "Department",
      managerId: adminUser.id,
      isActive: true,
    },
  })

  const researchCC = await prisma.costCenter.create({
    data: {
      organizationId: org.id,
      code: "CC-RES",
      name: "Research",
      description: "R&D and experimental research division",
      type: "Department",
      managerId: adminUser.id,
      isActive: true,
    },
  })

  const operationsCC = await prisma.costCenter.create({
    data: {
      organizationId: org.id,
      code: "CC-OPS",
      name: "Operations",
      description: "Day-to-day business operations and administration",
      type: "Department",
      managerId: adminUser.id,
      isActive: true,
    },
  })

  console.log("Cost centers: 3 (Engineering, Research, Operations)")

  // --- Report Template (1) ---
  await prisma.reportTemplate.create({
    data: {
      organizationId: org.id,
      name: "Monthly P&L with R&D Breakdown",
      description: "Profit & Loss report showing R&D expenses as a separate section with month-over-month comparison",
      baseReport: "ProfitLoss",
      columns: JSON.stringify([
        { key: "account", label: "Account" },
        { key: "currentMonth", label: "Current Month" },
        { key: "previousMonth", label: "Previous Month" },
        { key: "variance", label: "Variance" },
        { key: "ytd", label: "Year to Date" },
      ]),
      filters: JSON.stringify({ excludeZeroBalances: true, showSubAccounts: true }),
      groupBy: "subType",
      dateRange: "CurrentMonth",
      includeComparison: true,
      createdById: adminUser.id,
      isPublic: true,
    },
  })

  console.log("Report templates: 1 (Monthly P&L with R&D Breakdown)")

  console.log("Seed completed successfully!")
  console.log("Demo data created: 6 contacts, 6 invoices, 4 bills, 2 R&D projects, 3 experiments, 8 time entries, 6 cloud costs, 8 bank transactions")
  console.log("Payroll data created: 4 employees, 1 pay run (completed), 4 payslips, 2 tax minimisation strategies, 10 payroll accounts")
  console.log("Fixed assets created: 5 assets (2 computers, 1 vehicle, 1 software, 1 lab equipment), depreciation schedules for FY 2025-26")
  console.log("Approval workflows: 2 (bills >$5K, expenses >$1K)")
  console.log("Exchange rates: USD, GBP, EUR, NZD against AUD (4 dates)")
  console.log("Inventory: 8 items, 12 movements")
  console.log("Projects: 3 (1 fixed-price, 1 T&M, 1 R&D), 8 tasks, 10 time entries, 5 expenses, 2 milestones")
  console.log("Documents: 5 metadata records")
  console.log("Bank feeds: 1 feed, 5 transactions")
  console.log("Login: admin@powerplantenergy.com.au / admin123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
