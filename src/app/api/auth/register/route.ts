import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

const DEFAULT_TAX_RATES = [
  { name: "GST on Income", rate: 10, taxType: "GST", isDefault: true },
  { name: "GST on Expenses", rate: 10, taxType: "GST", isDefault: false },
  { name: "GST Free Income", rate: 0, taxType: "GST-Free", isDefault: false },
  { name: "GST Free Expenses", rate: 0, taxType: "GST-Free", isDefault: false },
  { name: "Input Taxed", rate: 0, taxType: "Input-Taxed", isDefault: false },
  { name: "BAS Excluded", rate: 0, taxType: "BAS-Excluded", isDefault: false },
]

const DEFAULT_ACCOUNTS = [
  { code: "1000", name: "Cheque Account", type: "Asset", subType: "Bank", taxType: "BAS-Excluded", isSystemAccount: true },
  { code: "1050", name: "Savings Account", type: "Asset", subType: "Bank", taxType: "BAS-Excluded" },
  { code: "1100", name: "Accounts Receivable", type: "Asset", subType: "Current Asset", taxType: "BAS-Excluded", isSystemAccount: true },
  { code: "1150", name: "Prepayments", type: "Asset", subType: "Current Asset", taxType: "BAS-Excluded" },
  { code: "1200", name: "Inventory", type: "Asset", subType: "Current Asset", taxType: "BAS-Excluded" },
  { code: "1300", name: "Office Equipment", type: "Asset", subType: "Fixed Asset", taxType: "GST" },
  { code: "1310", name: "Computer Equipment", type: "Asset", subType: "Fixed Asset", taxType: "GST" },
  { code: "1320", name: "Lab Equipment", type: "Asset", subType: "Fixed Asset", taxType: "GST", isRdEligible: true },
  { code: "1400", name: "Accumulated Depreciation", type: "Asset", subType: "Fixed Asset", taxType: "BAS-Excluded" },
  { code: "2000", name: "Accounts Payable", type: "Liability", subType: "Current Liability", taxType: "BAS-Excluded", isSystemAccount: true },
  { code: "2050", name: "Credit Card", type: "Liability", subType: "Current Liability", taxType: "BAS-Excluded" },
  { code: "2100", name: "GST Collected", type: "Liability", subType: "Current Liability", taxType: "BAS-Excluded", isSystemAccount: true },
  { code: "2150", name: "GST Paid", type: "Liability", subType: "Current Liability", taxType: "BAS-Excluded", isSystemAccount: true },
  { code: "2200", name: "PAYG Withholding", type: "Liability", subType: "Current Liability", taxType: "BAS-Excluded" },
  { code: "2300", name: "Superannuation Payable", type: "Liability", subType: "Current Liability", taxType: "BAS-Excluded" },
  { code: "2400", name: "Wages Payable", type: "Liability", subType: "Current Liability", taxType: "BAS-Excluded" },
  { code: "2500", name: "Loan - Current", type: "Liability", subType: "Current Liability", taxType: "BAS-Excluded" },
  { code: "2600", name: "Loan - Non-Current", type: "Liability", subType: "Non-Current Liability", taxType: "BAS-Excluded" },
  { code: "3000", name: "Owner's Equity", type: "Equity", subType: "Equity", taxType: "BAS-Excluded" },
  { code: "3100", name: "Retained Earnings", type: "Equity", subType: "Equity", taxType: "BAS-Excluded", isSystemAccount: true },
  { code: "3200", name: "Current Year Earnings", type: "Equity", subType: "Equity", taxType: "BAS-Excluded", isSystemAccount: true },
  { code: "4000", name: "Sales Revenue", type: "Revenue", subType: "Revenue", taxType: "GST" },
  { code: "4100", name: "Consulting Revenue", type: "Revenue", subType: "Revenue", taxType: "GST" },
  { code: "4200", name: "R&D Tax Incentive Income", type: "Revenue", subType: "Other Revenue", taxType: "BAS-Excluded" },
  { code: "4300", name: "Grant Income", type: "Revenue", subType: "Other Revenue", taxType: "GST-Free" },
  { code: "4400", name: "Interest Income", type: "Revenue", subType: "Other Revenue", taxType: "GST-Free" },
  { code: "4500", name: "Other Revenue", type: "Revenue", subType: "Other Revenue", taxType: "GST" },
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
  { code: "7000", name: "R&D Staff Salaries", type: "Expense", subType: "R&D Expense", taxType: "BAS-Excluded", isRdEligible: true },
  { code: "7050", name: "R&D Contractor Costs", type: "Expense", subType: "R&D Expense", taxType: "GST", isRdEligible: true },
  { code: "7100", name: "R&D Materials & Consumables", type: "Expense", subType: "R&D Expense", taxType: "GST", isRdEligible: true },
  { code: "7150", name: "R&D Cloud Computing", type: "Expense", subType: "R&D Expense", taxType: "GST", isRdEligible: true },
  { code: "7200", name: "R&D Software & Licenses", type: "Expense", subType: "R&D Expense", taxType: "GST", isRdEligible: true },
  { code: "7250", name: "R&D Equipment Depreciation", type: "Expense", subType: "R&D Expense", taxType: "BAS-Excluded", isRdEligible: true },
  { code: "7300", name: "R&D Overhead Allocation", type: "Expense", subType: "R&D Expense", taxType: "BAS-Excluded", isRdEligible: true },
  { code: "7350", name: "R&D Travel & Conference", type: "Expense", subType: "R&D Expense", taxType: "GST", isRdEligible: true },
  { code: "8000", name: "Wages & Salaries", type: "Expense", subType: "Payroll", taxType: "BAS-Excluded" },
  { code: "8050", name: "Superannuation", type: "Expense", subType: "Payroll", taxType: "BAS-Excluded" },
  { code: "8100", name: "Workers Compensation", type: "Expense", subType: "Payroll", taxType: "GST-Free" },
  { code: "8150", name: "Payroll Tax", type: "Expense", subType: "Payroll", taxType: "BAS-Excluded" },
]

