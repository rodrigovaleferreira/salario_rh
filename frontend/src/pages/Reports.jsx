// frontend/src/pages/Reports.jsx

import { useState } from "react"
import {
  FileText, Download, FileSpreadsheet,
  CheckCircle2, AlertCircle, Loader2,
  BarChart2, Users, TrendingUp, GitBranch,
} from "lucide-react"

import PageHeader from "../components/ui/PageHeader"
import Button     from "../components/ui/Button"
import Alert      from "../components/ui/Alert"
import reportService from "../services/reportService"

// ── Card de relatório ─────────────────────────────────────────────

function ReportCard({
  title, description, icon: Icon,
  items, onDownloadPdf, onDownloadXlsx,
  loadingPdf, loadingXlsx,
}) {
  return (
    <div className="card hover:shadow-panel transition-shadow duration-200">
      <div className="card-body space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10
                          rounded-xl bg-brand-50 shrink-0">
            <Icon size={18} className="text-brand-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-surface-800">
              {title}
            </p>
            <p className="text-xs text-surface-500 mt-0.5">
              {description}
            </p>
          </div>
        </div>

        {/* Conteúdo do relatório */}
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs
                                    text-surface-600">
              <CheckCircle2 size={11} className="text-green-500 shrink-0" />
              {item}
            </div>
          ))}
        </div>

        {/* Botões de download */}
        <div className="flex items-center gap-2 pt-2 border-t border-surface-100">
          {onDownloadPdf && (
            <Button
              variant="primary"
              size="sm"
              onClick={onDownloadPdf}
              loading={loadingPdf}
              className="flex-1"
            >
              <FileText size={13} />
              {loadingPdf ? "Gerando PDF..." : "Baixar PDF"}
            </Button>
          )}
          {onDownloadXlsx && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onDownloadXlsx}
              loading={loadingXlsx}
              className="flex-1"
            >
              <FileSpreadsheet size={13} />
              {loadingXlsx ? "Gerando..." : "Baixar Excel"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Histórico de exports (mock visual) ───────────────────────────

function ExportHistory({ history }) {
  if (!history.length) return null

  return (
    <div className="card">
      <div className="card-header">
        <p className="text-sm font-semibold text-surface-800">
          Exportações desta sessão
        </p>
      </div>
      <div className="divide-y divide-surface-100">
        {history.map((item, i) => (
          <div key={i}
               className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              {item.type === "pdf"
                ? <FileText size={14} className="text-red-500" />
                : <FileSpreadsheet size={14} className="text-green-600" />
              }
              <div>
                <p className="text-xs font-medium text-surface-700">
                  {item.label}
                </p>
                <p className="text-[10px] text-surface-400">
                  {item.time}
                </p>
              </div>
            </div>
            <span className="badge badge-success text-[10px]">
              <CheckCircle2 size={10} />
              Concluído
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────

export default function Reports() {
  const [loadingPdf, setLoadingPdf]   = useState(false)
  const [loadingXlsx, setLoadingXlsx] = useState(false)
  const [error, setError]             = useState(null)
  const [history, setHistory]         = useState([])

  const addHistory = (label, type) => {
    const time = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit", minute: "2-digit",
    })
    setHistory((prev) => [{ label, type, time }, ...prev])
  }

  const handleDownloadPdf = async () => {
    setLoadingPdf(true)
    setError(null)
    try {
      await reportService.downloadPdf()
      addHistory("Relatório Executivo Completo (PDF)", "pdf")
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Erro ao gerar PDF. Verifique se há dados importados."
      )
    } finally {
      setLoadingPdf(false)
    }
  }

  const handleDownloadXlsx = async () => {
    setLoadingXlsx(true)
    setError(null)
    try {
      await reportService.downloadXlsx()
      addHistory("Exportação de Dados (Excel)", "xlsx")
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Erro ao gerar Excel."
      )
    } finally {
      setLoadingXlsx(false)
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="Relatórios"
        subtitle="Gere e exporte relatórios executivos da estrutura salarial"
      />

      {error && (
        <Alert type="error" message={error} dismissible />
      )}

      {/* Aviso de geração */}
      <div className="flex gap-3 px-4 py-3 rounded-xl border
                      border-brand-200 bg-brand-50 text-brand-800 text-xs">
        <AlertCircle size={14} className="shrink-0 mt-0.5 text-brand-500" />
        <div>
          <p className="font-medium">Geração em tempo real</p>
          <p className="opacity-80 mt-0.5">
            Os relatórios são gerados com os dados atuais do sistema.
            Certifique-se de que os dados estão importados e as faixas
            salariais configuradas antes de exportar.
          </p>
        </div>
      </div>

      {/* Cards de relatório */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportCard
          title="Relatório Executivo Completo"
          description="Relatório PDF profissional com análise completa da estrutura salarial."
          icon={BarChart2}
          items={[
            "Resumo executivo com KPIs",
            "Estatísticas descritivas (média, mediana, percentis)",
            "Comparativo salarial por departamento",
            "Colaboradores com distorção crítica",
            "Compressão salarial entre níveis",
            "Diagnóstico organizacional e recomendações",
          ]}
          onDownloadPdf={handleDownloadPdf}
          loadingPdf={loadingPdf}
        />

        <ReportCard
          title="Exportação de Dados — Excel"
          description="Planilha Excel com múltiplas abas para análise personalizada."
          icon={FileSpreadsheet}
          items={[
            "Aba: Colaboradores com todos os dados",
            "Aba: Faixas salariais por cargo",
            "Aba: Análise de compa-ratio individual",
            "Aba: Médias e totais por departamento",
            "Formatação automática de moeda e percentuais",
            "Cabeçalhos fixos (freeze panes)",
          ]}
          onDownloadXlsx={handleDownloadXlsx}
          loadingXlsx={loadingXlsx}
        />

        <ReportCard
          title="Análise de Colaboradores"
          description="Lista completa de colaboradores com posicionamento salarial."
          icon={Users}
          items={[
            "Nome, cargo e departamento",
            "Salário atual vs faixa",
            "Compa-ratio individual",
            "Flag de distorção crítica",
          ]}
          onDownloadXlsx={handleDownloadXlsx}
          loadingXlsx={loadingXlsx}
        />

        <ReportCard
          title="Diagnóstico Organizacional"
          description="Relatório de diagnóstico com score de saúde e recomendações."
          icon={TrendingUp}
          items={[
            "Score de saúde organizacional (0–100)",
            "Problemas críticos identificados",
            "Alertas e pontos de atenção",
            "Recomendações de ação",
          ]}
          onDownloadPdf={handleDownloadPdf}
          loadingPdf={loadingPdf}
        />
      </div>

      {/* Histórico da sessão */}
      <ExportHistory history={history} />

      {/* Informações sobre os formatos */}
      <div className="card">
        <div className="card-header">
          <p className="text-sm font-semibold text-surface-800">
            Sobre os formatos de exportação
          </p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-red-500" />
                <p className="text-sm font-medium text-surface-700">PDF</p>
              </div>
              <p className="text-xs text-surface-500 leading-relaxed">
                Ideal para apresentações executivas e reuniões.
                Layout profissional com gráficos, tabelas e análises
                narrativas prontas para impressão ou envio por e-mail.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-green-600" />
                <p className="text-sm font-medium text-surface-700">Excel (XLSX)</p>
              </div>
              <p className="text-xs text-surface-500 leading-relaxed">
                Ideal para análises adicionais e cruzamentos de dados.
                Todas as abas com formatação de moeda, filtros e
                dados brutos prontos para uso em ferramentas como
                Power BI e Tableau.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}