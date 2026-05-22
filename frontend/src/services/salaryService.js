// frontend/src/services/salaryService.js

import api from "./api"

const salaryService = {
  async getSummary(department = null) {
    const params = department ? { department } : {}
    const { data } = await api.get("/salaries/summary", { params })
    return data
  },

  async getAnalysis(department = null) {
    const params = department ? { department } : {}
    const { data } = await api.get("/salaries/analysis", { params })
    return data
  },

  async getBands() {
    const { data } = await api.get("/salaries/bands")
    return data
  },

  async createBand(payload) {
    const { data } = await api.post("/salaries/bands", payload)
    return data
  },

  async autoCalculateBands(spreadPercent = 50) {
    const { data } = await api.post("/salaries/bands/auto-calculate", null, {
      params: { spread_percent: spreadPercent },
    })
    return data
  },

  async getCompression() {
    const { data } = await api.get("/salaries/compression")
    return data
  },

  async getDepartmentComparison() {
    const { data } = await api.get("/salaries/department-comparison")
    return data
  },
}

export default salaryService