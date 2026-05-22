// frontend/src/components/layout/Sidebar.jsx

import { NavLink, useNavigate } from "react-router-dom"
import { clsx } from "clsx"
import useAuthStore from "../../store/authStore"
import {
  BarChart3,
  Users,
  Briefcase,
  Upload,
  GitBranch,
  FileText,
  LogOut,
  Settings,
  LayoutDashboard,
  TrendingUp,
  Building2,
  Activity,
} from "lucide-react"


const NAV_ITEMS = [
  {
    section: "Principal",
    items: [
      { label: "Dashboard",     path: "/dashboard",   icon: LayoutDashboard },
      { label: "Análise Salarial", path: "/salaries", icon: TrendingUp },
      { label: "Diagnóstico", path: "/diagnostic", icon: Activity },
    ],
  },
  {
    section: "Estrutura",
    items: [
      { label: "Cargos",        path: "/positions",   icon: Briefcase },
      { label: "Organograma",   path: "/org-chart",   icon: GitBranch },
      { label: "Colaboradores", path: "/employees",   icon: Users },
    ],
  },
  {
    section: "Dados",
    items: [
      { label: "Importar Planilha", path: "/upload",  icon: Upload },
      { label: "Relatórios",    path: "/reports",     icon: FileText },
    ],
  },
]

const ROLE_LABELS = {
  admin:      "Administrador",
  consultant: "Consultor RH",
  client:     "Cliente",
}

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate         = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  return (
    <aside className="flex flex-col w-60 min-h-screen
                      bg-white border-r border-surface-200
                      shrink-0">

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16
                      border-b border-surface-100">
        <div className="flex items-center justify-center
                        w-8 h-8 rounded-lg bg-brand-600">
          <BarChart3 size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-display font-bold text-surface-900 leading-none">
            SalaryPlatform
          </p>
          <p className="text-[10px] text-surface-400 mt-0.5">
            Cargos &amp; Salários
          </p>
        </div>
      </div>

      {/* Empresa ativa */}
      {user && (
        <div className="mx-3 mt-3 px-3 py-2.5 rounded-lg bg-surface-50
                        border border-surface-200">
          <div className="flex items-center gap-2">
            <Building2 size={13} className="text-surface-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-surface-700 truncate">
                {user.full_name}
              </p>
              <p className="text-[10px] text-surface-400">
                {ROLE_LABELS[user.role] || user.role}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {NAV_ITEMS.map((group) => (
          <div key={group.section}>
            <p className="text-[10px] font-semibold uppercase tracking-widest
                          text-surface-400 px-3 mb-1.5">
              {group.section}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      clsx("nav-item", isActive && "nav-item-active")
                    }
                  >
                    <item.icon size={16} className="shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Rodapé da sidebar */}
      <div className="px-3 py-3 border-t border-surface-100 space-y-0.5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx("nav-item", isActive && "nav-item-active")
          }
        >
          <Settings size={16} className="shrink-0" />
          <span>Configurações</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="nav-item w-full text-left
                     hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={16} className="shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}