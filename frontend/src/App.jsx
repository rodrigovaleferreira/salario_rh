// frontend/src/App.jsx

import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import useAuthStore from "./store/authStore"
import ProtectedRoute from "./components/layout/ProtectedRoute"
import AppLayout from "./components/layout/AppLayout"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Positions  from "./pages/Positions"
import Upload     from "./pages/Upload"
import Salaries  from "./pages/Salaries"
import OrgChart  from "./pages/OrgChart"
import Employees  from "./pages/Employees"
import Diagnostic from "./pages/Diagnostic"
import Reports from "./pages/Reports"


// Páginas (stubs — implementadas nas próximas etapas)
const Settings     = () => <div className="page-title">Configurações</div>
const NotFound     = () => <div className="page-title">Página não encontrada</div>

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutos
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  const checkSession = useAuthStore((s) => s.checkSession)

  // Verifica sessão existente na inicialização
  useEffect(() => {
    checkSession()
  }, [checkSession])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Pública */}
          <Route path="/login" element={<Login />} />

          {/* Protegidas */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"  element={<Dashboard />} />
            <Route path="salaries"   element={<Salaries />} />
            <Route path="positions"  element={<Positions />} />
            <Route path="org-chart"  element={<OrgChart />} />
            <Route path="employees"  element={<Employees />} />
            <Route path="upload"     element={<Upload />} />
            <Route path="reports"    element={<Reports />} />
            <Route path="settings"   element={<Settings />} />
            <Route path="diagnostic" element={<Diagnostic />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}