import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditType } from "@/types/case";

interface AuditTypeListResponse {
  items: AuditType[];
  total: number;
}

export function useAuditTypes() {
  return useQuery({
    queryKey: ["audit-types"],
    queryFn: async () => {
      const data = await api.get<AuditTypeListResponse>("/api/audit-types");
      return data.items;
    },
  });
}

export function useAuditType(id: string) {
  return useQuery({
    queryKey: ["audit-types", id],
    queryFn: () => api.get<AuditType>(`/api/audit-types/${id}`),
    enabled: !!id,
  });
}
