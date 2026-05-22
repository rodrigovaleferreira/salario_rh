// frontend/src/pages/Employees.jsx

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery } from "@tanstack/react-query"
import {
  Users, Plus, Search, Filter,
  Pencil, Trash2, Upload, ChevronLeft,
  ChevronRight, AlertTriangle, CheckCircle2,
} from "lucide-react"

import PageHeader  from "../components/ui/PageHeader"
import Button      from "../components/ui/Button"
import Input       from "../components/ui/Input"
import Select      from "../components/ui/Select"
import Modal       from "../components/ui/Modal"
import Alert       from "../components/ui/Alert"
import EmptyState  from "../components/ui/EmptyState"

import {
  useEmployees, useCreateEmployee,
  useUpdateEmployee, useDeactivateEmployee,
} from "../hooks/useEmployees"
import positionService from "../services/positionService"
import { useNavigate } from "react-router-dom"

// ── Helpers ───────────────────────────────────────────────────────

function fmt(value) {
  if (!value && value !== 0) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL", maximumFractionDigits: 0,
  }).format(value)
}

const SENIORITY_LABELS = {
  intern: "Estagiário", assistant: "Assistente",
  junior: "Jr", mid: "Pleno", senior: "Sênior",
  specialist: "Especialista", coordinator: "Coordenador",
  manager: "Gerente", director: "Diretor",
  vp: "VP", c_level: "C-Level",
}

// ── Schema ────────────────────────────────────────────────────────

const employeeSchema = z.object({
  name:           z.string().min(2, "Mínimo 2 caracteres"),
  registration:   z.string().max(50).optional().or(z.literal("")),
  department:     z.string().max(100).optional().or(z.literal("")),
  cost_center:    z.string().max(100).optional().or(z.literal("")),
  manager_name:   z.string().max(200).optional().or(z.literal("")),
  current_salary: z.coerce.number().positive("Salário deve ser positivo"),
  position_id:    z.string().min(1, "Selecione o cargo"),
  hire_date:      z.string().optional().or(z.literal("")),
})

// ── Modal de colaborador ──────────────────────────────────────────

function EmployeeModal({ open, onClose, editData }) {
  const isEditing   = !!editData
  const createMut   = useCreateEmployee()
  const updateMut   = useUpdateEmployee()
  const [error, setError] = useState(null)

  const { data: positions } = useQuery({
    queryKey: ["positions"],
    queryFn:  () => positionService.list(),
    enabled:  open,
  })

  const positionOptions = (positions || []).map((p) => ({
    value: p.id,
    label: `${p.title} — ${p.department}`,
  }))

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: editData ? {
      ...editData,
      current_salary: Number(editData.current_salary),
      hire_date: editData.hire_date || "",
    } : {},
  })

  const onSubmit = async (values) => {
    setError(null)
    const payload = {
      ...values,
      current_salary: Number(values.current_salary),
      registration:   values.registration   || null,
      department:     values.department     || null,
      cost_center:    values.cost_center    || null,
      manager_name:   values.manager_name   || null,
      hire_date:      values.hire_date      || null,
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
      setError(err.response?.data?.detail || "Erro ao salvar.")
    }
  }

  const handleClose = () => { reset(); setError(null); onClose() }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEditing ? "Editar Colaborador" : "Novo Colaborador"}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="primary" size="sm"
            onClick={handleSubmit(onSubmit)}
            loading={isSubmitting}
          >
            {isEditing ? "Salvar" : "Criar"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <Alert type="error" message={error} dismissible />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Nome completo"
              required
              placeholder="Ex: João da Silva"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>

          <Select
            label="Cargo"
            required
            placeholder="Selecione..."
            options={positionOptions}
            error={errors.position_id?.message}
            {...register("position_id")}
          />

          <Input
            label="Salário atual (R$)"
            type="number"
            step="0.01"
            required
            placeholder="5000"
            error={errors.current_salary?.message}
            {...register("current_salary")}
          />

          <Input
            label="Matrícula"
            placeholder="Ex: 00123"
            error={errors.registration?.message}
            {...register("registration")}
          />

          <Input
            label="Departamento"
            placeholder="Ex: Tecnologia"
            error={errors.department?.message}
            {...register("department")}
          />

          <Input
            label="Centro de custo"
            placeholder="Ex: CC-001"
            error={errors.cost_center?.message}
            {...register("cost_center")}
          />

          <Input
            label="Nome do gestor"
            placeholder="Ex: Maria Souza"
            error={errors.manager_name?.message}
            {...register("manager_name")}
          />

          <Input
            label="Data de admissão"
            type="date"
            error={errors.hire_date?.message}
            {...register("hire_date")}
          />
        </div>
      </div>
    </Modal>
  )
}

// ── Paginação ─────────────────────────────────────────────────────

function Pagination({ page, pages, total, onPage }) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between px-1">
      <p className="text-xs text-surface-500">
        {total} colaborador{total !== 1 ? "es" : ""}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost" size="sm"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft size={14} />
        </Button>
        <span className="text-xs text-surface-600 px-2">
          {page} / {pages}
        </span>
        <Button
          variant="ghost" size="sm"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
        >
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────

