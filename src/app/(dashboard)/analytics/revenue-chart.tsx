"use client"

import { useEffect, useRef } from "react"

interface RevenueByCustomerChartProps {
  data: { name: string; amount: number }[]
}

export function RevenueByCustomerChart({ data }: RevenueByCustomerChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length === 0) return

    function draw() {
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)

      const w = rect.width
      const h = rect.height
      const padding = { top: 10, right: 20, bottom: 60, left: 80 }
      const chartW = w - padding.left - padding.right
      const chartH = h - padding.top - padding.bottom

      const maxVal = Math.max(...data.map((d) => d.amount), 1)

      // Background
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, w, h)

      const barWidth = Math.min(chartW / data.length - 8, 48)
      const gap = (chartW - barWidth * data.length) / (data.length + 1)

      // Grid lines
      ctx.strokeStyle = "#e2e8f0"
      ctx.lineWidth = 1
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (i / 4) * chartH
        ctx.beginPath()
        ctx.moveTo(padding.left, y)
        ctx.lineTo(w - padding.right, y)
        ctx.stroke()

        const val = maxVal - (i / 4) * maxVal
        ctx.fillStyle = "#94a3b8"
        ctx.font = "11px sans-serif"
        ctx.textAlign = "right"
        ctx.fillText(
          new Intl.NumberFormat("en-AU", {
            style: "currency",
            currency: "AUD",
            notation: "compact",
            maximumFractionDigits: 0,
          }).format(val),
          padding.left - 8,
          y + 4
        )
      }

      // Bars
      data.forEach((item, i) => {
        const x = padding.left + gap + i * (barWidth + gap)
        const barH = (item.amount / maxVal) * chartH
        const y = padding.top + chartH - barH

        ctx.fillStyle = "#6366f1"
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0])
        ctx.fill()

        // Label
        ctx.fillStyle = "#64748b"
        ctx.font = "10px sans-serif"
        ctx.textAlign = "center"
        ctx.save()
        ctx.translate(x + barWidth / 2, padding.top + chartH + 12)
        ctx.rotate(-Math.PI / 6)
        const label =
          item.name.length > 14 ? item.name.slice(0, 12) + "..." : item.name
        ctx.fillText(label, 0, 0)
        ctx.restore()
      })
    }

    draw()
    window.addEventListener("resize", draw)
    return () => window.removeEventListener("resize", draw)
  }, [data])

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: "300px" }}
    />
  )
}
