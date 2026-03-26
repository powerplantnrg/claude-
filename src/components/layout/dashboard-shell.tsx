"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { FavoritesBar } from "@/components/layout/favorites-bar"
import { QuickActions } from "@/components/layout/quick-actions"
import { KeyboardShortcuts } from "@/components/layout/keyboard-shortcuts"
import { ToastContainer } from "@/components/ui/toast"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onToggleMobileSidebar={() => setMobileOpen((prev) => !prev)} />
        <FavoritesBar />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 sm:p-6"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
      <QuickActions />
      <KeyboardShortcuts />
      <ToastContainer />
    </div>
  )
}
