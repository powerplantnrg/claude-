"use client"

import { useEffect, useRef } from "react"

interface ForecastChartProps {
  historicalLabels: string[]
  historicalRevenue: number[]
  historicalExpenses: number[]
  projectedLabels: string[]
  projectedRevenue: number[]
  projectedExpenses: number[]
  projectedCashFlow: number[]
}

function drawChart(
  canvas: HTMLCanvasElement,
  {
    historicalLabels,
    historicalRevenue,
    historicalExpenses,
    projectedLabels,
    projectedRevenue,
    projectedExpenses,
    projectedCashFlow,
  }: ForecastChartProps
) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  const w = rect.width
  const h = rect.height
  const padding = { top: 30, right: 20, bottom: 50, left: 70 }
  const chartW = w - padding.left - padding.right
  const chartH = h - padding.top - padding.bottom

  const allLabels = [...historicalLabels, ...projectedLabels]
  const allValues = [
    ...historicalRevenue,
    ...historicalExpenses,
    ...projectedRevenue,
    ...projectedExpenses,
    ...projectedCashFlow,
  ]
  const maxVal = Math.max(...allValues, 1) * 1.1
  const minVal = Math.min(...allValues, 0) * (allValues.some((v) => v < 0) ? 1.1 : 0)

  const scaleX = (i: number) =>
    padding.left + (i / Math.max(allLabels.length - 1, 1)) * chartW
  const scaleY = (val: number) =>
    padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH

  // Background
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, w, h)

  // Grid lines
  ctx.strokeStyle = "#e2e8f0"
  ctx.lineWidth = 1
  const gridLines = 5
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (i / gridLines) * chartH
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(w - padding.right, y)
    ctx.stroke()

    const val = maxVal - (i / gridLines) * (maxVal - minVal)
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

  // Dividing line between historical and projected
  const dividerX = scaleX(historicalLabels.length - 0.5)
  ctx.strokeStyle = "#cbd5e1"
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(dividerX, padding.top)
  ctx.lineTo(dividerX, padding.top + chartH)
  ctx.stroke()
  ctx.setLineDash([])

  // Labels
  ctx.fillStyle = "#64748b"
  ctx.font = "10px sans-serif"
  ctx.textAlign = "center"
  ctx.fillText("Historical", dividerX - 40, padding.top - 10)
  ctx.fillText("Projected", dividerX + 40, padding.top - 10)

  // Draw line helper
  function drawLine(
    data: number[],
    startIdx: number,
    color: string,
    dashed = false
  ) {
    if (data.length === 0 || !ctx) return
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    if (dashed) ctx.setLineDash([6, 3])
    ctx.beginPath()
    for (let i = 0; i < data.length; i++) {
      const x = scaleX(startIdx + i)
      const y = scaleY(data[i])
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Historical lines (solid)
  drawLine(historicalRevenue, 0, "#22c55e")
  drawLine(historicalExpenses, 0, "#ef4444")

  // Projected lines (dashed)
  const projStart = historicalLabels.length
  drawLine(projectedRevenue, projStart, "#22c55e", true)
  drawLine(projectedExpenses, projStart, "#ef4444", true)
  drawLine(projectedCashFlow, projStart, "#6366f1", true)

  // Connect historical to projected
  if (historicalRevenue.length > 0 && projectedRevenue.length > 0) {
    ctx.strokeStyle = "#22c55e"
    ctx.lineWidth = 2
    ctx.setLineDash([6, 3])
    ctx.beginPath()
    ctx.moveTo(
      scaleX(historicalLabels.length - 1),
      scaleY(historicalRevenue[historicalRevenue.length - 1])
    )
    ctx.lineTo(scaleX(projStart), scaleY(projectedRevenue[0]))
    ctx.stroke()
    ctx.setLineDash([])
  }

  if (historicalExpenses.length > 0 && projectedExpenses.length > 0) {
    ctx.strokeStyle = "#ef4444"
    ctx.lineWidth = 2
    ctx.setLineDash([6, 3])
    ctx.beginPath()
    ctx.moveTo(
      scaleX(historicalLabels.length - 1),
      scaleY(historicalExpenses[historicalExpenses.length - 1])
    )
    ctx.lineTo(scaleX(projStart), scaleY(projectedExpenses[0]))
    ctx.stroke()
    ctx.setLineDash([])
  }

  // X-axis labels
  ctx.fillStyle = "#64748b"
  ctx.font = "10px sans-serif"
  ctx.textAlign = "center"
  for (let i = 0; i < allLabels.length; i++) {
    const x = scaleX(i)
    ctx.save()
    ctx.translate(x, padding.top + chartH + 15)
    ctx.rotate(-Math.PI / 6)
    ctx.fillText(allLabels[i], 0, 0)
    ctx.restore()
  }

  // Legend
  const legendY = h - 10
  const legends = [
    { label: "Revenue", color: "#22c55e" },
    { label: "Expenses", color: "#ef4444" },
    { label: "Cash Flow", color: "#6366f1" },
  ]
  let legendX = padding.left
  for (const { label, color } of legends) {
    ctx.fillStyle = color
    ctx.fillRect(legendX, legendY - 8, 12, 3)
    ctx.fillStyle = "#64748b"
    ctx.font = "11px sans-serif"
    ctx.textAlign = "left"
    ctx.fillText(label, legendX + 16, legendY - 3)
    legendX += ctx.measureText(label).width + 36
  }
}

export function ForecastChart(props: ForecastChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleResize = () => drawChart(canvas, props)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [props])

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 shadow-sm hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-500">
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, #6366f130, #6366f1, #8b5cf6, #6366f130, transparent)" }}
      />
      <h2 className="mb-4 text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        Financial Forecast Chart
      </h2>
      <canvas
        ref={canvasRef}
        className="w-full rounded-xl"
        style={{ height: "350px" }}
      />
    </div>
  )
}
