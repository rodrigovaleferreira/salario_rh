// frontend/src/pages/Salaries.jsx

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle2, Filter,
  RefreshCw, Sliders, Plus, Wand2,
} from "lucide-react"

import PageHeader  from "../components/ui/PageHeader"
import Button      from "../components/ui/Button"
import Select      from "../components/ui/Select"
import Input       from "../components/ui/Input"
import Modal       from "../components/ui/Modal"
import Alert       from "../components/ui/Alert"
import EmptyState  from "../components/ui/EmptyState"
import KpiCard     from "../components/ui/KpiCard"

import salaryService   from "../services/salaryService"
import positionService from "../services/positionService"
import {
  useSalarySummary,
  useSalaryAnalysis,
  useSalaryBands,
} from "../hooks/useSalary"

// ── Helpers ───────────────────────────────────────────────────────

function fmt(value) {
  if (!value && value !== 0) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL", maximumFractionDigits: 0,
  }).format(value)
}

function CompaRatioBadge({ value }) {
  const n = Number(value)
  if (n < 80)        return <span className="badge badge-danger">{n.toFixed(1)}</span>
  if (n > 120)       return <span className="badge badge-warning">{n.toFixed(1)}</span>
  return               <span className="badge badge-success">{n.toFixed(1)}</span>
}

function PositionBadge({ value }) {
  if (value === "below") return <span className="badge badge-danger">Abaixo</span>
  if (value === "above") return <span className="badge badge-warning">Acima</span>
  return <span className="badge badge-success">Dentro</span>
}

function RangeBar({ min, current, max }) {
  const pct = Math.min(
    100,
    Math.max(0, ((Number(current) - Number(min)) /
      (Number(max) - Number(min) || 1)) * 100)
  )
  const color =
    pct < 0   ? "bg-danger" :
    pct > 100 ? "bg-warning" :
    "bg-brand-500"

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-surface-400 w-8 text-right">
        {pct.toFixed(0)}%
      </span>
    </div>
  )
}

// ── Modal de faixa salarial ───────────────────────────────────────

const bandSchema = z.object({
  position_id:     z.string().min(1, "Selecione o cargo"),
  salary_min:      z.coerce.number().positive("Deve ser positivo"),
  salary_midpoint: z.coerce.number().positive("Deve ser positivo"),
  salary_max:      z.coerce.number().positive("Deve ser positivo"),
  market_p50:      z.coerce.number().positive().optional().or(z.literal("")),
}).refine((d) => d.salary_min < d.salary_midpoint, {
  message: "Mínimo deve ser menor que o midpoint",
  path: ["salary_min"],
}).refine((d) => d.salary_midpoint < d.salary_max, {
  message: "Midpoint deve ser menor que o máximo",
  path: ["salary_midpoint"],
})

