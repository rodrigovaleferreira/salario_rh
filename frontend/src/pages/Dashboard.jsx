// frontend/src/pages/Dashboard.jsx

import {
  Users, DollarSign, AlertTriangle,
  TrendingUp, BarChart2, RefreshCw,
} from "lucide-react"

import PageHeader from "../components/ui/PageHeader"
import KpiCard from "../components/ui/KpiCard"
import EmptyState from "../components/ui/EmptyState"
import Button from "../components/ui/Button"
import SalaryDistributionChart from "../components/charts/SalaryDistributionChart"
import DepartmentChart from "../components/charts/DepartmentChart"
import CompaRatioChart from "../components/charts/CompaRatioChart"

import {
  useSalarySummary,
  useSalaryAnalysis,
  useDepartmentComparison,
  useCompression,
} from "../hooks/useSalary"

function formatCurrency(value) {
  if (!value && value !== 0) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value) {
  if (!value && value !== 0) return "—"
  return new Intl.NumberFormat("pt-BR").format(value)
}

// ── Tabela de colaboradores críticos ─────────────────────────────

function CriticalEmployeesTable({ data, isLoading }) {
  const critical = data?.filter((r) => r.is_critical) ?? []

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-8 rounded" />
        ))}
      </div>
    )
  }

  if (!critical.length) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Nenhuma distorção crítica"
        description="Todos os colaboradores estão dentro da faixa salarial aceitável."
      />
    )
  }

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>Colaborador</th>
            <th>Salário atual</th>
            <th>Midpoint</th>
            <th>Compa-ratio</th>
            <th>Posição</th>
            <th>Desvio</th>
          </tr>
        </thead>
        <tbody>
          {critical.slice(0, 8).map((row) => (
            <tr key={row.employee_id}>
              <td className="font-medium text-surface-800 max-w-[160px] truncate">
                {row.employee_name}
              </td>
              <td className="font-mono text-xs">
                {formatCurrency(row.current_salary)}
              </td>
              <td className="font-mono text-xs text-surface-500">
                {formatCurrency(row.salary_midpoint)}
              </td>
              <td>
                <span className={
                  Number(row.compa_ratio) < 80
                    ? "badge badge-danger"
                    : "badge badge-warning"
                }>
                  {Number(row.compa_ratio).toFixed(1)}
                </span>
              </td>
              <td>
                <span className={
                  row.position_in_range === "below"
                    ? "badge badge-danger"
                    : row.position_in_range === "above"
                    ? "badge badge-warning"
                    : "badge badge-success"
                }>
                  {row.position_in_range === "below" ? "Abaixo"
                    : row.position_in_range === "above" ? "Acima"
                    : "Dentro"}
                </span>
              </td>
              <td className="font-mono text-xs text-danger font-medium">
                {Number(row.deviation_percent).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Alerta de compressão salarial ─────────────────────────────────

function CompressionAlerts({ data, isLoading }) {
  if (isLoading) return null
  if (!data?.length) return null

  return (
    <div className="space-y-2">
      {data.map((c, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-xs
            ${c.severity === "critical"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
            }`}
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">
              Compressão salarial{" "}
              {c.severity === "critical" ? "crítica" : "detectada"}
            </p>
            <p className="opacity-80 mt-0.5">
              <span className="font-medium">{c.level_lower}</span>
              {" "}→{" "}
              <span className="font-medium">{c.level_upper}</span>
              {" "}com apenas{" "}
              <span className="font-semibold">
                {Number(c.difference_pct).toFixed(1)}%
              </span>
              {" "}de diferença salarial
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────

export default function Dashboard() {
  const summary    = useSalarySummary()
  const analysis   = useSalaryAnalysis()
  const deptComp   = useDepartmentComparison()
  const compression = useCompression()

  const s = summary.data

  const handleRefresh = () => {
    summary.refetch()
    analysis.refetch()
    deptComp.refetch()
    compression.refetch()
  }

  return (
    <div className="space-y-6 animate-in">

      <PageHeader
        title="Dashboard Executivo"
        subtitle="Visão geral da estrutura de cargos e salários"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            loading={summary.isFetching}
          >
            <RefreshCw size={13} />
            Atualizar
          </Button>
        }
      />

      {/* ── KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total de Colaboradores"
          value={formatNumber(s?.headcount)}
          subtitle="colaboradores ativos"
          icon={Users}
          color="brand"
          loading={summary.isLoading}
          trend="neutral"
          trendValue="Base atual importada"
        />
        <KpiCard
          title="Folha Total Mensal"
          value={formatCurrency(s?.total_payroll)}
          subtitle="custo total mensal"
          icon={DollarSign}
          color="success"
          loading={summary.isLoading}
          trend="neutral"
          trendValue={`Média: ${formatCurrency(s?.mean_salary)}`}
        />
        <KpiCard
          title="Compa-ratio Médio"
          value={s ? `${Number(s.median_salary / (s.mean_salary || 1) * 100).toFixed(1)}` : "—"}
          subtitle="mediana vs média"
          icon={TrendingUp}
          color={
            !s ? "neutral"
            : s.distribution?.below_pct > 20 ? "danger"
            : "brand"
          }
          loading={summary.isLoading}
          trend="neutral"
          trendValue={`Mediana: ${formatCurrency(s?.median_salary)}`}
        />
        <KpiCard
          title="Distorções Críticas"
          value={formatNumber(s?.distribution?.critical)}
          subtitle="colaboradores fora da faixa"
          icon={AlertTriangle}
          color={
            !s ? "neutral"
            : (s.distribution?.critical ?? 0) > 0 ? "danger"
            : "success"
          }
          loading={summary.isLoading}
          trend={
            (s?.distribution?.critical ?? 0) > 0 ? "down" : "up"
          }
          trendValue={
            s
              ? `${s.distribution?.below_pct ?? 0}% abaixo · ${s.distribution?.above_pct ?? 0}% acima`
              : ""
          }
        />
      </div>

      {/* ── Alertas de compressão ─────────────────────────────── */}
      {(compression.data?.length > 0) && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
            Alertas de Compressão Salarial
          </p>
          <CompressionAlerts
            data={compression.data}
            isLoading={compression.isLoading}
          />
        </div>
      )}

      {/* ── Gráficos — linha 1 ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Distribuição por faixa */}
        <div className="card">
          <div className="card-header">
            <div>
              <p className="text-sm font-semibold text-surface-800">
                Distribuição por Faixa Salarial
              </p>
              <p className="text-xs text-surface-400 mt-0.5">
                Colaboradores abaixo, dentro e acima da faixa
              </p>
            </div>
            <BarChart2 size={16} className="text-surface-300" />
          </div>
          <div className="card-body">
            {summary.isLoading ? (
              <div className="skeleton h-48 rounded-lg" />
            ) : !s ? (
              <EmptyState
                icon={BarChart2}
                title="Sem dados"
                description="Importe uma planilha para visualizar a distribuição."
              />
            ) : (
              <SalaryDistributionChart data={s} />
            )}
          </div>
        </div>

        {/* Compa-ratio scatter */}
        <div className="card">
          <div className="card-header">
            <div>
              <p className="text-sm font-semibold text-surface-800">
                Dispersão de Compa-ratio
              </p>
              <p className="text-xs text-surface-400 mt-0.5">
                Zona saudável: 80–120 · Azul = midpoint
              </p>
            </div>
            <TrendingUp size={16} className="text-surface-300" />
          </div>
          <div className="card-body">
            {analysis.isLoading ? (
              <div className="skeleton h-48 rounded-lg" />
            ) : !analysis.data?.length ? (
              <EmptyState
                icon={TrendingUp}
                title="Sem dados de análise"
                description="Configure as faixas salariais para ver o compa-ratio."
              />
            ) : (
              <CompaRatioChart data={analysis.data} />
            )}
          </div>
        </div>
      </div>

      {/* ── Gráfico — Média por departamento ─────────────────── */}
      <div className="card">
        <div className="card-header">
          <div>
            <p className="text-sm font-semibold text-surface-800">
              Salário Médio por Departamento
            </p>
            <p className="text-xs text-surface-400 mt-0.5">
              Linha tracejada = média da empresa
            </p>
          </div>
        </div>
        <div className="card-body">
          {deptComp.isLoading ? (
            <div className="skeleton h-52 rounded-lg" />
          ) : !deptComp.data?.length ? (
            <EmptyState
              icon={BarChart2}
              title="Sem dados por departamento"
              description="Importe colaboradores com departamento informado."
            />
          ) : (
            <DepartmentChart data={deptComp.data} />
          )}
        </div>
      </div>

      {/* ── Tabela de distorções críticas ─────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div>
            <p className="text-sm font-semibold text-surface-800">
              Colaboradores com Distorção Crítica
            </p>
            <p className="text-xs text-surface-400 mt-0.5">
              Desvio superior a 20% em relação à faixa salarial
            </p>
          </div>
          {(s?.distribution?.critical ?? 0) > 0 && (
            <span className="badge badge-danger">
              {s.distribution.critical} críticos
            </span>
          )}
        </div>
        <CriticalEmployeesTable
          data={analysis.data}
          isLoading={analysis.isLoading}
        />
      </div>

      {/* ── Estatísticas detalhadas ───────────────────────────── */}
      {s && (
        <div className="card">
          <div className="card-header">
            <p className="text-sm font-semibold text-surface-800">
              Estatísticas Descritivas
            </p>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Média",          value: formatCurrency(s.mean_salary) },
                { label: "Mediana",        value: formatCurrency(s.median_salary) },
                { label: "Desvio padrão",  value: formatCurrency(s.std_deviation) },
                { label: "Percentil 25",   value: formatCurrency(s.p25) },
                { label: "Percentil 75",   value: formatCurrency(s.p75) },
                { label: "Percentil 90",   value: formatCurrency(s.p90) },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-[10px] uppercase tracking-wider
                                text-surface-400 font-medium">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-sm font-display font-bold
                                text-surface-900">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}