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

  console.log("Seed completed successfully!")
  console.log("Demo data created: 6 contacts, 6 invoices, 4 bills, 2 R&D projects, 3 experiments, 8 time entries, 6 cloud costs, 8 bank transactions")
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
