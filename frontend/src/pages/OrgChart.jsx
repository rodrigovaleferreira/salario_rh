// frontend/src/pages/OrgChart.jsx

import { useState, useRef, useCallback } from "react"
import {
  ZoomIn, ZoomOut, Maximize2,
  Download, RefreshCw, GitBranch,
  ChevronDown, ChevronRight, Users,
} from "lucide-react"
import { clsx } from "clsx"

import PageHeader  from "../components/ui/PageHeader"
import Button      from "../components/ui/Button"
import EmptyState  from "../components/ui/EmptyState"
import { usePositionTree } from "../hooks/usePositions"

// ── Constantes de senioridade ─────────────────────────────────────

const SENIORITY_LABELS = {
  intern:      "Estagiário",
  assistant:   "Assistente",
  junior:      "Analista Jr",
  mid:         "Analista Pleno",
  senior:      "Analista Sênior",
  specialist:  "Especialista",
  coordinator: "Coordenador",
  manager:     "Gerente",
  director:    "Diretor",
  vp:          "Vice-Presidente",
  c_level:     "C-Level",
}

const LEVEL_COLORS = {
  c_level:     "border-purple-400  bg-purple-50  text-purple-800",
  vp:          "border-purple-300  bg-purple-50  text-purple-700",
  director:    "border-red-400     bg-red-50     text-red-800",
  manager:     "border-orange-400  bg-orange-50  text-orange-800",
  coordinator: "border-amber-400   bg-amber-50   text-amber-800",
  specialist:  "border-blue-400    bg-blue-50    text-blue-800",
  senior:      "border-brand-400   bg-brand-50   text-brand-800",
  mid:         "border-brand-300   bg-brand-50   text-brand-700",
  junior:      "border-green-400   bg-green-50   text-green-800",
  assistant:   "border-surface-300 bg-surface-50 text-surface-700",
  intern:      "border-surface-200 bg-surface-50 text-surface-600",
}

// ── Nó do organograma ─────────────────────────────────────────────

