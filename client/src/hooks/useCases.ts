import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Case,
  CaseListResponse,
  CaseFilters,
  CreateCaseRequest,
  UpdateCaseRequest,
} from "@/types/case";

export function useCases(filters: CaseFilters) {
  return useQuery({
    queryKey: ["cases", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== "") {
          params.set(key, String(value));
        }
      }
      const qs = params.toString();
      const url = qs ? `/api/cases?${qs}` : "/api/cases";
      return api.get<CaseListResponse>(url);
    },
  });
}

export function useCase(id: string) {
  return useQuery({
    queryKey: ["cases", id],
    queryFn: () => api.get<Case>(`/api/cases/${id}`),
    enabled: !!id,
  });
}

export function useCreateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCaseRequest) =>
      api.post<Case>("/api/cases", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
  });
}

export function useUpdateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateCaseRequest & { id: string }) =>
      api.patch<Case>(`/api/cases/${id}`, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["cases"] });
      void queryClient.invalidateQueries({
        queryKey: ["cases", variables.id],
      });
    },
  });
}

export function useDeleteCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/cases/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
  });
}
