// frontend/src/hooks/usePositions.js

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import positionService from "../services/positionService"

export function usePositions(params = {}) {
  return useQuery({
    queryKey: ["positions", params],
    queryFn: () => positionService.list(params),
    staleTime: 1000 * 60 * 5,
  })
}

export function usePositionTree() {
  return useQuery({
    queryKey: ["positions-tree"],
    queryFn: () => positionService.getTree(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreatePosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => positionService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["positions"] }),
  })
}

export function useUpdatePosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => positionService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["positions"] }),
  })
}

export function useDeactivatePosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => positionService.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["positions"] }),
  })
}