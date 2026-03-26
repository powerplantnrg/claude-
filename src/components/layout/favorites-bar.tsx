"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Star, X } from "lucide-react"

interface Favorite {
  id: string
  label: string
  path: string
  icon: string | null
  order: number
}

export function FavoritesBar() {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const pathname = usePathname()

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await fetch("/api/favorites")
      if (res.ok) {
        const data = await res.json()
        setFavorites(data)
      }
    } catch {
      // ignore fetch errors silently
    }
  }, [])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  // Listen for custom event when favorites change
  useEffect(() => {
    const handler = () => fetchFavorites()
    window.addEventListener("favorites-updated", handler)
    return () => window.removeEventListener("favorites-updated", handler)
  }, [fetchFavorites])

  const removeFavorite = async (path: string) => {
    try {
      await fetch(`/api/favorites?path=${encodeURIComponent(path)}`, {
        method: "DELETE",
      })
      setFavorites((prev) => prev.filter((f) => f.path !== path))
      window.dispatchEvent(new CustomEvent("favorites-updated"))
    } catch {
      // ignore
    }
  }

  if (favorites.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 sm:px-6 py-1.5 overflow-x-auto">
      <Star className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
      {favorites.map((fav) => (
        <div
          key={fav.id}
          className={`group flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors flex-shrink-0 ${
            pathname === fav.path
              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          }`}
        >
          <Link href={fav.path} className="whitespace-nowrap">
            {fav.label}
          </Link>
          <button
            onClick={(e) => {
              e.preventDefault()
              removeFavorite(fav.path)
            }}
            className="ml-0.5 hidden group-hover:inline-flex items-center justify-center h-3.5 w-3.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600"
            aria-label={`Remove ${fav.label} from favorites`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

export function FavoriteToggle() {
  const pathname = usePathname()
  const [isFavorited, setIsFavorited] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const res = await fetch("/api/favorites")
        if (res.ok) {
          const data: Favorite[] = await res.json()
          if (!cancelled) {
            setIsFavorited(data.some((f) => f.path === pathname))
          }
        }
      } catch {
        // ignore
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [pathname])

  // Listen for external updates
  useEffect(() => {
    const handler = async () => {
      try {
        const res = await fetch("/api/favorites")
        if (res.ok) {
          const data: Favorite[] = await res.json()
          setIsFavorited(data.some((f) => f.path === pathname))
        }
      } catch {
        // ignore
      }
    }
    window.addEventListener("favorites-updated", handler)
    return () => window.removeEventListener("favorites-updated", handler)
  }, [pathname])

  const toggleFavorite = async () => {
    if (loading) return
    setLoading(true)
    try {
      if (isFavorited) {
        await fetch(`/api/favorites?path=${encodeURIComponent(pathname)}`, {
          method: "DELETE",
        })
        setIsFavorited(false)
      } else {
        // Derive a label from the pathname
        const segments = pathname.split("/").filter(Boolean)
        const label = segments
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(" / ")

        await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, path: pathname }),
        })
        setIsFavorited(true)
      }
      window.dispatchEvent(new CustomEvent("favorites-updated"))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Star
        className={`h-4.5 w-4.5 transition-colors ${
          isFavorited
            ? "fill-amber-400 text-amber-400"
            : "text-slate-400 dark:text-slate-500"
        }`}
      />
    </button>
  )
}
