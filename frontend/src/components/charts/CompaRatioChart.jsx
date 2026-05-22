// frontend/src/components/charts/CompaRatioChart.jsx

import {
  ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from "recharts"

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="card px-3 py-2 text-xs shadow-panel space-y-1">
      <p className="font-semibold text-surface-800 truncate max-w-[160px]">
        {d.employee_name}
      </p>
      <p className="text-surface-600">
        Compa-ratio:{" "}
        <span className={
          d.compa_ratio < 80 ? "text-red-500 font-semibold" :
          d.compa_ratio > 120 ? "text-amber-500 font-semibold" :
          "text-green-600 font-semibold"
        }>
          {Number(d.compa_ratio).toFixed(1)}
        </span>
      </p>
      <p className="text-surface-500">{d.position_in_range}</p>
    </div>
  )
}

export default function CompaRatioChart({ data }) {
  if (!data?.length) return null

  const chartData = data.map((r, i) => ({
    x: i + 1,
    y: Number(r.compa_ratio),
    ...r,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ScatterChart margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="x"
          type="number"
          tick={false}
          axisLine={false}
          tickLine={false}
          label={{
            value: "Colaboradores",
            position: "insideBottom",
            fontSize: 10,
            fill: "#9aa4be",
            offset: -2,
          }}
        />
        <YAxis
          dataKey="y"
          type="number"
          domain={[60, 140]}
          tick={{ fontSize: 10, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        {/* Zona saudável: 80–120 */}
        <ReferenceLine y={80}  stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
        <ReferenceLine y={100} stroke="#2455f5" strokeDasharray="4 4" strokeWidth={1.5} />
        <ReferenceLine y={120} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} />
        <Scatter
          data={chartData}
          fill="#2455f5"
          fillOpacity={0.7}
          shape={(props) => {
            const { cx, cy, payload } = props
            const color =
              payload.compa_ratio < 80  ? "#ef4444" :
              payload.compa_ratio > 120 ? "#f59e0b" :
              "#22c55e"
            return (
              <circle
                cx={cx} cy={cy} r={4}
                fill={color} fillOpacity={0.8}
                stroke={color} strokeWidth={1}
              />
            )
          }}
        />
      </ScatterChart>
    </ResponsiveContainer>
  )
}