"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { ShortcutsHelp } from "./shortcuts-help"

export function KeyboardShortcuts() {
  const [helpOpen, setHelpOpen] = useState(false)
  const router = useRouter()
  const waitingForSecondKey = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearSequence = useCallback(() => {
    waitingForSecondKey.current = false
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    function isInputFocused() {
      const el = document.activeElement
      if (!el) return false
      const tag = el.tagName.toLowerCase()
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (el as HTMLElement).isContentEditable
      )
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl+K is handled by QuickActions, skip here
      if ((e.metaKey || e.ctrlKey) && e.key === "k") return

      // Ignore when typing in inputs
      if (isInputFocused()) return

      // ? key for help
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setHelpOpen((prev) => !prev)
        clearSequence()
        return
      }

      // G-sequence navigation
      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (!waitingForSecondKey.current) {
          waitingForSecondKey.current = true
          // Reset after 1 second if no second key pressed
          timeoutRef.current = setTimeout(clearSequence, 1000)
          return
        }
      }

      if (waitingForSecondKey.current) {
        clearSequence()
        const routes: Record<string, string> = {
          d: "/dashboard",
          i: "/invoices",
          b: "/bills",
          r: "/reports",
          p: "/rd/projects",
        }
        const route = routes[e.key.toLowerCase()]
        if (route) {
          e.preventDefault()
          router.push(route)
        }
        return
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      clearSequence()
    }
  }, [router, clearSequence])

  // Escape to close help
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && helpOpen) {
        e.preventDefault()
        setHelpOpen(false)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [helpOpen])

  return <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
}
