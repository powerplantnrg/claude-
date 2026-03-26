"use client"

import { useState } from "react"

export function EmailPreviewActions({ emailHtml }: { emailHtml: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopyHtml() {
    try {
      await navigator.clipboard.writeText(emailHtml)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = emailHtml
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      <button
        onClick={() => window.print()}
        className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
      >
        Print / Save PDF
      </button>
      <button
        onClick={handleCopyHtml}
        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
      >
        {copied ? "Copied!" : "Copy HTML"}
      </button>
    </>
  )
}
