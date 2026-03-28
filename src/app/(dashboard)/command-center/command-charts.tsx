"use client"

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
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
  formatCurrencyShort,
  currencyTooltipFormatter,
} from "@/components/charts/chart-wrapper"

interface RevenueVsComputeData {
  month: string
  revenue: number
  computeCost: number
}

export function RevenueVsComputeChart({ data }: { data: RevenueVsComputeData[] }) {
  return (
    <ChartWrapper
      title="Revenue vs Compute Cost"
      subtitle="Last 6 months"
      accentColor={CHART_COLORS.indigo}
    >
      <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revLineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <filter id="revGlow">
            <feGaussianBlur stdDeviation="3" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" vertical={false} />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
        />
        <YAxis
          yAxisId="left"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#6366f1" }}
          tickFormatter={formatCurrencyShort}
          width={55}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#f43f5e" }}
          tickFormatter={formatCurrencyShort}
          width={55}
        />
        <Tooltip content={<PremiumTooltip formatter={currencyTooltipFormatter} />} />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="revenue"
          stroke="#6366f1"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
          name="Revenue"
          filter="url(#revGlow)"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="computeCost"
          stroke="#f43f5e"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#f43f5e", stroke: "#fff", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "#f43f5e", stroke: "#fff", strokeWidth: 2 }}
          name="Compute Cost"
        />
      </LineChart>
    </ChartWrapper>
  )
}

interface RdClaimTrendData {
  fy: string
  estimatedOffset: number
}

export function RdClaimTrendChart({ data }: { data: RdClaimTrendData[] }) {
  return (
    <ChartWrapper
      title="R&D Tax Offset Estimate by FY"
      subtitle="Based on claim drafts"
      accentColor={CHART_COLORS.violet}
    >
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rdOffsetGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
            <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.8} />
          </linearGradient>
          <filter id="rdBarGlowCmd">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.15" />
          </filter>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" vertical={false} />
        <XAxis
          dataKey="fy"
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
        <Tooltip content={<PremiumTooltip formatter={currencyTooltipFormatter} />} />
        <Bar
          dataKey="estimatedOffset"
          fill="url(#rdOffsetGrad)"
          radius={[8, 8, 2, 2]}
          maxBarSize={40}
          name="Estimated Offset"
          filter="url(#rdBarGlowCmd)"
        />
      </BarChart>
    </ChartWrapper>
  )
}
