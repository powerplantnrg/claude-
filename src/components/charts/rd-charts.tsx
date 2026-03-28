"use client"

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  ChartWrapper,
  PremiumTooltip,
  CHART_COLORS,
  CHART_COLOR_ARRAY,
  GRADIENT_PAIRS,
  formatCurrencyShort,
  currencyTooltipFormatter,
} from "./chart-wrapper"

// ─── R&D Spend by Project (Horizontal Bar) ────────────────────────────

interface ProjectSpendData {
  name: string
  spend: number
}

export function RdSpendByProjectChart({ data }: { data: ProjectSpendData[] }) {
  return (
    <ChartWrapper
      title="R&D Spend by Project"
      subtitle="Total spend per project"
      accentColor={CHART_COLORS.violet}
    >
      {data.length === 0 ? (
        <BarChart data={[]} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <text x="50%" y="50%" textAnchor="middle" className="fill-slate-400 text-sm">
            No R&D project spend data available
          </text>
        </BarChart>
      ) : (
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
        >
          <defs>
            {GRADIENT_PAIRS.map((pair, i) => (
              <linearGradient key={i} id={`rdBarGrad-${i}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={pair.from} stopOpacity={0.9} />
                <stop offset="100%" stopColor={pair.to} stopOpacity={1} />
              </linearGradient>
            ))}
            <filter id="rdBarGlow">
              <feDropShadow dx="1" dy="0" stdDeviation="2" floodOpacity="0.12" />
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" horizontal={false} />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickFormatter={formatCurrencyShort}
          />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
            width={120}
          />
          <Tooltip content={<PremiumTooltip formatter={currencyTooltipFormatter} />} />
          <Bar
            dataKey="spend"
            name="Spend"
            radius={[0, 8, 8, 0]}
            maxBarSize={28}
            filter="url(#rdBarGlow)"
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={`url(#rdBarGrad-${index % GRADIENT_PAIRS.length})`}
              />
            ))}
          </Bar>
        </BarChart>
      )}
    </ChartWrapper>
  )
}

// ─── Experiment Status Distribution ───────────────────────────────────

interface ExperimentStatusData {
  name: string
  value: number
}

const STATUS_GRADIENT: Record<string, { from: string; to: string }> = {
  Planned: { from: "#64748b", to: "#94a3b8" },
  Running: { from: "#3b82f6", to: "#60a5fa" },
  Completed: { from: "#10b981", to: "#34d399" },
  Failed: { from: "#f43f5e", to: "#fb7185" },
}

export function ExperimentStatusChart({ data }: { data: ExperimentStatusData[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <ChartWrapper title="Experiment Status Distribution" accentColor={CHART_COLORS.blue}>
      {data.length === 0 ? (
        <PieChart>
          <text x="50%" y="50%" textAnchor="middle" className="fill-slate-400 text-sm">
            No experiment data available
          </text>
        </PieChart>
      ) : (
        <PieChart>
          <defs>
            {data.map((entry, i) => {
              const grad = STATUS_GRADIENT[entry.name] || GRADIENT_PAIRS[i % GRADIENT_PAIRS.length]
              return (
                <linearGradient key={i} id={`expGrad-${i}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={grad.from} />
                  <stop offset="100%" stopColor={grad.to || grad.from} />
                </linearGradient>
              )
            })}
            <filter id="expShadow">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.15" />
            </filter>
          </defs>
          {/* Glow ring */}
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={72}
            outerRadius={76}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => {
              const grad = STATUS_GRADIENT[entry.name]
              return (
                <Cell
                  key={`glow-${index}`}
                  fill={grad?.from || CHART_COLOR_ARRAY[index % CHART_COLOR_ARRAY.length]}
                  opacity={0.2}
                />
              )
            })}
          </Pie>
          {/* Main donut */}
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={120}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
            cornerRadius={4}
            filter="url(#expShadow)"
            label={({ name, value }) => `${name} (${value})`}
            animationDuration={1200}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={`url(#expGrad-${index})`} />
            ))}
          </Pie>
          {/* Center */}
          <text x="50%" y="47%" textAnchor="middle" className="fill-slate-400 text-[10px]" fontWeight={500}>
            TOTAL
          </text>
          <text x="50%" y="56%" textAnchor="middle" className="fill-slate-900 dark:fill-white text-lg" fontWeight={700}>
            {total}
          </text>
          <Tooltip content={<PremiumTooltip />} />
        </PieChart>
      )}
    </ChartWrapper>
  )
}
