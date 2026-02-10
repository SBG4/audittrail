import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  ImportUploadResponse,
  ColumnMappingRequest,
  ImportValidationResponse,
  ImportConfirmRequest,
  ImportConfirmResponse,
} from "@/types/import";

export function useUploadFile(caseId: string) {
  return useMutation({
    mutationFn: (file: File) =>
      api.upload<ImportUploadResponse>(
        `/api/cases/${caseId}/imports/upload`,
        file,
      ),
  });
}

export function useValidateMapping(caseId: string) {
  return useMutation({
    mutationFn: (body: ColumnMappingRequest) =>
      api.post<ImportValidationResponse>(
        `/api/cases/${caseId}/imports/validate`,
        body,
      ),
  });
}

export function useConfirmImport(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ImportConfirmRequest) =>
      api.post<ImportConfirmResponse>(
        `/api/cases/${caseId}/imports/confirm`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", caseId] });
    },
  });
}
