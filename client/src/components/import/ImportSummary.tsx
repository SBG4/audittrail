import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ImportValidationResponse } from "@/types/import";

interface ImportSummaryProps {
  validationResponse: ImportValidationResponse;
  onConfirm: () => void;
  onBack: () => void;
  isConfirming: boolean;
}

export default function ImportSummary({
  validationResponse,
  onConfirm,
  onBack,
  isConfirming,
}: ImportSummaryProps) {
  const { total_rows, valid_count, error_count, rows } = validationResponse;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold">{total_rows}</p>
          <p className="text-xs text-muted-foreground">Total Rows</p>
        </div>
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{valid_count}</p>
          <p className="text-xs text-green-600/80">Valid</p>
        </div>
        <div
          className={`rounded-lg border p-4 text-center ${
            error_count > 0
              ? "border-destructive/30 bg-destructive/5"
              : "border-muted"
          }`}
        >
          <p
            className={`text-2xl font-bold ${
              error_count > 0 ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {error_count}
          </p>
          <p
            className={`text-xs ${
              error_count > 0
                ? "text-destructive/80"
                : "text-muted-foreground"
            }`}
          >
            Errors
          </p>
        </div>
      </div>

      {/* Warning if errors */}
      {error_count > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/5 px-4 py-3">
          <AlertTriangle className="size-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-700">
            {error_count} row{error_count !== 1 ? "s" : ""} will be skipped
            due to validation errors. Only {valid_count} valid row
            {valid_count !== 1 ? "s" : ""} will be imported.
          </p>
        </div>
      )}

      {/* Row details */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Row Details</h3>
        <div className="max-h-[300px] overflow-y-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="border-b bg-muted/80">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-16">
                  Row
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-16">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.row_number}
                  className={`border-b last:border-b-0 ${
                    !row.valid ? "bg-destructive/5" : ""
                  }`}
                >
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">
                    {row.row_number}
                  </td>
                  <td className="px-3 py-1.5">
                    {row.valid ? (
                      <CheckCircle2 className="size-4 text-green-500" />
                    ) : (
                      <XCircle className="size-4 text-destructive" />
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-xs">
                    {row.valid ? (
                      <span className="text-muted-foreground">
                        {row.data.event_date as string}
                        {row.data.file_name
                          ? ` -- ${row.data.file_name}`
                          : ""}
                      </span>
                    ) : (
                      <span className="text-destructive">
                        {row.errors.join("; ")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} disabled={isConfirming}>
          Back to Mapping
        </Button>
        <Button
          onClick={onConfirm}
          disabled={valid_count === 0 || isConfirming}
        >
          {isConfirming
            ? "Importing..."
            : `Import ${valid_count} Event${valid_count !== 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  );
}
