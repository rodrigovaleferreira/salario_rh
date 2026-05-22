// frontend/src/pages/Diagnostic.jsx

import { RefreshCw, AlertTriangle, CheckCircle2,
         Info, TrendingUp, Lightbulb, Activity } from "lucide-react"
import { clsx } from "clsx"

import PageHeader from "../components/ui/PageHeader"
import Button     from "../components/ui/Button"
import KpiCard    from "../components/ui/KpiCard"
import EmptyState from "../components/ui/EmptyState"
import { useDiagnostic } from "../hooks/useEmployees"
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell,
} from "recharts"

// ── Score gauge ───────────────────────────────────────────────────

function HealthScore({ score, label }) {
  const color =
    score < 40 ? "#ef4444" :
    score < 60 ? "#f59e0b" :
    score < 75 ? "#3b82f6" :
    "#22c55e"

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="relative">
        <ResponsiveContainer width={160} height={160}>
          <RadialBarChart
            innerRadius={55} outerRadius={75}
            startAngle={210} endAngle={-30}
            data={[{ value: score, fill: color }]}
          >
            <RadialBar dataKey="value" cornerRadius={8} background />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center
                        justify-center">
          <span className="text-3xl font-display font-bold text-surface-900">
            {score}
          </span>
          <span className="text-[10px] text-surface-400 uppercase tracking-wider">
            de 100
          </span>
        </div>
      </div>
      <span
        className="mt-2 text-sm font-semibold"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  )
}

// ── Issue card ────────────────────────────────────────────────────

