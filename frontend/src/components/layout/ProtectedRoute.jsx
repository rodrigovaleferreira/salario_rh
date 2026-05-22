// frontend/src/components/layout/ProtectedRoute.jsx

import { Navigate, useLocation } from "react-router-dom"
import useAuthStore from "../../store/authStore"

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, isLoading, user } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent
                          rounded-full animate-spin" />
          <p className="text-sm text-surface-500">Verificando sessão...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Verifica role se informado
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}