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
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmt}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              `$${value.toLocaleString("en-AU", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
              name === "bookValue" ? "Book Value" : "Depreciation",
            ]}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "12px",
            }}
          />
          <ReferenceLine
            y={purchasePrice}
            stroke="#94a3b8"
            strokeDasharray="3 3"
            label={{ value: "Purchase Price", fontSize: 10, fill: "#94a3b8" }}
          />
          <Bar
            dataKey="bookValue"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            name="bookValue"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
