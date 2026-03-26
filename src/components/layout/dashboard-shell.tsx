"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { QuickActions } from "@/components/layout/quick-actions"
import { KeyboardShortcuts } from "@/components/layout/keyboard-shortcuts"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onToggleMobileSidebar={() => setMobileOpen((prev) => !prev)} />
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 sm:p-6">
          {children}
        </main>
      </div>
      <QuickActions />
      <KeyboardShortcuts />
    </div>
  )
}
