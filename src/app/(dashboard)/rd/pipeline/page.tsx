import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/utils"
import Link from "next/link"

const DEFAULT_STAGES = [
  { name: "Ideation", order: 0 },
  { name: "Planning", order: 1 },
  { name: "In Progress", order: 2 },
  { name: "Analysis", order: 3 },
  { name: "Complete", order: 4 },
]

const STAGE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Ideation: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", dot: "bg-slate-400" },
  Planning: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
  "In Progress": { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  Analysis: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", dot: "bg-violet-500" },
  Complete: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
}

export default async function PipelinePage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  // Get pipeline stages
  let stages = await prisma.rdPipelineStage.findMany({
    where: { organizationId: orgId },
    include: {
      experiments: {
        include: {
          rdActivity: {
            include: {
              rdProject: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { stageOrder: "asc" },
  })

  // Get all experiments (including unassigned ones)
  const allExperiments = await prisma.experiment.findMany({
    where: {
      rdActivity: { rdProject: { organizationId: orgId } },
    },
    include: {
      rdActivity: {
        include: {
          rdProject: { select: { id: true, name: true } },
        },
      },
      pipelineStage: true,
    },
    orderBy: { updatedAt: "desc" },
  })

  const unassignedExperiments = allExperiments.filter((e) => !e.pipelineStageId)

  // If no stages exist, build the view from experiment statuses
  const useDefaultView = stages.length === 0

  type ExperimentData = {
    id: string
    name: string
    status: string
    hypothesis: string | null
    projectName: string
    projectId: string
    startDate: Date | null
    iterationNumber: number
  }

  let columns: { name: string; experiments: ExperimentData[] }[]

  if (useDefaultView) {
    // Group by experiment status mapped to default stages
    const statusToStage: Record<string, string> = {
      Planned: "Ideation",
      Running: "In Progress",
      Completed: "Complete",
      Failed: "Analysis",
    }

    columns = DEFAULT_STAGES.map((stage) => ({
      name: stage.name,
      experiments: allExperiments
        .filter((e) => (statusToStage[e.status] || "Ideation") === stage.name)
        .map((e) => ({
          id: e.id,
          name: e.name,
          status: e.status,
          hypothesis: e.hypothesis,
          projectName: e.rdActivity.rdProject.name,
          projectId: e.rdActivity.rdProject.id,
          startDate: e.startDate,
          iterationNumber: e.iterationNumber,
        })),
    }))
  } else {
    columns = stages.map((stage) => ({
      name: stage.name,
      experiments: stage.experiments.map((e) => ({
        id: e.id,
        name: e.name,
        status: e.status,
        hypothesis: e.hypothesis,
        projectName: e.rdActivity.rdProject.name,
        projectId: e.rdActivity.rdProject.id,
        startDate: e.startDate,
        iterationNumber: e.iterationNumber,
      })),
    }))

    // Add unassigned column if needed
    if (unassignedExperiments.length > 0) {
      columns.unshift({
        name: "Unassigned",
        experiments: unassignedExperiments.map((e) => ({
          id: e.id,
          name: e.name,
          status: e.status,
          hypothesis: e.hypothesis,
          projectName: e.rdActivity.rdProject.name,
          projectId: e.rdActivity.rdProject.id,
          startDate: e.startDate,
          iterationNumber: e.iterationNumber,
        })),
      })
    }
  }

  const totalExperiments = allExperiments.length
  const statusDot: Record<string, string> = {
    Planned: "bg-slate-400",
    Running: "bg-blue-500",
    Completed: "bg-green-500",
    Failed: "bg-red-500",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/rd" className="hover:text-indigo-600">R&D Intelligence</Link>
        <span>/</span>
        <span className="text-slate-700">Pipeline</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">R&D Pipeline</h1>
          <p className="mt-1 text-sm text-slate-500">
            {totalExperiments} experiments across {columns.length} stages
          </p>
        </div>
        <Link
          href="/rd/experiments"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          All Experiments
        </Link>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => {
          const colors = STAGE_COLORS[column.name] || STAGE_COLORS["Ideation"]
          return (
            <div key={column.name} className="min-w-[280px] flex-shrink-0">
              {/* Column Header */}
              <div className={`flex items-center gap-2 rounded-t-xl ${colors.bg} ${colors.border} border px-4 py-3`}>
                <span className={`h-2.5 w-2.5 rounded-full ${colors.dot}`} />
                <h3 className={`text-sm font-semibold ${colors.text}`}>{column.name}</h3>
                <span className={`ml-auto rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium ${colors.text}`}>
                  {column.experiments.length}
                </span>
              </div>

              {/* Cards */}
              <div className={`space-y-2 rounded-b-xl border-x border-b ${colors.border} bg-white/50 p-2`} style={{ minHeight: "200px" }}>
                {column.experiments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No experiments
                  </div>
                ) : (
                  column.experiments.map((experiment) => (
                    <div
                      key={experiment.id}
                      className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-medium text-slate-900 line-clamp-2">
                          {experiment.name}
                        </h4>
                        <div className="flex items-center gap-1">
                          <span className={`h-2 w-2 rounded-full ${statusDot[experiment.status] || "bg-slate-400"}`} />
                        </div>
                      </div>
                      {experiment.hypothesis && (
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                          {experiment.hypothesis}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <Link
                          href={`/rd/projects/${experiment.projectId}`}
                          className="text-xs text-indigo-600 hover:text-indigo-700 truncate max-w-[140px]"
                        >
                          {experiment.projectName}
                        </Link>
                        <span className="text-xs text-slate-400">
                          #{experiment.iterationNumber}
                        </span>
                      </div>
                      {experiment.startDate && (
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(experiment.startDate)}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {totalExperiments === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
          <p className="mt-2 text-sm text-slate-500">No experiments yet. Create projects and add experiments to see them in the pipeline.</p>
          <Link href="/rd/projects" className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Go to Projects
          </Link>
        </div>
      )}
    </div>
  )
}
