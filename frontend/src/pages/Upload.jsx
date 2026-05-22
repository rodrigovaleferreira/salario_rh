// frontend/src/pages/Upload.jsx

import { useState, useRef, useCallback } from "react"
import {
  Upload as UploadIcon, FileSpreadsheet,
  CheckCircle2, AlertCircle, ArrowRight,
  ArrowLeft, X, Info,
} from "lucide-react"
import { clsx } from "clsx"

import PageHeader from "../components/ui/PageHeader"
import Button     from "../components/ui/Button"
import Select     from "../components/ui/Select"
import Alert      from "../components/ui/Alert"
import uploadService from "../services/uploadService"

// Campos aceitos pelo sistema
const TARGET_FIELD_OPTIONS = [
  { value: "",                label: "— Ignorar coluna —" },
  { value: "name",            label: "Nome do colaborador" },
  { value: "registration",    label: "Matrícula" },
  { value: "department",      label: "Departamento" },
  { value: "position_title",  label: "Cargo" },
  { value: "current_salary",  label: "Salário atual" },
  { value: "hire_date",       label: "Data de admissão" },
  { value: "cost_center",     label: "Centro de custo" },
  { value: "manager_name",    label: "Nome do gestor" },
]

const REQUIRED_FIELDS = ["name", "position_title", "current_salary"]

// ── Etapa 1: Drop de arquivo ──────────────────────────────────────