export default function Employees() {
  const navigate = useNavigate()
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState("")
  const [dept, setDept]           = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const deactivate = useDeactivateEmployee()

  const { data, isLoading } = useEmployees({
    page,
    page_size: 50,
    search:     search     || undefined,
    department: dept       || undefined,
  })

  const { data: positions } = useQuery({
    queryKey: ["positions"],
    queryFn:  () => positionService.list(),
  })

  const deptOptions = [
    ...new Set((positions || []).map((p) => p.department)),
  ].sort().map((d) => ({ value: d, label: d }))

  const openCreate = () => { setEditData(null); setModalOpen(true) }
  const openEdit   = (emp) => { setEditData(emp); setModalOpen(true) }

  const handleDeactivate = async (emp) => {
    try {
      await deactivate.mutateAsync(emp.id)
      setDeleteTarget(null)
    } catch {
      alert("Erro ao desativar colaborador.")
    }
  }

  return (
    <div className="space-y-5 animate-in">
      <PageHeader
        title="Colaboradores"
        subtitle={`${data?.total ?? 0} colaboradores ativos`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary" size="sm"
              onClick={() => navigate("/upload")}
            >
              <Upload size={13} />
              Importar planilha
            </Button>
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Plus size={13} />
              Novo colaborador
            </Button>
          </div>
        }
      />

      {/* Filtros */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2
                           text-surface-400 pointer-events-none"
              />
              <input
                className="input pl-8"
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="flex gap-2">
              <Filter size={14} className="text-surface-400 mt-2.5 shrink-0" />
              <Select
                placeholder="Departamento"
                options={deptOptions}
                value={dept}
                onChange={(e) => { setDept(e.target.value); setPage(1) }}
                className="w-48"
              />
              {(search || dept) && (
                <Button
                  variant="ghost" size="md"
                  onClick={() => { setSearch(""); setDept(""); setPage(1) }}
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
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-10 rounded" />
            ))}
          </div>
        ) : !data?.items?.length ? (
          <EmptyState
            icon={Users}
            title="Nenhum colaborador encontrado"
            description={
              search || dept
                ? "Tente ajustar os filtros."
                : "Importe uma planilha ou cadastre manualmente."
            }
            action={
              !search && !dept && (
                <div className="flex gap-2">
                  <Button
                    variant="secondary" size="sm"
                    onClick={() => navigate("/upload")}
                  >
                    <Upload size={13} />
                    Importar planilha
                  </Button>
                  <Button
                    variant="primary" size="sm"
                    onClick={openCreate}
                  >
                    <Plus size={13} />
                    Cadastrar
                  </Button>
                </div>
              )
            }
          />
        ) : (
          <div className="space-y-0">
            <div className="table-wrapper rounded-xl border-0">
              <table className="table">
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Cargo</th>
                    <th>Departamento</th>
                    <th>Gestor</th>
                    <th>Salário</th>
                    <th>Admissão</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((emp) => (
                    <tr key={emp.id}>
                      <td>
                        <div>
                          <p className="font-medium text-surface-800">
                            {emp.name}
                          </p>
                          {emp.registration && (
                            <p className="text-[10px] text-surface-400 font-mono">
                              #{emp.registration}
                            </p>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <p className="text-surface-700 text-xs">
                            {emp.position_title || "—"}
                          </p>
                          {emp.position_seniority && (
                            <p className="text-[10px] text-surface-400">
                              {SENIORITY_LABELS[emp.position_seniority]
                                ?? emp.position_seniority}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="text-surface-600 text-xs">
                        {emp.department || "—"}
                      </td>
                      <td className="text-surface-500 text-xs max-w-[120px] truncate">
                        {emp.manager_name || "—"}
                      </td>
                      <td className="font-mono text-xs font-semibold
                                     text-surface-800">
                        {fmt(emp.current_salary)}
                      </td>
                      <td className="text-surface-500 text-xs">
                        {emp.hire_date
                          ? new Date(emp.hire_date).toLocaleDateString("pt-BR")
                          : "—"
                        }
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(emp)}
                            className="p-1.5 rounded-lg text-surface-400
                                       hover:bg-surface-100 hover:text-brand-600
                                       transition-colors"
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(emp)}
                            className="p-1.5 rounded-lg text-surface-400
                                       hover:bg-red-50 hover:text-danger
                                       transition-colors"
                            title="Desativar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-surface-100">
              <Pagination
                page={data.page}
                pages={data.pages}
                total={data.total}
                onPage={setPage}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modal de cadastro/edição */}
      <EmployeeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
      />

      {/* Modal de confirmação */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Desativar colaborador"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary" size="sm"
              onClick={() => setDeleteTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger" size="sm"
              onClick={() => handleDeactivate(deleteTarget)}
              loading={deactivate.isPending}
            >
              Desativar
            </Button>
          </div>
        }
      >
        <p className="text-sm text-surface-700">
          Desativar{" "}
          <span className="font-semibold">"{deleteTarget?.name}"</span>?
        </p>
        <p className="text-xs text-surface-400 mt-2">
          O colaborador será removido das análises e relatórios.
        </p>
      </Modal>
    </div>
  )
}