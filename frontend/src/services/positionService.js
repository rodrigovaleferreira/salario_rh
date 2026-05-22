// frontend/src/services/positionService.js

import api from "./api"

const positionService = {
  async list(params = {}) {
    const { data } = await api.get("/positions", { params })
    return data
  },

  async getById(id) {
    const { data } = await api.get(`/positions/${id}`)
    return data
  },

  async create(payload) {
    const { data } = await api.post("/positions", payload)
    return data
  },

  async update(id, payload) {
    const { data } = await api.patch(`/positions/${id}`, payload)
    return data
  },

  async deactivate(id) {
    await api.delete(`/positions/${id}`)
  },

  async getTree() {
    const { data } = await api.get("/positions/tree")
    return data
  },
}

export default positionService