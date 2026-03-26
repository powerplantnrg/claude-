"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, FileText, CheckCircle2, AlertCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadZoneProps {
  entityType: string
  accept?: string
  onFileSelect?: (file: File) => void
  onPaste?: (csvText: string) => void
  status?: "idle" | "parsing" | "success" | "error"
  recordCount?: number
  parseErrors?: string[]
  className?: string
}

export function FileUploadZone({
  entityType,
  accept = ".csv,.xlsx,.xls",
  onFileSelect,
  onPaste,
  status = "idle",
  recordCount,
  parseErrors = [],
  className,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [showPaste, setShowPaste] = useState(false)
  const [pasteValue, setPasteValue] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) {
        setFileName(file.name)
        onFileSelect?.(file)
      }
    },
    [onFileSelect]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setFileName(file.name)
        onFileSelect?.(file)
      }
    },
    [onFileSelect]
  )

  const handlePasteSubmit = useCallback(() => {
    if (pasteValue.trim()) {
      onPaste?.(pasteValue.trim())
    }
  }, [pasteValue, onPaste])

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">{entityType}</h4>
        {status === "success" && recordCount !== undefined && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            <CheckCircle2 className="h-3 w-3" />
            {recordCount} records parsed
          </span>
        )}
        {status === "parsing" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            Parsing...
          </span>
        )}
        {status === "error" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
            <AlertCircle className="h-3 w-3" />
            Error
          </span>
        )}
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          isDragging && "border-indigo-400 bg-indigo-50",
          !isDragging && status === "idle" && "border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50",
          status === "success" && "border-green-300 bg-green-50",
          status === "error" && "border-red-300 bg-red-50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
        {status === "success" && fileName ? (
          <div className="flex items-center justify-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">{fileName}</span>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm text-slate-600">
              Drag & drop your <span className="font-medium">{entityType}</span> file here
            </p>
            <p className="mt-1 text-xs text-slate-400">CSV, XLSX, or XLS</p>
          </>
        )}
      </div>

      {/* Paste CSV option */}
      <div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setShowPaste(!showPaste)
          }}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          {showPaste ? "Hide paste option" : "Or paste CSV data"}
        </button>
        {showPaste && (
          <div className="mt-2 space-y-2">
            <textarea
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
              placeholder="Paste CSV data here..."
              rows={4}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handlePasteSubmit}
              disabled={!pasteValue.trim()}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Parse Pasted Data
            </button>
          </div>
        )}
      </div>

      {/* Parse errors */}
      {parseErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-800">Parse Errors:</p>
          <ul className="mt-1 space-y-0.5">
            {parseErrors.map((err, i) => (
              <li key={i} className="text-xs text-red-600">
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