const DEFAULT_CURRENCIES = [
  { code: "AUD", name: "Australian Dollar", symbol: "$", isBase: true, exchangeRate: 1.0 },
  { code: "USD", name: "US Dollar", symbol: "$", isBase: false, exchangeRate: 0.65 },
  { code: "EUR", name: "Euro", symbol: "\u20AC", isBase: false, exchangeRate: 0.60 },
  { code: "GBP", name: "British Pound", symbol: "\u00A3", isBase: false, exchangeRate: 0.52 },
]

const DEFAULT_PIPELINE_STAGES = [
  { name: "Ideation", stageOrder: 1, description: "Initial concept and hypothesis formation" },
  { name: "Planning", stageOrder: 2, description: "Experiment design and resource planning" },
  { name: "In Progress", stageOrder: 3, description: "Active experimentation" },
  { name: "Analysis", stageOrder: 4, description: "Analyzing results and outcomes" },
  { name: "Complete", stageOrder: 5, description: "Experiment concluded with documented outcomes" },
]

export async function POST(request: Request) {
  try {
    const { name, email, password, organizationName, abn } = await request.json()

    if (!name || !email || !password || !organizationName) {
      return NextResponse.json(
        { error: "Name, email, password, and organization name are required" },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    if (abn) {
      const abnDigits = abn.replace(/\s/g, "")
      if (!/^\d{11}$/.test(abnDigits)) {
        return NextResponse.json(
          { error: "ABN must be exactly 11 digits" },
          { status: 400 }
        )
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const result = await prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          abn: abn ? abn.replace(/\s/g, "") : null,
        },
      })

      // Create admin user
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          organizationId: organization.id,
          role: "Admin",
        },
      })

      // Seed default chart of accounts
      await tx.account.createMany({
        data: DEFAULT_ACCOUNTS.map((acc) => ({
          ...acc,
          isSystemAccount: acc.isSystemAccount || false,
          isRdEligible: acc.isRdEligible || false,
          organizationId: organization.id,
        })),
      })

      // Seed default tax rates
      await tx.taxRate.createMany({
        data: DEFAULT_TAX_RATES.map((tr) => ({
          ...tr,
          organizationId: organization.id,
        })),
      })

      // Seed default pipeline stages
      await tx.rdPipelineStage.createMany({
        data: DEFAULT_PIPELINE_STAGES.map((stage) => ({
          ...stage,
          organizationId: organization.id,
        })),
      })

      // Seed default currencies
      await tx.currency.createMany({
        data: DEFAULT_CURRENCIES.map((currency) => ({
          ...currency,
          organizationId: organization.id,
        })),
      })

      return { user, organization }
    })

    return NextResponse.json(
      {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          organizationId: result.organization.id,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
