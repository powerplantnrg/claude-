import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import { KnowledgeArticleActions } from "./article-actions"

const categoryColors: Record<string, string> = {
  Research: "bg-blue-100 text-blue-700",
  Technical: "bg-indigo-100 text-indigo-700",
  Process: "bg-green-100 text-green-700",
  Compliance: "bg-amber-100 text-amber-700",
  "Best Practice": "bg-purple-100 text-purple-700",
}

export default async function KnowledgeArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string
  const { id } = await params

  const article = await prisma.knowledgeBase.findFirst({
    where: { id, organizationId: orgId },
    include: {
      author: { select: { name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
  })

  if (!article) notFound()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/rd/knowledge" className="hover:text-blue-600">
          Knowledge Base
        </Link>
        <span>/</span>
        <span className="text-slate-700 line-clamp-1">{article.title}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {article.title}
            </h1>
            <span
              className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                categoryColors[article.category] ||
                "bg-slate-100 text-slate-700"
              }`}
            >
              {article.category}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
            <span>
              By{" "}
              <span className="font-medium text-slate-700">
                {article.author?.name || article.author?.email || "Unknown"}
              </span>
            </span>
            <span>{formatDate(article.updatedAt)}</span>
          </div>
        </div>
        <KnowledgeArticleActions articleId={article.id} />
      </div>

      {/* Tags */}
      {article.tags && (
        <div className="flex flex-wrap gap-2">
          {article.tags.split(",").map((tag) => (
            <span
              key={tag.trim()}
              className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600"
            >
              {tag.trim()}
            </span>
          ))}
        </div>
      )}

      {/* Linked Project */}
      {article.project && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
          <span className="text-sm text-indigo-600">
            Linked Project:{" "}
            <span className="font-medium text-indigo-800">
              {article.project.name}
            </span>
          </span>
        </div>
      )}

      {/* Content */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="prose prose-slate max-w-none">
          <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {article.content}
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Details</h3>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Created</dt>
            <dd className="mt-0.5 font-medium text-slate-700">
              {formatDate(article.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Last Updated</dt>
            <dd className="mt-0.5 font-medium text-slate-700">
              {formatDate(article.updatedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Published</dt>
            <dd className="mt-0.5 font-medium text-slate-700">
              {article.isPublished ? "Yes" : "No"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Category</dt>
            <dd className="mt-0.5 font-medium text-slate-700">
              {article.category}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
