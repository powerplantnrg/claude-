"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const ENTITY_TYPES = [
  "General",
  "Invoice",
  "Bill",
  "Expense",
  "Contact",
  "Project",
  "Asset",
  "Employee",
]

export default function DocumentUploadPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [fileName, setFileName] = useState("")
  const [fileSize, setFileSize] = useState(0)
  const [mimeType, setMimeType] = useState("")
  const [entityType, setEntityType] = useState("General")
  const [entityId, setEntityId] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  function handleFileSelect(file: File) {
    setFileName(file.name)
    setFileSize(file.size)
    setMimeType(file.type || "application/octet-stream")
    if (!name) {
      setName(file.name.replace(/\.[^/.]+$/, ""))
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  function addTag() {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.split(",").map((t) => t.trim()).includes(trimmed)) {
      setTags(tags ? `${tags}, ${trimmed}` : trimmed)
      setTagInput("")
    }
  }

  function removeTag(tagToRemove: string) {
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t !== tagToRemove)
    setTags(tagList.join(", "))
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      addTag()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const storageKey = `uploads/${Date.now()}-${fileName}`

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          fileName,
          fileSize,
          mimeType,
          storageKey,
          entityType,
          entityId: entityId || undefined,
          description: description || undefined,
          tags: tags || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to upload document")
        return
      }

      router.push("/documents")
      router.refresh()
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const tagList = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/documents"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Back to Documents
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Upload Document</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload a file and link it to a record in the system
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Drag and Drop Zone */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            File
          </label>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
              isDragging
                ? "border-indigo-400 bg-indigo-50"
                : fileName
                  ? "border-green-300 bg-green-50"
                  : "border-slate-300 bg-slate-50 hover:border-slate-400"
            }`}
          >
            {fileName ? (
              <>
                <svg
                  className="h-10 w-10 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {fileName}
                </p>
                <p className="text-xs text-slate-500">
                  {(fileSize / 1024).toFixed(1)} KB - {mimeType}
                </p>
                <label className="mt-3 cursor-pointer text-xs font-medium text-indigo-600 hover:text-indigo-700">
                  Choose a different file
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleInputChange}
                  />
                </label>
              </>
            ) : (
              <>
                <svg
                  className="h-10 w-10 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
                <p className="mt-2 text-sm text-slate-600">
                  <label className="cursor-pointer font-medium text-indigo-600 hover:text-indigo-700">
                    Choose a file
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleInputChange}
                    />
                  </label>{" "}
                  or drag and drop
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  PDF, images, spreadsheets, documents up to 50MB
                </p>
              </>
            )}
          </div>
        </div>

        {/* Document Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Document Details</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Enter document name"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional description..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Entity Linking */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Link to Record</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Entity Type
              </label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {ENTITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Entity ID
              </label>
              <input
                type="text"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder="Search or enter entity ID..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Tags</h2>

          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add a tag and press Enter..."
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={addTag}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
            >
              Add
            </button>
          </div>

          {tagList.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tagList.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 text-indigo-400 hover:text-indigo-600"
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/documents"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!fileName || !name || isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      </form>
    </div>
  )
}
