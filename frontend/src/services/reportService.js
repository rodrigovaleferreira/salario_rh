// frontend/src/services/reportService.js

import api from "./api"

const reportService = {
  async downloadPdf() {
    const response = await api.get("/reports/full-report/pdf", {
      responseType: "blob",
    })
    _triggerDownload(response.data, _getFilename(response, "relatorio.pdf"))
  },

  async downloadXlsx() {
    const response = await api.get("/reports/full-report/xlsx", {
      responseType: "blob",
    })
    _triggerDownload(
      response.data,
      _getFilename(response, "dados_salariais.xlsx")
    )
  },
}

function _triggerDownload(blob, filename) {
  const url  = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href     = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function _getFilename(response, fallback) {
  const disposition = response.headers["content-disposition"] || ""
  const match = disposition.match(/filename="?([^"]+)"?/)
  return match ? match[1] : fallback
}

export default reportService