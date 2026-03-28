"use client"

import { useState, useRef, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import {
  LogOut,
  Building2,
  Menu,
  Settings,
  User,
  ChevronDown,
  Shield,
} from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { GlobalSearch } from "./global-search"
import { Notifications } from "./notifications"
import { FavoriteToggle } from "./favorites-bar"
import { Breadcrumbs } from "./breadcrumbs"
import { cn } from "@/lib/utils"

interface HeaderProps {
  onToggleMobileSidebar?: () => void
}

export function Header({ onToggleMobileSidebar }: HeaderProps) {
  const { data: session } = useSession()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = session?.user as any
  const organizationName = u?.organizationName || "Organization"
  const userName = u?.name || u?.email || "User"
  const userRole = u?.role as string | undefined
  const userEmail = session?.user?.email || ""
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 8)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center justify-between px-4 sm:px-6 transition-all duration-300",
        "bg-white/70 dark:bg-slate-900/70",
        scrolled
          ? "backdrop-blur-xl backdrop-saturate-150 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]"
          : "backdrop-blur-md"
      )}
    >
      {/* Subtle gradient bottom border line */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-px transition-opacity duration-300",
          "bg-gradient-to-r from-transparent via-indigo-500/25 dark:via-indigo-400/20 to-transparent",
          scrolled ? "opacity-100" : "opacity-40"
        )}
      />

      {/* Left side: hamburger + breadcrumbs */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onToggleMobileSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Breadcrumbs />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Favorite Toggle */}
        <FavoriteToggle />

        {/* Global Search */}
        <GlobalSearch />

        {/* Vertical separator */}
        <div className="hidden sm:block h-5 w-px bg-gradient-to-b from-transparent via-slate-300/60 dark:via-slate-600/60 to-transparent mx-1.5" />

        {/* Organization badge */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/40 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          <Building2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
          <span className="max-w-[120px] truncate">{organizationName}</span>
        </div>

        {/* Vertical separator */}
        <div className="hidden sm:block h-5 w-px bg-gradient-to-b from-transparent via-slate-300/60 dark:via-slate-600/60 to-transparent mx-1.5" />

        {/* Notifications */}
        <Notifications />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Vertical separator */}
        <div className="h-5 w-px bg-gradient-to-b from-transparent via-slate-300/60 dark:via-slate-600/60 to-transparent mx-1.5" />

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={cn(
              "group flex items-center gap-2 rounded-xl px-1.5 py-1 text-sm transition-all duration-200",
              "hover:bg-slate-100/80 dark:hover:bg-slate-800/60",
              dropdownOpen && "bg-slate-100/80 dark:bg-slate-800/60"
            )}
          >
            {/* Avatar with animated gradient border */}
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px] transition-shadow duration-300 group-hover:shadow-[0_0_12px_rgba(99,102,241,0.35)]">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-slate-900 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 tracking-wide">
                {initials}
              </div>
            </div>
            <ChevronDown
              className={cn(
                "hidden sm:block h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
                dropdownOpen && "rotate-180"
              )}
            />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div
              className={cn(
                "absolute right-0 top-full mt-2 w-72 origin-top-right",
                "rounded-2xl border border-slate-200/80 dark:border-slate-700/60",
                "bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl",
                "shadow-xl shadow-slate-900/[0.08] dark:shadow-slate-900/40",
                "ring-1 ring-black/[0.03]",
                "animate-[dropdownIn_0.2s_ease-out] z-50"
              )}
            >
              {/* User info header */}
              <div className="p-4 border-b border-slate-100/80 dark:border-slate-700/60">
                <div className="flex items-start gap-3">
                  {/* Large avatar with gradient border */}
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-sm">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-slate-800 text-sm font-bold text-indigo-600 dark:text-indigo-400 tracking-wide">
                      {initials}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {userName}
                    </p>
                    {userRole && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100/80 dark:border-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        <Shield className="h-2.5 w-2.5" />
                        {userRole}
                      </span>
                    )}
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 truncate">
                      {userEmail}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1.5 px-1.5">
                <button
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group/item"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 group-hover/item:bg-indigo-50 group-hover/item:text-indigo-600 dark:group-hover/item:bg-indigo-500/10 dark:group-hover/item:text-indigo-400 transition-colors">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <span>Profile</span>
                </button>
                <button
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group/item"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 group-hover/item:bg-indigo-50 group-hover/item:text-indigo-600 dark:group-hover/item:bg-indigo-500/10 dark:group-hover/item:text-indigo-400 transition-colors">
                    <Settings className="h-3.5 w-3.5" />
                  </div>
                  <span>Settings</span>
                </button>
              </div>

              <div className="mx-3 h-px bg-gradient-to-r from-transparent via-slate-200/80 dark:via-slate-700/60 to-transparent" />

              {/* Sign out */}
              <div className="py-1.5 px-1.5">
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors group/item"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 group-hover/item:bg-red-100 dark:group-hover/item:bg-red-500/20 transition-colors">
                    <LogOut className="h-3.5 w-3.5" />
                  </div>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
