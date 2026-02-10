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
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.audit_type_id) params.set("audit_type_id", filters.audit_type_id);
      if (filters.assigned_to_id) params.set("assigned_to_id", filters.assigned_to_id);
      if (filters.search) params.set("search", filters.search);
      if (filters.offset !== undefined) params.set("offset", String(filters.offset));
      if (filters.limit !== undefined) params.set("limit", String(filters.limit));

      const query = params.toString();
      const url = query ? `/api/cases?${query}` : "/api/cases";
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
    mutationFn: (body: CreateCaseRequest) =>
      api.post<Case>("/api/cases", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
  });
}

export function useUpdateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateCaseRequest & { id: string }) =>
      api.patch<Case>(`/api/cases/${id}`, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["cases", variables.id] });
    },
  });
}

export function useDeleteCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/cases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
  });
}
