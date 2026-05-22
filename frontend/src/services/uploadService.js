// frontend/src/services/uploadService.js

import api from "./api"

const uploadService = {
  async uploadFile(file, onProgress) {
    const formData = new FormData()
    formData.append("file", file)

    const { data } = await api.post("/uploads/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total))
        }
      },
    })
    return data
  },

  async confirmImport(fileId, columnMappings) {
    const { data } = await api.post("/uploads/confirm", {
      file_id: fileId,
      column_mappings: columnMappings,
    })
    return data
  },
}

export default uploadService