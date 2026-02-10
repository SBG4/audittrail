import { useState } from "react";
import { ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useValidateMapping } from "@/hooks/useImport";
import type { ImportUploadResponse, ImportValidationResponse } from "@/types/import";

interface ColumnMapperProps {
  caseId: string;
  uploadResponse: ImportUploadResponse;
  onMappingComplete: (response: ImportValidationResponse) => void;
}

const EVENT_FIELD_OPTIONS: { value: string; label: string }[] = [
  { value: "__skip__", label: "(skip)" },
  { value: "event_date", label: "Event Date" },
  { value: "event_time", label: "Event Time" },
  { value: "event_type", label: "Event Type" },
  { value: "file_name", label: "File Name" },
  { value: "file_count", label: "File Count" },
  { value: "file_description", label: "File Description" },
  { value: "file_type", label: "File Type" },
];

export default function ColumnMapper({
  caseId,
  uploadResponse,
  onMappingComplete,
}: ColumnMapperProps) {
  const validateMapping = useValidateMapping(caseId);

  // Initialize mappings: each header -> "__skip__"
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const header of uploadResponse.headers) {
      initial[header] = "__skip__";
    }
    return initial;
  });

  function handleMappingChange(header: string, value: string) {
    setMappings((prev) => ({ ...prev, [header]: value }));
  }

  const activeMappings = Object.entries(mappings).filter(
    ([, v]) => v !== "__skip__",
  );

  const hasDateMapping = activeMappings.some(
    ([, v]) => v === "event_date",
  );

  function handleValidate() {
    const filteredMappings: Record<string, string> = {};
    for (const [col, field] of activeMappings) {
      filteredMappings[col] = field;
    }

    validateMapping.mutate(
      {
        session_id: uploadResponse.session_id,
        mappings: filteredMappings,
      },
      {
        onSuccess: onMappingComplete,
      },
    );
  }

  return (
    <div className="space-y-6">
      {/* File info */}
      <div className="rounded-md bg-muted px-4 py-3">
        <p className="text-sm">
          <span className="font-medium">{uploadResponse.filename}</span>
          {" -- "}
          {uploadResponse.row_count} row
          {uploadResponse.row_count !== 1 ? "s" : ""} detected
        </p>
      </div>

      {/* Column mapping */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Map Columns to Event Fields</h3>
        <p className="text-xs text-muted-foreground">
          Select which event field each spreadsheet column should map to.
          Event Date is required.
        </p>

        <div className="space-y-2">
          {uploadResponse.headers.map((header) => (
            <div
              key={header}
              className="flex items-center gap-3 rounded-md border px-3 py-2"
            >
              <span className="min-w-[140px] text-sm font-medium truncate">
                {header}
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              <Select
                value={mappings[header]}
                onValueChange={(value) => handleMappingChange(header, value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_FIELD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      {/* Data preview */}
      {uploadResponse.preview_rows.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Data Preview (first 5 rows)</h3>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  {uploadResponse.headers.map((header) => (
                    <th
                      key={header}
                      className={`px-3 py-2 text-left font-medium ${
                        mappings[header] !== "__skip__"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {header}
                      {mappings[header] !== "__skip__" && (
                        <span className="ml-1 text-[10px] font-normal opacity-70">
                          ({EVENT_FIELD_OPTIONS.find((o) => o.value === mappings[header])?.label})
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uploadResponse.preview_rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b last:border-b-0">
                    {uploadResponse.headers.map((header, j) => (
                      <td
                        key={j}
                        className={`px-3 py-1.5 ${
                          mappings[header] !== "__skip__"
                            ? "bg-primary/5"
                            : ""
                        }`}
                      >
                        {row[j] != null ? String(row[j]) : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Validation hint */}
      {!hasDateMapping && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/5 px-4 py-3">
          <AlertCircle className="size-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-700">
            Event Date mapping is required. Map a column to "Event Date" to
            continue.
          </p>
        </div>
      )}

      {/* Error from validation */}
      {validateMapping.isError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">
            {validateMapping.error?.message ?? "Validation failed"}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          onClick={handleValidate}
          disabled={!hasDateMapping || validateMapping.isPending}
        >
          {validateMapping.isPending
            ? "Validating..."
            : `Validate ${activeMappings.length} Mapping${activeMappings.length !== 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  );
}
