import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdviceSearch } from "./advice-search"

const CATEGORY_META: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: string }> = {
  Eligibility: {
    label: "Eligibility",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: "Shield",
  },
  RecordKeeping: {
    label: "Record Keeping",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: "FileText",
  },
  FinancialStructuring: {
    label: "Financial Structuring",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: "DollarSign",
  },
  ClaimPreparation: {
    label: "Claim Preparation",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    icon: "Calendar",
  },
  CommonMistakes: {
    label: "Common Mistakes",
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    icon: "AlertTriangle",
  },
  AISpecific: {
    label: "AI Specific",
    color: "text-violet-700",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    icon: "Cpu",
  },
}

function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const cls = className || "h-5 w-5"
  switch (icon) {
    case "Shield":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      )
    case "FileText":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )
    case "DollarSign":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case "Calendar":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      )
    case "AlertTriangle":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      )
    case "Cpu":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3M21 8.25h-1.5M4.5 12H3M21 12h-1.5M4.5 15.75H3M21 15.75h-1.5M8.25 19.5V21M12 3v1.5M12 19.5V21M15.75 3v1.5M15.75 19.5V21M6.75 6.75h10.5a.75.75 0 01.75.75v9a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75v-9a.75.75 0 01.75-.75z" />
        </svg>
      )
    default:
      return null
  }
}

export default async function RdAdvicePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId

  const adviceItems = await prisma.rdAdviceItem.findMany({
    where: {
      OR: [
        { organizationId: orgId },
        { organizationId: null },
      ],
    },
    orderBy: [{ category: "asc" }, { priority: "desc" }],
  })

  const categories = Object.keys(CATEGORY_META)
  const grouped = categories.reduce((acc, cat) => {
    acc[cat] = adviceItems.filter((item) => item.category === cat)
    return acc
  }, {} as Record<string, typeof adviceItems>)

  // Also gather uncategorized items
  const knownCategories = new Set(categories)
  const uncategorized = adviceItems.filter((item) => !knownCategories.has(item.category))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">R&D Guidance Hub</h1>
        <p className="mt-1 text-sm text-slate-500">
          Expert advice and guidance for maximizing your R&D Tax Incentive claims
        </p>
      </div>

      <AdviceSearch
        grouped={JSON.parse(JSON.stringify(grouped))}
        uncategorized={JSON.parse(JSON.stringify(uncategorized))}
        categoryMeta={CATEGORY_META}
      />
    </div>
  )
}
