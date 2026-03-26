"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

interface EvidenceItem {
  id: string
  fileName: string
  fileType: string
  filePath: string
  fileSize: number | null
  description: string | null
  category: string
  uploadedAt: string
  rdActivity: { id: string; name: string }
}

interface Activity {
  id: string
  name: string
}

const categoryColor: Record<string, string> = {
  Technical: "bg-violet-100 text-violet-700",
  Financial: "bg-green-100 text-green-700",
  TimeRecord: "bg-blue-100 text-blue-700",
  Experiment: "bg-indigo-100 text-indigo-700",
  Other: "bg-slate-100 text-slate-700",
}

export default function EvidencePage() {
  const params = useParams()
  const projectId = params.id as string

  const [evidence, setEvidence] = useState<EvidenceItem[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    rdActivityId: "",
    description: "",
    category: "Technical",
  })

  const fetchData = useCallback(async () => {
    try {
      const [evidenceRes, activitiesRes] = await Promise.all([
        fetch(`/api/rd/evidence?projectId=${projectId}`),
        fetch(`/api/rd/activities?projectId=${projectId}`),
      ])
      if (evidenceRes.ok) setEvidence(await evidenceRes.json())
      if (activitiesRes.ok) {
        const acts = await activitiesRes.json()
        setActivities(acts)
        if (acts.length > 0 && !form.rdActivityId) {
          setForm((f) => ({ ...f, rdActivityId: acts[0].id }))
        }
      }
    } finally {
      setLoading(false)
    }
  }, [projectId, form.rdActivityId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    if (!form.rdActivityId) {
      setError("Please select an activity first")
      return
    }

    setUploading(true)
    setError("")

    try {
      for (const file of Array.from(files)) {
        // Upload file
        const formData = new FormData()
        formData.append("file", file)

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!uploadRes.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }

        const uploadData = await uploadRes.json()

        // Save evidence metadata
        const evidenceRes = await fetch("/api/rd/evidence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rdActivityId: form.rdActivityId,
            fileName: uploadData.fileName,
            fileType: uploadData.fileType,
            filePath: uploadData.filePath,
            fileSize: uploadData.fileSize,
            description: form.description || null,
            category: form.category,
          }),
        })

        if (!evidenceRes.ok) {
          throw new Error(`Failed to save evidence for ${file.name}`)
        }
      }

      setForm((f) => ({ ...f, description: "" }))
      fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFileUpload(e.dataTransfer.files)
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return "\u2014"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/rd" className="hover:text-indigo-600">
          R&D Intelligence
        </Link>
        <span>/</span>
        <Link href="/rd/projects" className="hover:text-indigo-600">
          Projects
        </Link>
        <span>/</span>
        <Link
          href={`/rd/projects/${projectId}`}
          className="hover:text-indigo-600"
        >
          Project
        </Link>
        <span>/</span>
        <span className="text-slate-700">Evidence</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Evidence</h1>
        <p className="text-sm text-slate-500">
          Upload and manage R&D evidence documentation
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Upload Area */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">
          Upload Evidence
        </h3>
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Activity
            </label>
            <select
              value={form.rdActivityId}
              onChange={(e) =>
                setForm({ ...form, rdActivityId: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {activities.length === 0 ? (
                <option value="">No activities available</option>
              ) : (
                activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="Technical">Technical</option>
              <option value="Financial">Financial</option>
              <option value="TimeRecord">Time Record</option>
              <option value="Experiment">Experiment</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Brief description"
            />
          </div>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            dragOver
              ? "border-indigo-400 bg-indigo-50"
              : "border-slate-300 bg-slate-50 hover:border-indigo-300"
          }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
              <span className="text-sm text-slate-600">Uploading...</span>
            </div>
          ) : (
            <>
              <svg
                className="mx-auto h-10 w-10 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              <p className="mt-2 text-sm text-slate-600">
                Drag and drop files here, or{" "}
                <label className="cursor-pointer font-medium text-indigo-600 hover:text-indigo-700">
                  browse
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                </label>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                PDF, DOC, images, spreadsheets, or any relevant files
              </p>
            </>
          )}
        </div>
      </div>

      {/* Uploaded Files */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Uploaded Evidence ({evidence.length})
          </h3>
        </div>
        {evidence.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-500">
            No evidence uploaded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {evidence.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-6 py-3 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <svg
                    className="h-8 w-8 flex-shrink-0 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900 text-sm">
                      {item.fileName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {item.rdActivity.name}
                      {item.description && ` \u2014 ${item.description}`}
                    </p>
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {formatFileSize(item.fileSize)}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      categoryColor[item.category] ||
                      "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {item.category}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(item.uploadedAt).toLocaleDateString("en-AU")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
