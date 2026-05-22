// frontend/src/components/charts/DepartmentChart.jsx

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts"

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="card px-3 py-2.5 text-xs shadow-panel space-y-1">
      <p className="font-semibold text-surface-800">{label}</p>
      <p className="text-surface-600">
        Média: <span className="font-medium text-surface-900">
          {formatCurrency(d?.avg_salary)}
        </span>
      </p>
      <p className="text-surface-600">
        Headcount: <span className="font-medium">{d?.headcount}</span>
      </p>
      <p className={
        d?.deviation_from_company_avg > 0
          ? "text-green-600"
          : "text-red-500"
      }>
        vs média empresa:{" "}
        <span className="font-medium">
          {d?.deviation_from_company_avg > 0 ? "+" : ""}
          {d?.deviation_from_company_avg?.toFixed(1)}%
        </span>
      </p>
    </div>
  )
}

export default function DepartmentChart({ data }) {
  if (!data?.length) return null

  const companyAvg = data.reduce((sum, d) => sum + d.avg_salary, 0) / data.length

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 4, left: 10, bottom: 40 }}
        barSize={28}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="department"
          tick={{ fontSize: 10, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 10, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8f9fc" }} />
        <ReferenceLine
          y={companyAvg}
          stroke="#2455f5"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          label={{
            value: "Média",
            position: "right",
            fontSize: 10,
            fill: "#2455f5",
          }}
        />
        <Bar
          dataKey="avg_salary"
          fill="#2455f5"
          radius={[5, 5, 0, 0]}
          fillOpacity={0.85}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}