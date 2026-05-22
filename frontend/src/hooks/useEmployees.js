// frontend/src/hooks/useEmployees.js

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import employeeService from "../services/employeeService"

export function useEmployees(params = {}) {
  return useQuery({
    queryKey: ["employees", params],
    queryFn:  () => employeeService.list(params),
    staleTime: 1000 * 60 * 3,
  })
}

export function useDiagnostic() {
  return useQuery({
    queryKey: ["diagnostic"],
    queryFn:  () => employeeService.getDiagnostic(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => employeeService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => employeeService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  })
}

export function useDeactivateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => employeeService.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  })
}