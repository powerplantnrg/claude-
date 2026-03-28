"use client"

import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  ChartWrapper,
  PremiumTooltip,
} from "@/components/charts/chart-wrapper"

const SCOPE_GRADIENTS = [
  { from: "#f43f5e", to: "#fb7185", color: "#f43f5e" },  // Scope1 - rose
  { from: "#f59e0b", to: "#fbbf24", color: "#f59e0b" },  // Scope2 - amber
  { from: "#3b82f6", to: "#60a5fa", color: "#3b82f6" },  // Scope3 - blue
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function co2Formatter(value: any) {
  return `${Number(value ?? 0).toFixed(1)} kg CO₂e`
}

interface ScopeData {
  name: string
  value: number
}

export function EmissionsByScopePie({ data }: { data: ScopeData[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)

  if (data.every((d) => d.value === 0)) {
    return (
      <ChartWrapper title="Emissions by Scope" subtitle="kg CO₂e distribution" accentColor="#f43f5e">
        <PieChart>
          <text x="50%" y="50%" textAnchor="middle" className="fill-slate-400 text-sm">
            No emissions data yet
          </text>
        </PieChart>
      </ChartWrapper>
    )
  }

  return (
    <ChartWrapper title="Emissions by Scope" subtitle="kg CO₂e distribution" accentColor="#f43f5e">
      <PieChart>
        <defs>
          {SCOPE_GRADIENTS.map((grad, i) => (
            <linearGradient key={i} id={`scopeGrad-${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={grad.from} />
              <stop offset="100%" stopColor={grad.to} />
            </linearGradient>
          ))}
          <filter id="scopeShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.15" />
          </filter>
        </defs>
        {/* Glow ring */}
        <Pie data={data} cx="50%" cy="50%" innerRadius={68} outerRadius={72} dataKey="value" stroke="none">
          {data.map((entry, index) => {
            const scopeIdx = entry.name === "Scope1" ? 0 : entry.name === "Scope2" ? 1 : 2
            return <Cell key={`glow-${index}`} fill={SCOPE_GRADIENTS[scopeIdx].color} opacity={0.2} />
          })}
        </Pie>
        {/* Main donut */}
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={76}
          outerRadius={115}
          paddingAngle={4}
          dataKey="value"
          stroke="none"
          cornerRadius={4}
          filter="url(#scopeShadow)"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label={({ name, percent }: any) => `${name ?? ""}: ${((percent ?? 0) * 100).toFixed(0)}%`}
          animationDuration={1200}
        >
          {data.map((entry, index) => {
            const scopeIdx = entry.name === "Scope1" ? 0 : entry.name === "Scope2" ? 1 : 2
            return <Cell key={`cell-${index}`} fill={`url(#scopeGrad-${scopeIdx})`} />
          })}
        </Pie>
        <text x="50%" y="47%" textAnchor="middle" className="fill-slate-400 text-[10px]" fontWeight={500}>
          TOTAL
        </text>
        <text x="50%" y="56%" textAnchor="middle" className="fill-slate-900 dark:fill-white text-sm" fontWeight={700}>
          {total.toFixed(0)} kg
        </text>
        <Tooltip content={<PremiumTooltip formatter={co2Formatter} />} />
      </PieChart>
    </ChartWrapper>
  )
}

interface MonthlyTrendData {
  month: string
  Scope1: number
  Scope2: number
  Scope3: number
  total: number
}

export function MonthlyEmissionsTrend({ data }: { data: MonthlyTrendData[] }) {
  if (data.every((d) => d.total === 0)) {
    return (
      <ChartWrapper title="Monthly Emissions Trend" subtitle="Last 6 months (kg CO₂e)" accentColor="#f59e0b">
        <AreaChart data={[]}>
          <text x="50%" y="50%" textAnchor="middle" className="fill-slate-400 text-sm">
            No emissions data yet
          </text>
        </AreaChart>
      </ChartWrapper>
    )
  }

  return (
    <ChartWrapper title="Monthly Emissions Trend" subtitle="Last 6 months (kg CO₂e)" accentColor="#f59e0b">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {SCOPE_GRADIENTS.map((grad, i) => (
            <linearGradient key={`trendGrad-${i}`} id={`emTrendGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={grad.from} stopOpacity={0.25} />
              <stop offset="100%" stopColor={grad.from} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" vertical={false} />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          width={50}
        />
        <Tooltip content={<PremiumTooltip formatter={co2Formatter} />} />
        <Area
          type="monotone"
          dataKey="Scope1"
          name="Scope 1"
          stroke={SCOPE_GRADIENTS[0].color}
          strokeWidth={2.5}
          fill="url(#emTrendGrad-0)"
          dot={{ r: 3.5, fill: SCOPE_GRADIENTS[0].color, stroke: "#fff", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: SCOPE_GRADIENTS[0].color, stroke: "#fff", strokeWidth: 2 }}
        />
        <Area
          type="monotone"
          dataKey="Scope2"
          name="Scope 2"
          stroke={SCOPE_GRADIENTS[1].color}
          strokeWidth={2.5}
          fill="url(#emTrendGrad-1)"
          dot={{ r: 3.5, fill: SCOPE_GRADIENTS[1].color, stroke: "#fff", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: SCOPE_GRADIENTS[1].color, stroke: "#fff", strokeWidth: 2 }}
        />
        <Area
          type="monotone"
          dataKey="Scope3"
          name="Scope 3"
          stroke={SCOPE_GRADIENTS[2].color}
          strokeWidth={2.5}
          fill="url(#emTrendGrad-2)"
          dot={{ r: 3.5, fill: SCOPE_GRADIENTS[2].color, stroke: "#fff", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: SCOPE_GRADIENTS[2].color, stroke: "#fff", strokeWidth: 2 }}
        />
      </AreaChart>
    </ChartWrapper>
  )
}
