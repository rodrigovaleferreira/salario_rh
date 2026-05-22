// frontend/src/services/authService.js

import api from "./api"

const authService = {
  async login(email, password) {
    const { data } = await api.post("/auth/login", { email, password })
    return data
  },

  async refresh(refreshToken) {
    const { data } = await api.post("/auth/refresh", {
      refresh_token: refreshToken,
    })
    return data
  },

  async logout() {
    try {
      await api.post("/auth/logout")
    } finally {
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
    }
  },

  async getMe() {
    const { data } = await api.get("/auth/me")
    return data
  },

  async requestPasswordReset(email) {
    await api.post("/auth/password-reset/request", { email })
  },
}

export default authService