function StepUpload({ onSuccess }) {
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress]     = useState(0)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const inputRef = useRef()

  const handleFile = useCallback(async (file) => {
    if (!file) return
    setError(null)
    setLoading(true)
    setProgress(0)
    try {
      const result = await uploadService.uploadFile(file, setProgress)
      onSuccess(result)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Erro ao processar arquivo. Verifique o formato."
      )
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }, [onSuccess])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)

  return (
    <div className="space-y-4">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !loading && inputRef.current?.click()}
        className={clsx(
          "relative border-2 border-dashed rounded-xl p-12",
          "flex flex-col items-center justify-center gap-4",
          "cursor-pointer transition-all duration-200",
          isDragging
            ? "border-brand-400 bg-brand-50"
            : "border-surface-300 hover:border-brand-300 hover:bg-surface-50",
          loading && "pointer-events-none opacity-70",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <div className={clsx(
          "flex items-center justify-center w-14 h-14 rounded-2xl",
          isDragging ? "bg-brand-100" : "bg-surface-100",
        )}>
          <FileSpreadsheet
            size={26}
            className={isDragging ? "text-brand-600" : "text-surface-500"}
          />
        </div>

        <div className="text-center">
          <p className="text-sm font-medium text-surface-700">
            {isDragging
              ? "Solte o arquivo aqui"
              : "Arraste sua planilha ou clique para selecionar"
            }
          </p>
          <p className="text-xs text-surface-400 mt-1">
            Formatos aceitos: <strong>.xlsx</strong> e <strong>.csv</strong> · Máx. 10MB
          </p>
        </div>

        {/* Barra de progresso */}
        {loading && (
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs text-surface-500 mb-1">
              <span>Enviando...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-surface-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <Alert type="error" message={error} dismissible />
      )}

      {/* Dicas */}
      <div className="card">
        <div className="card-body">
          <div className="flex gap-2">
            <Info size={14} className="text-brand-500 mt-0.5 shrink-0" />
            <div className="text-xs text-surface-600 space-y-1">
              <p className="font-medium text-surface-700">
                Dicas para importação
              </p>
              <p>• A primeira linha deve conter os cabeçalhos das colunas</p>
              <p>• Campos obrigatórios: Nome, Cargo e Salário</p>
              <p>• Salários podem estar no formato R$ 5.000,00 ou 5000</p>
              <p>• Linhas com erros são ignoradas — importação parcial é permitida</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Etapa 2: Mapeamento de colunas ────────────────────────────────

function StepMapping({ detection, onConfirm, onBack }) {
  const [mappings, setMappings] = useState(() =>
    detection.suggested_mappings.reduce((acc, m) => {
      acc[m.source_column] = m.target_field
      return acc
    }, {})
  )
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const setMapping = (col, field) => {
    setMappings((prev) => ({ ...prev, [col]: field }))
  }

  const mappedFields = Object.values(mappings).filter(Boolean)
  const missingRequired = REQUIRED_FIELDS.filter(
    (f) => !mappedFields.includes(f)
  )

  const handleConfirm = async () => {
    if (missingRequired.length) return
    setError(null)
    setLoading(true)

    const columnMappings = Object.entries(mappings)
      .filter(([, field]) => field)
      .map(([source_column, target_field]) => ({
        source_column,
        target_field,
        is_required: REQUIRED_FIELDS.includes(target_field),
      }))

    try {
      const result = await uploadService.confirmImport(
        detection.file_id,
        columnMappings,
      )
      onConfirm(result)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Erro ao importar dados. Tente novamente."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-surface-800">
            Mapeamento de colunas
          </p>
          <p className="text-xs text-surface-400 mt-0.5">
            {detection.total_rows} linhas detectadas ·{" "}
            {detection.detected_columns.length} colunas
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={13} />
          Voltar
        </Button>
      </div>

      {error && <Alert type="error" message={error} dismissible />}

      {/* Campos obrigatórios faltando */}
      {missingRequired.length > 0 && (
        <Alert
          type="warning"
          title="Campos obrigatórios não mapeados"
          message={`Mapeie os campos: ${missingRequired.join(", ")}`}
        />
      )}

      {/* Tabela de mapeamento */}
      <div className="card">
        <div className="table-wrapper rounded-xl border-0">
          <table className="table">
            <thead>
              <tr>
                <th>Coluna na planilha</th>
                <th>Exemplos de valores</th>
                <th>Campo no sistema</th>
              </tr>
            </thead>
            <tbody>
              {detection.detected_columns.map((col) => {
                const examples = detection.preview_rows
                  .map((r) => r[col])
                  .filter(Boolean)
                  .slice(0, 3)
                  .join(", ")

                const currentField = mappings[col] || ""
                const isRequired   = REQUIRED_FIELDS.includes(currentField)

                return (
                  <tr key={col}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-surface-800">
                          {col}
                        </span>
                        {isRequired && (
                          <span className="badge badge-danger text-[10px]">
                            obrigatório
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-surface-400 text-xs max-w-[200px] truncate">
                      {examples || "—"}
                    </td>
                    <td className="w-52">
                      <Select
                        options={TARGET_FIELD_OPTIONS}
                        value={currentField}
                        onChange={(e) => setMapping(col, e.target.value)}
                        className="text-xs"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview */}
      {detection.preview_rows.length > 0 && (
        <div className="card">
          <div className="card-header">
            <p className="text-sm font-semibold text-surface-700">
              Preview — primeiras linhas
            </p>
          </div>
          <div className="card-body overflow-x-auto">
            <table className="table text-xs">
              <thead>
                <tr>
                  {detection.detected_columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detection.preview_rows.map((row, i) => (
                  <tr key={i}>
                    {detection.detected_columns.map((col) => (
                      <td key={col} className="max-w-[120px] truncate">
                        {row[col] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          variant="primary"
          size="md"
          onClick={handleConfirm}
          loading={loading}
          disabled={missingRequired.length > 0}
        >
          Confirmar importação
          <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  )
}

// ── Etapa 3: Resultado ────────────────────────────────────────────

function StepResult({ result, onReset }) {
  const isSuccess = result.status === "success"
  const isPartial = result.status === "partial"

  return (
    <div className="space-y-4">
      <div className={clsx(
        "flex items-start gap-4 p-5 rounded-xl border",
        isSuccess ? "bg-green-50 border-green-200"
          : isPartial ? "bg-amber-50 border-amber-200"
          : "bg-red-50 border-red-200",
      )}>
        {isSuccess
          ? <CheckCircle2 size={22} className="text-green-600 shrink-0 mt-0.5" />
          : <AlertCircle size={22} className="text-amber-600 shrink-0 mt-0.5" />
        }
        <div>
          <p className="font-semibold text-surface-800">
            {isSuccess ? "Importação concluída!"
              : isPartial ? "Importação parcial"
              : "Falha na importação"}
          </p>
          <p className="text-sm text-surface-600 mt-1">
            {result.imported_rows} de {result.total_rows} linhas importadas com sucesso.
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total de linhas",  value: result.total_rows,    color: "neutral" },
          { label: "Importadas",       value: result.imported_rows, color: "success" },
          { label: "Com erro",         value: result.skipped_rows,  color: result.skipped_rows > 0 ? "danger" : "neutral" },
        ].map((stat) => (
          <div key={stat.label} className="card p-4 text-center">
            <p className="text-xl font-display font-bold text-surface-900">
              {stat.value}
            </p>
            <p className="text-xs text-surface-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Erros por linha */}
      {result.errors?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <p className="text-sm font-semibold text-surface-700">
              Erros detectados ({result.errors.length})
            </p>
          </div>
          <div className="table-wrapper rounded-xl border-0">
            <table className="table text-xs">
              <thead>
                <tr>
                  <th>Linha</th>
                  <th>Coluna</th>
                  <th>Valor</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {result.errors.map((err, i) => (
                  <tr key={i}>
                    <td className="font-mono">{err.row_number}</td>
                    <td>{err.column || "—"}</td>
                    <td className="text-surface-400 max-w-[100px] truncate">
                      {err.value || "—"}
                    </td>
                    <td className="text-danger">{err.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onReset}>
          Nova importação
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => window.location.href = "/dashboard"}
        >
          Ver dashboard
          <ArrowRight size={13} />
        </Button>
      </div>
    </div>
  )
}

// ── Indicador de etapas ───────────────────────────────────────────

function StepIndicator({ current }) {
  const steps = [
    { label: "Upload",     n: 1 },
    { label: "Mapeamento", n: 2 },
    { label: "Resultado",  n: 3 },
  ]
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((step, i) => (
        <div key={step.n} className="flex items-center">
          <div className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
            "transition-all duration-200",
            current === step.n
              ? "bg-brand-600 text-white"
              : current > step.n
              ? "bg-green-100 text-green-700"
              : "bg-surface-100 text-surface-400",
          )}>
            {current > step.n
              ? <CheckCircle2 size={12} />
              : <span>{step.n}</span>
            }
            {step.label}
          </div>
          {i < steps.length - 1 && (
            <div className={clsx(
              "h-px w-8 mx-1 transition-colors",
              current > step.n ? "bg-green-300" : "bg-surface-200",
            )} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────

export default function Upload() {
  const [step, setStep]           = useState(1)
  const [detection, setDetection] = useState(null)
  const [result, setResult]       = useState(null)

  const handleUploadSuccess = (data) => {
    setDetection(data)
    setStep(2)
  }

  const handleConfirm = (data) => {
    setResult(data)
    setStep(3)
  }

  const handleReset = () => {
    setStep(1)
    setDetection(null)
    setResult(null)
  }

  return (
    <div className="max-w-3xl space-y-4 animate-in">
      <PageHeader
        title="Importar Planilha"
        subtitle="Importe colaboradores a partir de arquivos Excel ou CSV"
      />

      <div className="card">
        <div className="card-body">
          <StepIndicator current={step} />

          {step === 1 && (
            <StepUpload onSuccess={handleUploadSuccess} />
          )}
          {step === 2 && detection && (
            <StepMapping
              detection={detection}
              onConfirm={handleConfirm}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && result && (
            <StepResult result={result} onReset={handleReset} />
          )}
        </div>
      </div>
    </div>
  )
}