function OrgNode({ node, depth = 0, isLast = false }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children?.length > 0
  const colorClass  = LEVEL_COLORS[node.seniority] ?? LEVEL_COLORS.mid

  return (
    <div className="flex flex-col items-center">
      {/* Linha de conexão superior (exceto raiz) */}
      {depth > 0 && (
        <div className="w-px h-5 bg-surface-300" />
      )}

      {/* Card do nó */}
      <div className="relative group">
        <div className={clsx(
          "relative border-2 rounded-xl px-4 py-3 min-w-[160px] max-w-[200px]",
          "shadow-card transition-all duration-200",
          "hover:shadow-panel hover:-translate-y-0.5",
          colorClass,
        )}>
          <p className="text-xs font-semibold text-center leading-tight">
            {node.title}
          </p>
          <p className="text-[10px] text-center opacity-70 mt-0.5">
            {SENIORITY_LABELS[node.seniority] ?? node.seniority}
          </p>
          <p className="text-[10px] text-center opacity-60 mt-0.5 font-medium">
            {node.department}
          </p>

          {/* Badge de nível */}
          <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full
                          bg-white border border-surface-200 shadow-card
                          flex items-center justify-center">
            <span className="text-[9px] font-bold text-surface-500">
              N{node.hierarchy_level}
            </span>
          </div>
        </div>

        {/* Botão expandir/colapsar */}
        {hasChildren && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2
                       w-6 h-6 rounded-full bg-white border border-surface-300
                       shadow-card flex items-center justify-center z-10
                       hover:bg-surface-50 transition-colors"
          >
            {expanded
              ? <ChevronDown size={10} className="text-surface-500" />
              : <ChevronRight size={10} className="text-surface-500" />
            }
          </button>
        )}
      </div>

      {/* Filhos */}
      {hasChildren && expanded && (
        <div className="flex flex-col items-center mt-3">
          {/* Linha vertical até o container horizontal */}
          <div className="w-px h-3 bg-surface-300" />

          {/* Container horizontal dos filhos */}
          <div className="relative flex items-start gap-6 px-4">
            {/* Linha horizontal conectando filhos */}
            {node.children.length > 1 && (
              <div
                className="absolute top-0 left-0 right-0 h-px bg-surface-300"
                style={{
                  left: `calc(50% / ${node.children.length})`,
                  right: `calc(50% / ${node.children.length})`,
                }}
              />
            )}

            {node.children.map((child, i) => (
              <OrgNode
                key={child.id}
                node={child}
                depth={depth + 1}
                isLast={i === node.children.length - 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Painel de controles de zoom ───────────────────────────────────

function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }) {
  return (
    <div className="flex items-center gap-1 bg-white border border-surface-200
                    rounded-lg shadow-card p-1">
      <button
        onClick={onZoomOut}
        disabled={zoom <= 0.3}
        className="p-1.5 rounded hover:bg-surface-100 disabled:opacity-40
                   transition-colors text-surface-600"
        title="Diminuir zoom"
      >
        <ZoomOut size={14} />
      </button>
      <span className="text-xs font-mono text-surface-500 px-2 min-w-[44px] text-center">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={onZoomIn}
        disabled={zoom >= 2}
        className="p-1.5 rounded hover:bg-surface-100 disabled:opacity-40
                   transition-colors text-surface-600"
        title="Aumentar zoom"
      >
        <ZoomIn size={14} />
      </button>
      <div className="w-px h-4 bg-surface-200 mx-0.5" />
      <button
        onClick={onReset}
        className="p-1.5 rounded hover:bg-surface-100 transition-colors
                   text-surface-600"
        title="Resetar zoom"
      >
        <Maximize2 size={14} />
      </button>
    </div>
  )
}

// ── Legenda ───────────────────────────────────────────────────────

function Legend() {
  const items = [
    { label: "C-Level / VP",    color: "border-purple-400 bg-purple-50" },
    { label: "Diretor",         color: "border-red-400 bg-red-50" },
    { label: "Gerente / Coord", color: "border-orange-400 bg-orange-50" },
    { label: "Sênior / Esp.",   color: "border-brand-400 bg-brand-50" },
    { label: "Jr / Pleno",      color: "border-green-400 bg-green-50" },
    { label: "Assistente / Est","color": "border-surface-300 bg-surface-50" },
  ]
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className={clsx(
            "w-3 h-3 rounded border-2",
            item.color,
          )} />
          <span className="text-[10px] text-surface-500">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Exportação como imagem ────────────────────────────────────────

async function exportAsImage(containerRef) {
  const el = containerRef.current
  if (!el) return

  // Usa html2canvas se disponível, senão fallback
  try {
    const { default: html2canvas } = await import("html2canvas")
    const canvas = await html2canvas(el, {
      backgroundColor: "#f8f9fc",
      scale: 2,
      logging: false,
    })
    const link = document.createElement("a")
    link.download = "organograma.png"
    link.href = canvas.toDataURL("image/png")
    link.click()
  } catch {
    alert("Para exportar, instale: npm install html2canvas")
  }
}

// ── Página principal ──────────────────────────────────────────────

export default function OrgChart() {
  const [zoom, setZoom]         = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [offset, setOffset]     = useState({ x: 0, y: 0 })
  const [startDrag, setStartDrag] = useState(null)
  const [groupByDept, setGroupByDept] = useState(false)

  const containerRef = useRef()
  const { data: tree, isLoading, refetch } = usePositionTree()

  const handleZoomIn  = () => setZoom((z) => Math.min(2, z + 0.1))
  const handleZoomOut = () => setZoom((z) => Math.max(0.3, z - 0.1))
  const handleReset   = () => { setZoom(1); setOffset({ x: 0, y: 0 }) }

  // Pan por drag
  const onMouseDown = useCallback((e) => {
    setIsDragging(true)
    setStartDrag({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }, [offset])

  const onMouseMove = useCallback((e) => {
    if (!isDragging || !startDrag) return
    setOffset({
      x: e.clientX - startDrag.x,
      y: e.clientY - startDrag.y,
    })
  }, [isDragging, startDrag])

  const onMouseUp = useCallback(() => {
    setIsDragging(false)
    setStartDrag(null)
  }, [])

  // Zoom com scroll
  const onWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom((z) => Math.min(2, Math.max(0.3, z + delta)))
  }, [])

  // Agrupa por departamento
  const departments = tree
    ? [...new Set(tree.map((n) => n.department))].sort()
    : []

  return (
    <div className="h-full flex flex-col space-y-3 animate-in">
      <PageHeader
        title="Organograma"
        subtitle="Estrutura hierárquica de cargos da empresa"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              <RefreshCw size={13} />
              Atualizar
            </Button>
            <Button
              variant="secondary" size="sm"
              onClick={() => exportAsImage(containerRef)}
            >
              <Download size={13} />
              Exportar PNG
            </Button>
          </div>
        }
      />

      {/* Controles */}
      <div className="card">
        <div className="card-body py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <ZoomControls
                zoom={zoom}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onReset={handleReset}
              />
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={groupByDept}
                  onChange={(e) => setGroupByDept(e.target.checked)}
                  className="accent-brand-600"
                />
                <span className="text-xs text-surface-600">
                  Agrupar por departamento
                </span>
              </label>
            </div>
            <Legend />
          </div>
        </div>
      </div>

      {/* Área do organograma */}
      <div className="card flex-1 overflow-hidden">
        <div
          className={clsx(
            "relative w-full overflow-hidden bg-surface-50/50",
            "rounded-xl",
            isDragging ? "cursor-grabbing" : "cursor-grab",
          )}
          style={{ minHeight: "520px", height: "calc(100vh - 320px)" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
        >
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-brand-600
                                border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-surface-500">
                  Carregando organograma...
                </p>
              </div>
            </div>
          ) : !tree?.length ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <EmptyState
                icon={GitBranch}
                title="Organograma vazio"
                description="Cadastre cargos e defina hierarquias para visualizar o organograma."
              />
            </div>
          ) : (
            <div
              ref={containerRef}
              className="absolute inset-0 flex items-start justify-center
                         pt-8 pb-8 px-8 min-w-max"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transformOrigin: "center top",
                transition: isDragging ? "none" : "transform 0.1s ease",
              }}
            >
              {groupByDept ? (
                // Vista agrupada por departamento
                <div className="flex gap-12 items-start">
                  {departments.map((dept) => {
                    const deptNodes = tree.filter(
                      (n) => n.department === dept
                    )
                    return (
                      <div key={dept} className="flex flex-col items-center gap-4">
                        <div className="px-4 py-2 bg-surface-200 rounded-full
                                        text-xs font-semibold text-surface-700">
                          {dept}
                        </div>
                        <div className="flex gap-6 items-start">
                          {deptNodes.map((node) => (
                            <OrgNode key={node.id} node={node} depth={0} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                // Vista hierárquica padrão
                <div className="flex gap-8 items-start">
                  {tree.map((node) => (
                    <OrgNode key={node.id} node={node} depth={0} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Dica de navegação */}
          {tree?.length > 0 && (
            <div className="absolute bottom-3 right-3 text-[10px]
                            text-surface-400 bg-white/80 px-2 py-1
                            rounded-lg border border-surface-200">
              Arraste para navegar · Scroll para zoom
            </div>
          )}
        </div>
      </div>

      {/* Estatísticas do organograma */}
      {tree?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total de cargos",
              value: countNodes(tree),
              icon: GitBranch,
            },
            {
              label: "Departamentos",
              value: departments.length,
              icon: Users,
            },
            {
              label: "Níveis hierárquicos",
              value: getMaxDepth(tree),
              icon: ChevronDown,
            },
            {
              label: "Cargos de liderança",
              value: countLeadership(tree),
              icon: Users,
            },
          ].map((stat) => (
            <div key={stat.label} className="card p-4">
              <div className="flex items-center gap-2">
                <stat.icon size={14} className="text-surface-400 shrink-0" />
                <div>
                  <p className="text-lg font-display font-bold text-surface-900">
                    {stat.value}
                  </p>
                  <p className="text-[10px] text-surface-400">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Funções auxiliares ────────────────────────────────────────────

function countNodes(nodes) {
  return nodes.reduce(
    (acc, n) => acc + 1 + countNodes(n.children || []), 0
  )
}

function getMaxDepth(nodes, depth = 1) {
  if (!nodes?.length) return depth - 1
  return Math.max(...nodes.map((n) =>
    getMaxDepth(n.children || [], depth + 1)
  ))
}

function countLeadership(nodes) {
  const leaderRoles = new Set([
    "coordinator", "manager", "director", "vp", "c_level"
  ])
  return nodes.reduce((acc, n) => {
    const self = leaderRoles.has(n.seniority) ? 1 : 0
    return acc + self + countLeadership(n.children || [])
  }, 0)
}