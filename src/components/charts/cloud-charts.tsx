"use client"

import {
  LineChart,
  Line,
  AreaChart,
  Area,
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

// ─── Cost Trend (Multi-provider Line + Area) ──────────────────────────

interface CostTrendData {
  month: string
  total: number
  [provider: string]: string | number
}

export function CostTrendChart({
  data,
  providers,
}: {
  data: CostTrendData[]
  providers: string[]
}) {
  const providerColors = providers.map((_, i) => CHART_COLOR_ARRAY[i % CHART_COLOR_ARRAY.length])

  return (
    <ChartWrapper
      title="Monthly Cloud Cost Trend"
      subtitle="Cost by provider over time"
      accentColor={CHART_COLORS.cyan}
    >
      {data.length === 0 ? (
        <LineChart data={[]}>
          <text x="50%" y="50%" textAnchor="middle" className="fill-slate-400 text-sm">
            No cost data available
          </text>
        </LineChart>
      ) : (
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            {providers.map((_, idx) => (
              <linearGradient key={`cloudGrad-${idx}`} id={`cloudGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={providerColors[idx]} stopOpacity={0.2} />
                <stop offset="100%" stopColor={providerColors[idx]} stopOpacity={0} />
              </linearGradient>
            ))}
            <linearGradient id="cloudTotalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#64748b" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#64748b" stopOpacity={0} />
            </linearGradient>
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
            tickFormatter={formatCurrencyShort}
            width={55}
          />
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Tooltip content={<PremiumTooltip formatter={currencyTooltipFormatter as any} />} />
          {/* Total dashed baseline */}
          <Area
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            fill="url(#cloudTotalGrad)"
            dot={false}
          />
          {/* Provider lines with area fills */}
          {providers.map((provider, idx) => (
            <Area
              key={provider}
              type="monotone"
              dataKey={provider}
              name={provider}
              stroke={providerColors[idx]}
              strokeWidth={2.5}
              fill={`url(#cloudGrad-${idx})`}
              dot={{ r: 3.5, fill: providerColors[idx], stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 5, fill: providerColors[idx], stroke: "#fff", strokeWidth: 2 }}
            />
          ))}
        </AreaChart>
      )}
    </ChartWrapper>
  )
}

// ─── Cost by Provider (Premium Donut) ─────────────────────────────────

interface ProviderCostData {
  name: string
  value: number
}

export function CostByProviderChart({ data }: { data: ProviderCostData[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <ChartWrapper
      title="Cost by Provider"
      subtitle="Total spend distribution"
      accentColor={CHART_COLORS.violet}
    >
      {data.length === 0 ? (
        <PieChart>
          <text x="50%" y="50%" textAnchor="middle" className="fill-slate-400 text-sm">
            No provider cost data available
          </text>
        </PieChart>
      ) : (
        <PieChart>
          <defs>
            {GRADIENT_PAIRS.map((pair, i) => (
              <linearGradient key={i} id={`cloudPieGrad-${i}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={pair.from} />
                <stop offset="100%" stopColor={pair.to} />
              </linearGradient>
            ))}
            <filter id="cloudDonutShadow">
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
            {data.map((_, index) => (
              <Cell
                key={`glow-${index}`}
                fill={CHART_COLOR_ARRAY[index % CHART_COLOR_ARRAY.length]}
                opacity={0.2}
              />
            ))}
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
            filter="url(#cloudDonutShadow)"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label={({ name, percent }: any) =>
              `${name ?? ""} (${(((percent as number) ?? 0) * 100).toFixed(0)}%)`
            }
            animationDuration={1200}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={`url(#cloudPieGrad-${index % GRADIENT_PAIRS.length})`}
              />
            ))}
          </Pie>
          {/* Center label */}
          <text x="50%" y="47%" textAnchor="middle" className="fill-slate-400 text-[10px]" fontWeight={500}>
            TOTAL
          </text>
          <text x="50%" y="56%" textAnchor="middle" className="fill-slate-900 dark:fill-white text-sm" fontWeight={700}>
            {currencyTooltipFormatter(total)}
          </text>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Tooltip content={<PremiumTooltip formatter={currencyTooltipFormatter as any} />} />
        </PieChart>
      )}
    </ChartWrapper>
  )
}
