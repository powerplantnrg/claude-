import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string

  const [
    organization,
    contactsCount,
    accountsCount,
    invoicesCount,
    rdProjectsCount,
    cloudProvidersCount,
    bankTransactionsCount,
  ] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, abn: true, address: true },
    }),
    prisma.contact.count({ where: { organizationId: orgId } }),
    prisma.account.count({ where: { organizationId: orgId } }),
    prisma.invoice.count({ where: { organizationId: orgId } }),
    prisma.rdProject.count({ where: { organizationId: orgId } }),
    prisma.cloudProvider.count({ where: { organizationId: orgId } }),
    prisma.bankTransaction.count({ where: { organizationId: orgId } }),
  ])

  const hasOrgDetails = !!(organization?.abn && organization?.address)

  const items = [
    { key: "orgDetails", label: "Set up organization details", completed: hasOrgDetails, link: "/settings" },
    { key: "contacts", label: "Add your first contact", completed: contactsCount > 0, link: "/contacts/new" },
    { key: "accounts", label: "Create your chart of accounts", completed: accountsCount > 0, link: "/accounts" },
    { key: "invoices", label: "Create your first invoice", completed: invoicesCount > 0, link: "/invoices/new" },
    { key: "rdProjects", label: "Set up an R&D project", completed: rdProjectsCount > 0, link: "/rd/projects/new" },
    { key: "cloudProviders", label: "Configure cloud providers", completed: cloudProvidersCount > 0, link: "/cloud/providers" },
    { key: "bankTransactions", label: "Import bank transactions", completed: bankTransactionsCount > 0, link: "/banking/import" },
  ]

  const completedCount = items.filter((i) => i.completed).length
  const progress = Math.round((completedCount / items.length) * 100)

  return NextResponse.json({ items, progress, completedCount, totalCount: items.length })
}
