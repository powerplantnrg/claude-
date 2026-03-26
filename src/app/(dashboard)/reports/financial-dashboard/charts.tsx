"use client"

export function BarChart({
  data,
  maxValue,
  barColor = "bg-indigo-500",
  height = 200,
}: {
  data: { label: string; value: number }[]
  maxValue: number
  barColor?: string
  height?: number
}) {
  const safeMax = maxValue > 0 ? maxValue : 1
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((item, i) => {
        const barHeight = Math.max((Math.abs(item.value) / safeMax) * height * 0.85, 2)
        const isNegative = item.value < 0
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="relative w-full flex flex-col items-center justify-end" style={{ height: height * 0.85 }}>
              <div
                className={`w-full max-w-[32px] rounded-t ${isNegative ? "bg-rose-400" : barColor} transition-all`}
                style={{ height: barHeight }}
                title={`${item.label}: $${item.value.toLocaleString()}`}
              />
            </div>
            <span className="text-[10px] text-slate-500 truncate w-full text-center">{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export function DonutChart({
  segments,
  size = 180,
}: {
  segments: { label: string; value: number; color: string }[]
  size?: number
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <p className="text-sm text-slate-400">No data</p>
      </div>
    )
  }

  const radius = 70
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox="0 0 200 200">
        {segments.map((seg, i) => {
          const pct = seg.value / total
          const dash = circumference * pct
          const gap = circumference - dash
          const currentOffset = offset
          offset += dash
          return (
            <circle
              key={i}
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth="30"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-currentOffset}
              transform="rotate(-90 100 100)"
            />
          )
        })}
        <text x="100" y="95" textAnchor="middle" className="text-lg font-bold fill-slate-700" fontSize="18">
          ${(total / 1000).toFixed(0)}k
        </text>
        <text x="100" y="115" textAnchor="middle" className="fill-slate-400" fontSize="12">
          Total
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-3">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-slate-600">{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TrendLine({
  data,
  height = 60,
  color = "#6366f1",
}: {
  data: number[]
  height?: number
  color?: string
}) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 200

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 10) - 5
    return `${x},${y}`
  }).join(" ")

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
      />
    </svg>
  )
}

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
}: {
  title: string
  value: string
  subtitle?: string
  trend?: "up" | "down" | "neutral"
  trendLabel?: string
}) {
  const trendColor = trend === "up" ? "text-emerald-600" : trend === "down" ? "text-rose-600" : "text-slate-400"
  const trendArrow = trend === "up" ? "\u2191" : trend === "down" ? "\u2193" : ""

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {(subtitle || trendLabel) && (
        <div className="mt-1 flex items-center gap-2">
          {trendLabel && (
            <span className={`text-sm font-medium ${trendColor}`}>
              {trendArrow} {trendLabel}
            </span>
          )}
          {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
        </div>
      )}
    </div>
  )
}
