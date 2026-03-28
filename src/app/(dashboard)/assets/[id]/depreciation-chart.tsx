"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import {
  PremiumTooltip,
} from "@/components/charts/chart-wrapper"
import { cn } from "@/lib/utils"

interface DepreciationSchedule {
  id: string
  periodStart: string
  periodEnd: string
  openingValue: number
  depreciationAmount: number
  accumulatedDepreciation: number
  closingValue: number
  status: string
}

interface Props {
  schedules: DepreciationSchedule[]
  purchasePrice: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function depFormatter(value: any, name: any) {
  const num = Number(value ?? 0)
  const formatted = `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const label = name === "bookValue" ? "Book Value" : "Depreciation"
  return [formatted, label]
}

export default function DepreciationChart({ schedules, purchasePrice }: Props) {
  const chartData = schedules.map((sched) => ({
    period: new Date(sched.periodStart).toLocaleDateString("en-AU", {
      month: "short",
      year: "2-digit",
    }),
    bookValue: Math.round(sched.closingValue * 100) / 100,
    depreciation: Math.round(sched.depreciationAmount * 100) / 100,
  }))

  const fmt = (n: number) =>
    `$${n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border h-64",
      "border-slate-200/60 dark:border-slate-700/40",
      "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
    )}>
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, #3b82f640, #3b82f6, #3b82f640, transparent)" }}
      />
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8} />
            </linearGradient>
            <filter id="depBarGlow">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.12" />
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" vertical={false} />
          <XAxis
            dataKey="period"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 500 }}
          />
          <YAxis
            tickFormatter={fmt}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            width={55}
          />
          <Tooltip
            formatter={depFormatter}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="rounded-xl border border-white/20 bg-slate-900/90 px-4 py-3 shadow-2xl backdrop-blur-xl">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
                  {payload.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between gap-6">
                      <span className="text-xs text-slate-300">
                        {entry.dataKey === "bookValue" ? "Book Value" : "Depreciation"}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-white">
                        ${Number(entry.value ?? 0).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )
            }}
          />
          <ReferenceLine
            y={purchasePrice}
            stroke="#94a3b8"
            strokeDasharray="6 4"
            label={{ value: "Purchase Price", fontSize: 9, fill: "#94a3b8" }}
          />
          <Bar
            dataKey="bookValue"
            fill="url(#depGrad)"
            radius={[6, 6, 2, 2]}
            maxBarSize={28}
            name="bookValue"
            filter="url(#depBarGlow)"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
