import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "R&D Knowledge Base",
}

export default async function KnowledgeBasePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string

  const params = await searchParams
  const search = params.search || ""
  const category = params.category || ""

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { organizationId: orgId, isPublished: true }
  if (category) where.category = category
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
      { tags: { contains: search } },
    ]
  }

  const [articles, categories] = await Promise.all([
    prisma.knowledgeBase.findMany({
      where,
      include: {
        author: { select: { name: true, email: true } },
        project: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.knowledgeBase.findMany({
      where: { organizationId: orgId },
      select: { category: true },
      distinct: ["category"],
    }),
  ])

  const uniqueCategories = categories.map((c) => c.category)

  const categoryColors: Record<string, string> = {
    "Research": "bg-blue-100 text-blue-700",
    "Technical": "bg-indigo-100 text-indigo-700",
    "Process": "bg-green-100 text-green-700",
    "Compliance": "bg-amber-100 text-amber-700",
    "Best Practice": "bg-purple-100 text-purple-700",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">R&D Knowledge Base</h1>
          <p className="mt-1 text-sm text-slate-500">
            Shared knowledge and documentation for R&D projects
          </p>
        </div>
        <Link
          href="/rd/knowledge/new"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Article
        </Link>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <form className="flex-1" method="GET">
          <input type="hidden" name="category" value={category} />
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search articles..."
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/rd/knowledge"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              !category ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All
          </Link>
          {uniqueCategories.map((cat) => (
            <Link
              key={cat}
              href={`/rd/knowledge?category=${encodeURIComponent(cat)}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                category === cat ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </Link>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/rd/knowledge/${article.id}`}
            className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900 line-clamp-2">
                {article.title}
              </h3>
              <span
                className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  categoryColors[article.category] || "bg-slate-100 text-slate-700"
                }`}
              >
                {article.category}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500 line-clamp-3">{article.content}</p>
            {article.tags && (
              <div className="mt-3 flex flex-wrap gap-1">
                {article.tags.split(",").map((tag) => (
                  <span
                    key={tag.trim()}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
                  >
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>{article.author?.name || article.author?.email || "Unknown"}</span>
              <span>{formatDate(article.updatedAt)}</span>
            </div>
            {article.project && (
              <div className="mt-1 text-xs text-indigo-500">
                Project: {article.project.name}
              </div>
            )}
          </Link>
        ))}
      </div>

      {articles.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-slate-400">
            {search || category
              ? "No articles match your search criteria."
              : "No knowledge base articles yet. Create your first one."}
          </p>
        </div>
      )}
    </div>
  )
}