function BandModal({ open, onClose }) {
  const qc = useQueryClient()
  const [error, setError] = useState(null)

  const { data: positions } = useQuery({
    queryKey: ["positions"],
    queryFn: () => positionService.list(),
    enabled: open,
  })

  const positionOptions = (positions || []).map((p) => ({
    value: p.id,
    label: `${p.title} — ${p.department}`,
  }))

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(bandSchema) })

  const onSubmit = async (values) => {
    setError(null)
    try {
      await salaryService.createBand({
        ...values,
        salary_min:      Number(values.salary_min),
        salary_midpoint: Number(values.salary_midpoint),
        salary_max:      Number(values.salary_max),
        market_p50:      values.market_p50 ? Number(values.market_p50) : null,
      })
      qc.invalidateQueries({ queryKey: ["salary-bands"] })
      qc.invalidateQueries({ queryKey: ["salary-analysis"] })
      reset()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao salvar faixa.")
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { reset(); setError(null); onClose() }}
      title="Nova Faixa Salarial"
      subtitle="Defina o range salarial para um cargo"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary" size="sm"
            onClick={handleSubmit(onSubmit)}
            loading={isSubmitting}
          >
            Salvar faixa
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <Alert type="error" message={error} dismissible />}

        <Select
          label="Cargo"
          required
          placeholder="Selecione o cargo..."
          options={positionOptions}
          error={errors.position_id?.message}
          {...register("position_id")}
        />

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Salário mínimo"
            type="number"
            step="0.01"
            placeholder="3000"
            required
            error={errors.salary_min?.message}
            {...register("salary_min")}
          />
          <Input
            label="Midpoint"
            type="number"
            step="0.01"
            placeholder="4000"
            required
            error={errors.salary_midpoint?.message}
            {...register("salary_midpoint")}
          />
          <Input
            label="Salário máximo"
            type="number"
            step="0.01"
            placeholder="5000"
            required
            error={errors.salary_max?.message}
            {...register("salary_max")}
          />
        </div>

        <Input
          label="Mediana de mercado (P50)"
          type="number"
          step="0.01"
          placeholder="Opcional — referência externa"
          error={errors.market_p50?.message}
          {...register("market_p50")}
        />

        <div className="p-3 bg-surface-50 rounded-lg text-xs text-surface-500">
          <p className="font-medium text-surface-600 mb-1">Dica de amplitude</p>
          <p>Faixas com spread de 40–60% são as mais comuns no mercado.</p>
          <p className="mt-0.5">Ex: Mín R$3.000 → Mid R$4.000 → Máx R$5.000 = spread 67%</p>
        </div>
      </div>
    </Modal>
  )
}

// ── Modal de auto-cálculo ─────────────────────────────────────────

function AutoCalcModal({ open, onClose }) {
  const qc = useQueryClient()
  const [spread, setSpread] = useState(50)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const handleCalc = async () => {
    setLoading(true)
    setError(null)
    try {
      await salaryService.autoCalculateBands(spread)
      qc.invalidateQueries({ queryKey: ["salary-bands"] })
      qc.invalidateQueries({ queryKey: ["salary-analysis"] })
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || "Erro no cálculo automático.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Calcular faixas automaticamente"
      subtitle="Baseado nos salários reais dos colaboradores"
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary" size="sm"
            onClick={handleCalc}
            loading={loading}
          >
            <Wand2 size={13} />
            Calcular
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <Alert type="error" message={error} />}

        <p className="text-sm text-surface-600">
          O sistema calculará o <strong>midpoint</strong> de cada cargo
          com base na <strong>mediana salarial</strong> dos colaboradores,
          e definirá min/max com base na amplitude informada.
        </p>

        <div>
          <label className="label">
            Amplitude da faixa: <strong>{spread}%</strong>
          </label>
          <input
            type="range" min={20} max={100} step={5}
            value={spread}
            onChange={(e) => setSpread(Number(e.target.value))}
            className="w-full accent-brand-600 mt-1"
          />
          <div className="flex justify-between text-[10px] text-surface-400 mt-0.5">
            <span>20% (estreita)</span>
            <span>60% (padrão)</span>
            <span>100% (ampla)</span>
          </div>
        </div>

        <div className="p-3 bg-brand-50 rounded-lg text-xs text-brand-700">
          <p>
            Com {spread}% de amplitude: se o midpoint for R$5.000,
            o mínimo será R${(5000 * (1 - spread / 200)).toFixed(0)} e
            o máximo R${(5000 * (1 + spread / 200)).toFixed(0)}.
          </p>
        </div>
      </div>
    </Modal>
  )
}

// ── Tabela de faixas ──────────────────────────────────────────────

