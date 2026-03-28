import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import type { Metadata } from "next"
import RuleForm from "./rule-form"

export const metadata: Metadata = {
  title: "Bank Rules",
}

export default async function BankRulesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId

  const rules = await prisma.bankRule.findMany({
    where: { organizationId: orgId },
    include: {
      account: { select: { id: true, code: true, name: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  })

  const accounts = await prisma.account.findMany({
    where: { organizationId: orgId, isActive: true },
    orderBy: { code: "asc" },
  })

  const contacts = await prisma.contact.findMany({
    where: { organizationId: orgId },
    orderBy: { name: "asc" },
  })

  const rdProjects = await prisma.rdProject.findMany({
    where: { organizationId: orgId, status: "Active" },
    orderBy: { name: "asc" },
  })

  const rulesData = rules.map((r) => ({
    id: r.id,
    name: r.name,
    matchField: r.matchField,
    matchType: r.matchType,
    matchValue: r.matchValue,
    accountId: r.accountId,
    accountName: `${r.account.code} - ${r.account.name}`,
    contactId: r.contactId,
    taxType: r.taxType,
    rdProjectId: r.rdProjectId,
    isActive: r.isActive,
    priority: r.priority,
  }))

  const accountOptions = accounts.map((a) => ({
    id: a.id,
    label: `${a.code} - ${a.name}`,
  }))

  const contactOptions = contacts.map((c) => ({
    id: c.id,
    label: c.name,
  }))

  const rdProjectOptions = rdProjects.map((p) => ({
    id: p.id,
    label: p.name,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bank Rules</h1>
          <p className="mt-1 text-sm text-slate-500">
            Auto-categorize bank transactions with matching rules
          </p>
        </div>
        <Link
          href="/banking"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Back to Banking
        </Link>
      </div>

      <RuleForm
        rules={rulesData}
        accounts={accountOptions}
        contacts={contactOptions}
        rdProjects={rdProjectOptions}
      />
    </div>
  )
}
