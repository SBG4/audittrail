import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  JiraFieldMapping,
  JiraFieldMappingCreate,
  JiraScrapeRequest,
  JiraScrapeResponse,
} from "@/types/jira";

export function useJiraFieldMappings(auditTypeId: string) {
  return useQuery({
    queryKey: ["jira-mappings", auditTypeId],
    queryFn: () =>
      api.get<JiraFieldMapping[]>(`/api/jira/mappings/${auditTypeId}`),
    enabled: !!auditTypeId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateJiraFieldMappings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      auditTypeId,
      mappings,
    }: {
      auditTypeId: string;
      mappings: JiraFieldMappingCreate[];
    }) =>
      api.put<JiraFieldMapping[]>(`/api/jira/mappings/${auditTypeId}`, {
        mappings,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["jira-mappings", variables.auditTypeId],
      });
    },
  });
}

export function useJiraScrape() {
  return useMutation({
    mutationFn: (body: JiraScrapeRequest) =>
      api.post<JiraScrapeResponse>("/api/jira/scrape", body),
  });
}

export function useJiraScrapeAndMap() {
  return useMutation({
    mutationFn: ({
      auditTypeId,
      ...body
    }: JiraScrapeRequest & { auditTypeId: string }) =>
      api.post<JiraScrapeResponse>(
        `/api/jira/scrape-and-map?audit_type_id=${auditTypeId}`,
        body
      ),
  });
}