function BandsTable({ data, isLoading }) {
  if (isLoading) return (
    <div className="p-4 space-y-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton h-10 rounded" />
      ))}
    </div>
  )

  if (!data?.length) return (
    <EmptyState
      icon={Sliders}
      title="Nenhuma faixa cadastrada"
      description="Crie faixas manualmente ou use o cálculo automático."
    />
  )

  return (
    <div className="table-wrapper rounded-xl border-0">
      <table className="table">
        <thead>
          <tr>
            <th>Cargo</th>
            <th>Mínimo</th>
            <th>Midpoint</th>
            <th>Máximo</th>
            <th>Spread</th>
            <th>Mercado P50</th>
            <th>Versão</th>
          </tr>
        </thead>
        <tbody>
          {data.map((b) => (
            <tr key={b.id}>
              <td className="font-medium text-surface-800 max-w-[180px] truncate">
                {b.position?.title ?? "—"}
              </td>
              <td className="font-mono text-xs text-surface-600">
                {fmt(b.salary_min)}
              </td>
              <td className="font-mono text-xs font-semibold text-brand-700">
                {fmt(b.salary_midpoint)}
              </td>
              <td className="font-mono text-xs text-surface-600">
                {fmt(b.salary_max)}
              </td>
              <td>
                <span className="badge badge-neutral">
                  {b.range_spread ? `${Number(b.range_spread).toFixed(0)}%` : "—"}
                </span>
              </td>
              <td className="font-mono text-xs text-surface-500">
                {b.market_p50 ? fmt(b.market_p50) : "—"}
              </td>
              <td>
                <span className="badge badge-info">v{b.version}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Tabela de análise individual ──────────────────────────────────

function AnalysisTable({ data, isLoading }) {
  const [showOnlyCritical, setShowOnlyCritical] = useState(false)

  const filtered = showOnlyCritical
    ? (data ?? []).filter((r) => r.is_critical)
    : (data ?? [])

  if (isLoading) return (
    <div className="p-4 space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="skeleton h-10 rounded" />
      ))}
    </div>
  )

  if (!data?.length) return (
    <EmptyState
      icon={TrendingUp}
      title="Sem dados de análise"
      description="Configure faixas salariais para ver o posicionamento dos colaboradores."
    />
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-surface-500">
          {filtered.length} colaborador{filtered.length !== 1 ? "es" : ""}
          {showOnlyCritical ? " críticos" : ""}
        </p>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showOnlyCritical}
            onChange={(e) => setShowOnlyCritical(e.target.checked)}
            className="accent-brand-600"
          />
          <span className="text-xs text-surface-600">
            Mostrar apenas críticos
          </span>
        </label>
      </div>

      <div className="table-wrapper rounded-xl border-0">
        <table className="table">
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Salário atual</th>
              <th>Mínimo</th>
              <th>Midpoint</th>
              <th>Máximo</th>
              <th>Posição na faixa</th>
              <th>Compa-ratio</th>
              <th>Desvio</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.employee_id}
                  className={r.is_critical ? "bg-red-50/40" : ""}>
                <td>
                  <div className="flex items-center gap-2">
                    {r.is_critical && (
                      <AlertTriangle size={12} className="text-danger shrink-0" />
                    )}
                    <span className="font-medium text-surface-800 max-w-[150px] truncate">
                      {r.employee_name}
                    </span>
                  </div>
                </td>
                <td className="font-mono text-xs font-semibold">
                  {fmt(r.current_salary)}
                </td>
                <td className="font-mono text-xs text-surface-400">
                  {fmt(r.salary_min)}
                </td>
                <td className="font-mono text-xs text-surface-500">
                  {fmt(r.salary_midpoint)}
                </td>
                <td className="font-mono text-xs text-surface-400">
                  {fmt(r.salary_max)}
                </td>
                <td>
                  <div className="space-y-1">
                    <PositionBadge value={r.position_in_range} />
                    <RangeBar
                      min={r.salary_min}
                      current={r.current_salary}
                      max={r.salary_max}
                    />
                  </div>
                </td>
                <td>
                  <CompaRatioBadge value={r.compa_ratio} />
                </td>
                <td className={`font-mono text-xs font-medium ${
                  r.is_critical ? "text-danger" : "text-surface-500"
                }`}>
                  {Number(r.deviation_percent).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────

export default function Salaries() {
  const [tab, setTab]             = useState("analysis") // "analysis" | "bands"
  const [dept, setDept]           = useState("")
  const [bandModal, setBandModal] = useState(false)
  const [autoModal, setAutoModal] = useState(false)

  const summary  = useSalarySummary(dept || null)
  const analysis = useSalaryAnalysis(dept || null)
  const bands    = useSalaryBands()

  const { data: positions } = useQuery({
    queryKey: ["positions"],
    queryFn:  () => positionService.list(),
  })

  const deptOptions = [
    ...new Set((positions || []).map((p) => p.department)),
  ].sort().map((d) => ({ value: d, label: d }))

  const s = summary.data

  const handleRefresh = () => {
    summary.refetch()
    analysis.refetch()
    bands.refetch()
  }

  return (
    <div className="space-y-5 animate-in">
      <PageHeader
        title="Análise Salarial"
        subtitle="Posicionamento dos colaboradores em relação às faixas"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary" size="sm"
              onClick={handleRefresh}
              loading={summary.isFetching}
            >
              <RefreshCw size={13} />
              Atualizar
            </Button>
            <Button
              variant="secondary" size="sm"
              onClick={() => setAutoModal(true)}
            >
              <Wand2 size={13} />
              Auto-calcular faixas
            </Button>
            <Button
              variant="primary" size="sm"
              onClick={() => setBandModal(true)}
            >
              <Plus size={13} />
              Nova faixa
            </Button>
          </div>
        }
      />

      {/* KPIs resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Abaixo da faixa"
          value={s?.distribution?.below_band ?? "—"}
          subtitle={`${s?.distribution?.below_pct ?? 0}% do total`}
          icon={TrendingDown}
          color={(s?.distribution?.below_band ?? 0) > 0 ? "danger" : "success"}
          loading={summary.isLoading}
        />
        <KpiCard
          title="Dentro da faixa"
          value={s?.distribution?.within_band ?? "—"}
          subtitle={`${s?.distribution?.within_pct ?? 0}% do total`}
          icon={CheckCircle2}
          color="success"
          loading={summary.isLoading}
        />
        <KpiCard
          title="Acima da faixa"
          value={s?.distribution?.above_band ?? "—"}
          subtitle={`${s?.distribution?.above_pct ?? 0}% do total`}
          icon={TrendingUp}
          color={(s?.distribution?.above_band ?? 0) > 0 ? "warning" : "success"}
          loading={summary.isLoading}
        />
        <KpiCard
          title="Críticos"
          value={s?.distribution?.critical ?? "—"}
          subtitle="desvio > 20%"
          icon={AlertTriangle}
          color={(s?.distribution?.critical ?? 0) > 0 ? "danger" : "success"}
          loading={summary.isLoading}
        />
      </div>

      {/* Filtro por departamento */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-3">
            <Filter size={14} className="text-surface-400 shrink-0" />
            <Select
              placeholder="Todos os departamentos"
              options={deptOptions}
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="w-64"
            />
            {dept && (
              <Button
                variant="ghost" size="sm"
                onClick={() => setDept("")}
              >
                Limpar filtro
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="card-header">
          <div className="flex gap-1 bg-surface-100 p-1 rounded-lg">
            {[
              { key: "analysis", label: "Análise por colaborador" },
              { key: "bands",    label: "Faixas salariais" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 text-xs font-medium rounded-md
                            transition-all duration-150 ${
                  tab === t.key
                    ? "bg-white text-surface-900 shadow-card"
                    : "text-surface-500 hover:text-surface-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "analysis" && (
          <AnalysisTable
            data={analysis.data}
            isLoading={analysis.isLoading}
          />
        )}
        {tab === "bands" && (
          <BandsTable
            data={bands.data}
            isLoading={bands.isLoading}
          />
        )}
      </div>

      <BandModal
        open={bandModal}
        onClose={() => setBandModal(false)}
      />
      <AutoCalcModal
        open={autoModal}
        onClose={() => setAutoModal(false)}
      />
    </div>
  )
}