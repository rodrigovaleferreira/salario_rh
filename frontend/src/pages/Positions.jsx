// frontend/src/pages/Positions.jsx

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Plus, Search, Briefcase, Filter,
  Pencil, Trash2, ChevronRight,
} from "lucide-react"

import PageHeader    from "../components/ui/PageHeader"
import Button        from "../components/ui/Button"
import Input         from "../components/ui/Input"
import Select        from "../components/ui/Select"
import Modal         from "../components/ui/Modal"
import EmptyState    from "../components/ui/EmptyState"
import Alert         from "../components/ui/Alert"

import {
  usePositions,
  useCreatePosition,
  useUpdatePosition,
  useDeactivatePosition,
} from "../hooks/usePositions"
import { useQuery } from "@tanstack/react-query"
import positionService from "../services/positionService"

// ── Constantes ────────────────────────────────────────────────────

const SENIORITY_OPTIONS = [
  { value: "intern",      label: "Estagiário" },
  { value: "assistant",   label: "Assistente" },
  { value: "junior",      label: "Analista Jr" },
  { value: "mid",         label: "Analista Pleno" },
  { value: "senior",      label: "Analista Sênior" },
  { value: "specialist",  label: "Especialista" },
  { value: "coordinator", label: "Coordenador" },
  { value: "manager",     label: "Gerente" },
  { value: "director",    label: "Diretor" },
  { value: "vp",          label: "Vice-Presidente" },
  { value: "c_level",     label: "C-Level" },
]

const SENIORITY_LABELS = Object.fromEntries(
  SENIORITY_OPTIONS.map((o) => [o.value, o.label])
)

const HIERARCHY_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: `Nível ${i + 1}`,
}))

const SENIORITY_BADGE = {
  intern:      "badge-neutral",
  assistant:   "badge-neutral",
  junior:      "badge-info",
  mid:         "badge-info",
  senior:      "badge-info",
  specialist:  "badge-warning",
  coordinator: "badge-warning",
  manager:     "badge-danger",
  director:    "badge-danger",
  vp:          "badge-danger",
  c_level:     "badge-danger",
}

// ── Schema de validação ───────────────────────────────────────────

const positionSchema = z.object({
  title:           z.string().min(2, "Mínimo 2 caracteres").max(200),
  seniority:       z.string().min(1, "Selecione a senioridade"),
  department:      z.string().min(2, "Mínimo 2 caracteres").max(100),
  area:            z.string().max(100).optional().or(z.literal("")),
  cost_center:     z.string().max(100).optional().or(z.literal("")),
  hierarchy_level: z.coerce.number().min(1).max(10),
  description:     z.string().max(2000).optional().or(z.literal("")),
  code:            z.string().max(50).optional().or(z.literal("")),
})

// ── Modal de cadastro/edição ──────────────────────────────────────