function IssueCard({ issue }) {
  const styles = {
    critical: "border-red-300   bg-red-50   text-red-800",
    high:     "border-orange-300 bg-orange-50 text-orange-800",
    medium:   "border-amber-300 bg-amber-50  text-amber-800",
  }
  const icons = {
    critical: <AlertTriangle size={15} className="text-red-500 shrink-0" />,
    high:     <AlertTriangle size={15} className="text-orange-500 shrink-0" />,
    medium:   <Info size={15} className="text-amber-500 shrink-0" />,
  }
  const s = issue.severity || "medium"

  return (
    <div className={clsx(
      "flex gap-3 p-4 rounded-xl border",
      styles[s] || styles.medium,
    )}>
      <div className="mt-0.5">{icons[s] || icons.medium}</div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{issue.title}</p>
        {issue.description && (
          <p className="text-xs opacity-80">{issue.description}</p>
        )}
        {issue.action && (
          <p className="text-xs font-medium opacity-90">
            → {issue.action}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Warning card ──────────────────────────────────────────────────

function WarningCard({ warning }) {
  return (
    <div className="flex gap-3 p-3.5 rounded-xl border
                    border-amber-200 bg-amber-50 text-amber-800">
      <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-semibold">{warning.title}</p>
        {warning.description && (
          <p className="text-xs opacity-75 mt-0.5">{warning.description}</p>
        )}
        {warning.action && (
          <p className="text-xs font-medium mt-1">→ {warning.action}</p>
        )}
      </div>
    </div>
  )
}

// ── Positive card ─────────────────────────────────────────────────

function PositiveCard({ positive }) {
  return (
    <div className="flex gap-3 p-3.5 rounded-xl border
                    border-green-200 bg-green-50 text-green-800">
      <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-semibold">{positive.title}</p>
        {positive.description && (
          <p className="text-xs opacity-75 mt-0.5">{positive.description}</p>
        )}
      </div>
    </div>
  )
}

// ── Headcount chart ───────────────────────────────────────────────

function HeadcountChart({ data }) {
  if (!data?.length) return null

  const fmt = (v) => new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL", maximumFractionDigits: 0,
  }).format(v)

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 4, left: 10, bottom: 40 }}
        barSize={24}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="department"
          tick={{ fontSize: 10, fill: "#6b7280" }}
          axisLine={false} tickLine={false}
          angle={-35} textAnchor="end" interval={0}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#6b7280" }}
          axisLine={false} tickLine={false}
        />
        <Tooltip
          formatter={(v, name) => [
            name === "headcount" ? v : fmt(v),
            name === "headcount" ? "Colaboradores" : "Salário médio",
          ]}
          contentStyle={{
            fontSize: 11, borderRadius: 8,
            border: "1px solid #e2e6f0",
          }}
        />
        <Bar dataKey="headcount" fill="#2455f5"
             radius={[5, 5, 0, 0]} fillOpacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Histogram ─────────────────────────────────────────────────────

function HistogramChart({ data }) {
  if (!data?.length) return null

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 4, left: -10, bottom: 30 }}
        barSize={28}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="range_label"
          tick={{ fontSize: 9, fill: "#9aa4be" }}
          axisLine={false} tickLine={false}
          angle={-30} textAnchor="end"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#6b7280" }}
          axisLine={false} tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          formatter={(v) => [v, "Colaboradores"]}
          contentStyle={{ fontSize: 11, borderRadius: 8 }}
        />
        <Bar dataKey="count" radius={[5, 5, 0, 0]}>
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={`hsl(${220 + i * 10}, 70%, ${55 + i * 3}%)`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Página principal ──────────────────────────────────────────────

export default function Diagnostic() {
  const { data, isLoading, refetch, isFetching } = useDiagnostic()

  if (isLoading) {
    return (
      <div className="space-y-5 animate-in">
        <PageHeader
          title="Diagnóstico Organizacional"
          subtitle="Análise automática da estrutura de cargos e salários"
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-6">
              <div className="skeleton h-32 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data) return (
    <div className="space-y-5">
      <PageHeader title="Diagnóstico Organizacional" />
      <div className="card">
        <EmptyState
          icon={Activity}
          title="Sem dados para diagnóstico"
          description="Importe colaboradores e configure faixas salariais primeiro."
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-5 animate-in">
      <PageHeader
        title="Diagnóstico Organizacional"
        subtitle="Análise automática gerada com base nos dados importados"
        actions={
          <Button
            variant="secondary" size="sm"
            onClick={() => refetch()}
            loading={isFetching}
          >
            <RefreshCw size={13} />
            Atualizar
          </Button>
        }
      />

      {/* Score + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="card flex items-center justify-center">
          <HealthScore
            score={data.score}
            label={data.health_label}
          />
        </div>

        <KpiCard
          title="Total de colaboradores"
          value={data.total_employees}
          icon={TrendingUp}
          color="brand"
        />
        <KpiCard
          title="Distorções críticas"
          value={data.critical_count}
          icon={AlertTriangle}
          color={data.critical_count > 0 ? "danger" : "success"}
        />
        <KpiCard
          title="Issues identificados"
          value={data.issues?.length ?? 0}
          subtitle={`${data.warnings?.length ?? 0} alertas`}
          icon={Activity}
          color={
            (data.issues?.length ?? 0) > 0 ? "danger" :
            (data.warnings?.length ?? 0) > 0 ? "warning" :
            "success"
          }
        />
      </div>

      {/* Issues + Warnings + Positivos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Problemas */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-danger" />
              <p className="text-sm font-semibold text-surface-800">
                Problemas identificados ({data.issues?.length ?? 0})
              </p>
            </div>
          </div>
          <div className="card-body space-y-3">
            {data.issues?.length ? (
              data.issues.map((issue, i) => (
                <IssueCard key={i} issue={issue} />
              ))
            ) : (
              <div className="flex gap-2 text-xs text-green-700
                              bg-green-50 p-3 rounded-lg">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                Nenhum problema crítico identificado.
              </div>
            )}
          </div>
        </div>

        {/* Alertas + Positivos */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Info size={15} className="text-warning" />
                <p className="text-sm font-semibold text-surface-800">
                  Alertas ({data.warnings?.length ?? 0})
                </p>
              </div>
            </div>
            <div className="card-body space-y-2">
              {data.warnings?.length ? (
                data.warnings.map((w, i) => (
                  <WarningCard key={i} warning={w} />
                ))
              ) : (
                <p className="text-xs text-surface-400">
                  Nenhum alerta no momento.
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-success" />
                <p className="text-sm font-semibold text-surface-800">
                  Pontos positivos ({data.positives?.length ?? 0})
                </p>
              </div>
            </div>
            <div className="card-body space-y-2">
              {data.positives?.length ? (
                data.positives.map((p, i) => (
                  <PositiveCard key={i} positive={p} />
                ))
              ) : (
                <p className="text-xs text-surface-400">
                  Sem pontos positivos identificados ainda.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recomendações */}
      {data.recommendations?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Lightbulb size={15} className="text-brand-500" />
              <p className="text-sm font-semibold text-surface-800">
                Recomendações
              </p>
            </div>
          </div>
          <div className="card-body space-y-2">
            {data.recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex gap-3 p-3 bg-brand-50 rounded-lg
                           border border-brand-100 text-xs text-brand-800"
              >
                <span className="font-bold text-brand-400 shrink-0">
                  {i + 1}.
                </span>
                {rec}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráficos analíticos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header">
            <p className="text-sm font-semibold text-surface-800">
              Headcount por Departamento
            </p>
          </div>
          <div className="card-body">
            <HeadcountChart data={data.headcount_by_dept} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <p className="text-sm font-semibold text-surface-800">
              Distribuição de Frequência Salarial
            </p>
            <p className="text-xs text-surface-400">
              Número de colaboradores por faixa de salário
            </p>
          </div>
          <div className="card-body">
            <HistogramChart data={data.salary_histogram} />
          </div>
        </div>
      </div>
    </div>
  )
}