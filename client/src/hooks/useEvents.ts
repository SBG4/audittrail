import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  TimelineEvent,
  EventListResponse,
  CreateEventRequest,
  UpdateEventRequest,
} from "@/types/event";

export function useEvents(caseId: string) {
  return useQuery({
    queryKey: ["events", caseId],
    queryFn: () =>
      api.get<EventListResponse>(`/api/cases/${caseId}/events`),
    enabled: !!caseId,
    staleTime: 30000,
  });
}

export function useCreateEvent(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateEventRequest) =>
      api.post<TimelineEvent>(`/api/cases/${caseId}/events`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", caseId] });
    },
  });
}

export function useUpdateEvent(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateEventRequest & { id: string }) =>
      api.patch<TimelineEvent>(`/api/cases/${caseId}/events/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", caseId] });
    },
  });
}

export function useDeleteEvent(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<void>(`/api/cases/${caseId}/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", caseId] });
    },
  });
}
