// frontend/src/services/employeeService.js

import api from "./api"

const employeeService = {
  async list(params = {}) {
    const { data } = await api.get("/employees/", { params })
    return data
  },

  async create(payload) {
    const { data } = await api.post("/employees/", payload)
    return data
  },

  async update(id, payload) {
    const { data } = await api.patch(`/employees/${id}`, payload)
    return data
  },

  async deactivate(id) {
    await api.delete(`/employees/${id}`)
  },

  async getHeadcountByDepartment() {
    const { data } = await api.get("/employees/headcount-by-department")
    return data
  },

  async getSalaryHistogram() {
    const { data } = await api.get("/employees/salary-histogram")
    return data
  },

  async getDiagnostic() {
    const { data } = await api.get("/employees/diagnostic")
    return data
  },
}

export default employeeService