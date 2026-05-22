// frontend/src/hooks/useSalary.js

import { useQuery } from "@tanstack/react-query"
import salaryService from "../services/salaryService"

export function useSalarySummary(department = null) {
  return useQuery({
    queryKey: ["salary-summary", department],
    queryFn: () => salaryService.getSummary(department),
    staleTime: 1000 * 60 * 5,
  })
}

export function useSalaryAnalysis(department = null) {
  return useQuery({
    queryKey: ["salary-analysis", department],
    queryFn: () => salaryService.getAnalysis(department),
    staleTime: 1000 * 60 * 5,
  })
}

export function useDepartmentComparison() {
  return useQuery({
    queryKey: ["department-comparison"],
    queryFn: () => salaryService.getDepartmentComparison(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCompression() {
  return useQuery({
    queryKey: ["compression"],
    queryFn: () => salaryService.getCompression(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useSalaryBands() {
  return useQuery({
    queryKey: ["salary-bands"],
    queryFn: () => salaryService.getBands(),
    staleTime: 1000 * 60 * 5,
  })
}