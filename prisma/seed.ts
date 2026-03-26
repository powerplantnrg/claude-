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
  await prisma.user.create({
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

  console.log("Seed completed successfully!")
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
