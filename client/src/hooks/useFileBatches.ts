import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  FileBatch,
  CreateFileBatchRequest,
  UpdateFileBatchRequest,
} from "@/types/file-batch";

export function useFileBatches(caseId: string, eventId: string) {
  return useQuery({
    queryKey: ["file-batches", caseId, eventId],
    queryFn: () =>
      api.get<FileBatch[]>(
        `/api/cases/${caseId}/events/${eventId}/batches`
      ),
    enabled: !!caseId && !!eventId,
  });
}

export function useCreateFileBatch(caseId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFileBatchRequest) =>
      api.post<FileBatch>(
        `/api/cases/${caseId}/events/${eventId}/batches`,
        body
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["file-batches", caseId, eventId],
      });
      queryClient.invalidateQueries({ queryKey: ["events", caseId] });
    },
  });
}

export function useUpdateFileBatch(caseId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateFileBatchRequest & { id: string }) =>
      api.patch<FileBatch>(
        `/api/cases/${caseId}/events/${eventId}/batches/${id}`,
        body
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["file-batches", caseId, eventId],
      });
      queryClient.invalidateQueries({ queryKey: ["events", caseId] });
    },
  });
}

export function useDeleteFileBatch(caseId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<void>(
        `/api/cases/${caseId}/events/${eventId}/batches/${id}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["file-batches", caseId, eventId],
      });
      queryClient.invalidateQueries({ queryKey: ["events", caseId] });
    },
  });
}
