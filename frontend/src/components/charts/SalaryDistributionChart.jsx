// frontend/src/components/charts/SalaryDistributionChart.jsx

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts"

const COLORS = {
  below:  "#ef4444",
  within: "#22c55e",
  above:  "#f59e0b",
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs shadow-panel">
      <p className="font-medium text-surface-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export default function SalaryDistributionChart({ data }) {
  if (!data) return null

  const chartData = [
    {
      name: "Abaixo da faixa",
      quantidade: data.distribution?.below_band ?? 0,
      fill: COLORS.below,
    },
    {
      name: "Dentro da faixa",
      quantidade: data.distribution?.within_band ?? 0,
      fill: COLORS.within,
    },
    {
      name: "Acima da faixa",
      quantidade: data.distribution?.above_band ?? 0,
      fill: COLORS.above,
    },
  ]

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={chartData}
        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
        barSize={40}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8f9fc" }} />
        <Bar dataKey="quantidade" radius={[6, 6, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}