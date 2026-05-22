// frontend/src/store/authStore.js

import { create } from "zustand"
import authService from "../services/authService"

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,   // true até verificar sessão existente

  // ── Actions ────────────────────────────────────────────────────

  login: async (email, password) => {
    const data = await authService.login(email, password)

    localStorage.setItem("access_token", data.access_token)
    localStorage.setItem("refresh_token", data.refresh_token)

    // Busca dados do usuário logo após login
    const user = await authService.getMe()

    set({ user, isAuthenticated: true })
    return user
  },

  logout: async () => {
    try {
      await authService.logout()
    } finally {
      set({ user: null, isAuthenticated: false })
    }
  },

  checkSession: async () => {
    // Chamado na inicialização do app
    const token = localStorage.getItem("access_token")
    if (!token) {
      set({ isLoading: false })
      return
    }
    try {
      const user = await authService.getMe()
      set({ user, isAuthenticated: true, isLoading: false })
    } catch {
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  setUser: (user) => set({ user }),
}))


export default useAuthStore