function PositionModal({ open, onClose, editData }) {
  const isEditing    = !!editData
  const createMut    = useCreatePosition()
  const updateMut    = useUpdatePosition()
  const [error, setError] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(positionSchema),
    defaultValues: editData
      ? {
          ...editData,
          hierarchy_level: String(editData.hierarchy_level),
        }
      : { hierarchy_level: "1" },
  })

  const onSubmit = async (values) => {
    setError(null)
    const payload = {
      ...values,
      hierarchy_level: Number(values.hierarchy_level),
      area:        values.area        || null,
      cost_center: values.cost_center || null,
      description: values.description || null,
      code:        values.code        || null,
    }

    try {
      if (isEditing) {
        await updateMut.mutateAsync({ id: editData.id, payload })
      } else {
        await createMut.mutateAsync(payload)
      }
      reset()
      onClose()
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Erro ao salvar cargo. Tente novamente."
      )
    }
  }

  const handleClose = () => { reset(); setError(null); onClose() }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEditing ? "Editar Cargo" : "Novo Cargo"}
      subtitle={isEditing ? editData.title : "Preencha os dados do cargo"}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit(onSubmit)}
            loading={isSubmitting}
          >
            {isEditing ? "Salvar alterações" : "Criar cargo"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <Alert type="error" message={error} dismissible />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Título do cargo"
              placeholder="Ex: Analista de RH"
              required
              error={errors.title?.message}
              {...register("title")}
            />
          </div>

          <Select
            label="Senioridade"
            placeholder="Selecione..."
            required
            options={SENIORITY_OPTIONS}
            error={errors.seniority?.message}
            {...register("seniority")}
          />

          <Select
            label="Nível hierárquico"
            required
            options={HIERARCHY_OPTIONS}
            error={errors.hierarchy_level?.message}
            {...register("hierarchy_level")}
          />

          <Input
            label="Departamento"
            placeholder="Ex: Recursos Humanos"
            required
            error={errors.department?.message}
            {...register("department")}
          />

          <Input
            label="Área"
            placeholder="Ex: Recrutamento"
            error={errors.area?.message}
            {...register("area")}
          />

          <Input
            label="Centro de custo"
            placeholder="Ex: CC-001"
            error={errors.cost_center?.message}
            {...register("cost_center")}
          />

          <Input
            label="Código do cargo"
            placeholder="Ex: CBO-1234"
            error={errors.code?.message}
            {...register("code")}
          />

          <div className="sm:col-span-2">
            <label className="label">Descrição</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Descreva as principais responsabilidades..."
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-danger mt-0.5">
                {errors.description.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── Modal de confirmação de exclusão ─────────────────────────────

function DeleteModal({ open, onClose, position }) {
  const deactivate = useDeactivatePosition()
  const [error, setError] = useState(null)

  const handleConfirm = async () => {
    setError(null)
    try {
      await deactivate.mutateAsync(position.id)
      onClose()
    } catch {
      setError("Não foi possível desativar o cargo.")
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Desativar cargo"
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleConfirm}
            loading={deactivate.isPending}
          >
            Desativar
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {error && <Alert type="error" message={error} />}
        <p className="text-sm text-surface-700">
          Tem certeza que deseja desativar o cargo{" "}
          <span className="font-semibold">"{position?.title}"</span>?
        </p>
        <p className="text-xs text-surface-400">
          O cargo será inativado e não aparecerá nas análises.
          Esta ação pode ser revertida pelo administrador.
        </p>
      </div>
    </Modal>
  )
}

// ── Página principal ──────────────────────────────────────────────

export default function Positions() {
  const [search, setSearch]           = useState("")
  const [filterDept, setFilterDept]   = useState("")
  const [filterSen, setFilterSen]     = useState("")
  const [modalOpen, setModalOpen]     = useState(false)
  const [editData, setEditData]       = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data: positions, isLoading } = usePositions({
    search:     search  || undefined,
    department: filterDept || undefined,
    seniority:  filterSen  || undefined,
  })

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => positionService.list().then((list) =>
      [...new Set(list.map((p) => p.department))].sort()
    ),
  })

  const deptOptions = (departments || []).map((d) => ({
    value: d, label: d,
  }))

  const openCreate = () => { setEditData(null); setModalOpen(true) }
  const openEdit   = (p)  => { setEditData(p);   setModalOpen(true) }

  return (
    <div className="space-y-5 animate-in">
      <PageHeader
        title="Cargos"
        subtitle={`${positions?.length ?? 0} cargos cadastrados`}
        actions={
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus size={14} />
            Novo cargo
          </Button>
        }
      />

      {/* Filtros */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Busca */}
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2
                           text-surface-400 pointer-events-none"
              />
              <input
                className="input pl-8"
                placeholder="Buscar por título..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Filter size={14} className="text-surface-400 mt-2.5 shrink-0" />
              <Select
                placeholder="Departamento"
                options={deptOptions}
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-44"
              />
              <Select
                placeholder="Senioridade"
                options={SENIORITY_OPTIONS}
                value={filterSen}
                onChange={(e) => setFilterSen(e.target.value)}
                className="w-44"
              />
              {(filterDept || filterSen || search) && (
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setSearch("")
                    setFilterDept("")
                    setFilterSen("")
                  }}
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="card">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-10 rounded" />
            ))}
          </div>
        ) : !positions?.length ? (
          <EmptyState
            icon={Briefcase}
            title="Nenhum cargo encontrado"
            description={
              search || filterDept || filterSen
                ? "Tente ajustar os filtros de busca."
                : "Cadastre o primeiro cargo da empresa."
            }
            action={
              !search && !filterDept && !filterSen && (
                <Button variant="primary" size="sm" onClick={openCreate}>
                  <Plus size={13} />
                  Cadastrar cargo
                </Button>
              )
            }
          />
        ) : (
          <div className="table-wrapper rounded-xl border-0">
            <table className="table">
              <thead>
                <tr>
                  <th>Cargo</th>
                  <th>Senioridade</th>
                  <th>Departamento</th>
                  <th>Área</th>
                  <th>Nível</th>
                  <th>Código</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Briefcase
                          size={13}
                          className="text-surface-400 shrink-0"
                        />
                        <span className="font-medium text-surface-800">
                          {p.title}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${SENIORITY_BADGE[p.seniority] ?? "badge-neutral"}`}>
                        {SENIORITY_LABELS[p.seniority] ?? p.seniority}
                      </span>
                    </td>
                    <td className="text-surface-600">{p.department}</td>
                    <td className="text-surface-500 text-xs">
                      {p.area || "—"}
                    </td>
                    <td>
                      <span className="badge badge-neutral">
                        N{p.hierarchy_level}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-surface-500">
                      {p.code || "—"}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg text-surface-400
                                     hover:bg-surface-100 hover:text-brand-600
                                     transition-colors"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 rounded-lg text-surface-400
                                     hover:bg-red-50 hover:text-danger
                                     transition-colors"
                          title="Desativar"
                        >
                          <Trash2 size={13} />
                        </button>
                        <button className="p-1.5 rounded-lg text-surface-400
                                           hover:bg-surface-100
                                           transition-colors">
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modais */}
      <PositionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
      />
      <DeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        position={deleteTarget}
      />
    </div>
  )
}