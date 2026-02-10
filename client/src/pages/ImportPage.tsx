import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/import/FileUpload";
import ColumnMapper from "@/components/import/ColumnMapper";
import ImportSummary from "@/components/import/ImportSummary";
import { useConfirmImport } from "@/hooks/useImport";
import type {
  ImportUploadResponse,
  ImportValidationResponse,
  ImportConfirmResponse,
} from "@/types/import";

type ImportStep = "upload" | "map" | "review" | "done";

export default function ImportPage() {
  const { id: caseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirmImport = useConfirmImport(caseId ?? "");

  const [step, setStep] = useState<ImportStep>("upload");
  const [uploadResponse, setUploadResponse] =
    useState<ImportUploadResponse | null>(null);
  const [validationResponse, setValidationResponse] =
    useState<ImportValidationResponse | null>(null);
  const [confirmResult, setConfirmResult] =
    useState<ImportConfirmResponse | null>(null);

  function handleUploadComplete(response: ImportUploadResponse) {
    setUploadResponse(response);
    setStep("map");
  }

  function handleMappingComplete(response: ImportValidationResponse) {
    setValidationResponse(response);
    setStep("review");
  }

  function handleConfirm() {
    if (!validationResponse) return;
    confirmImport.mutate(
      { session_id: validationResponse.session_id },
      {
        onSuccess: (result) => {
          setConfirmResult(result);
          setStep("done");
        },
      },
    );
  }

  function handleBackToMapping() {
    setStep("map");
  }

  if (!caseId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No case ID provided.
      </div>
    );
  }

  const stepNumber =
    step === "upload" ? 1 : step === "map" ? 2 : step === "review" ? 3 : 3;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        to={`/cases/${caseId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to case
      </Link>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold">Import Data</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a spreadsheet and map columns to create timeline events.
        </p>
      </div>

      {/* Step indicator */}
      {step !== "done" && (
        <div className="flex items-center gap-2">
          {[
            { num: 1, label: "Upload" },
            { num: 2, label: "Map Columns" },
            { num: 3, label: "Review & Import" },
          ].map(({ num, label }) => (
            <div key={num} className="flex items-center gap-2">
              {num > 1 && (
                <div
                  className={`h-px w-8 ${
                    num <= stepNumber ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
              <div
                className={`flex items-center gap-1.5 text-xs font-medium ${
                  num === stepNumber
                    ? "text-primary"
                    : num < stepNumber
                      ? "text-muted-foreground"
                      : "text-muted-foreground/50"
                }`}
              >
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-xs ${
                    num === stepNumber
                      ? "bg-primary text-primary-foreground"
                      : num < stepNumber
                        ? "bg-muted text-muted-foreground"
                        : "bg-muted/50 text-muted-foreground/50"
                  }`}
                >
                  {num}
                </span>
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step content */}
      {step === "upload" && (
        <FileUpload caseId={caseId} onUploadComplete={handleUploadComplete} />
      )}

      {step === "map" && uploadResponse && (
        <ColumnMapper
          caseId={caseId}
          uploadResponse={uploadResponse}
          onMappingComplete={handleMappingComplete}
        />
      )}

      {step === "review" && validationResponse && (
        <ImportSummary
          validationResponse={validationResponse}
          onConfirm={handleConfirm}
          onBack={handleBackToMapping}
          isConfirming={confirmImport.isPending}
        />
      )}

      {step === "done" && confirmResult && (
        <div className="space-y-6 text-center py-8">
          <div className="flex justify-center">
            <CheckCircle2 className="size-16 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Import Complete</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Successfully created{" "}
              <span className="font-medium text-foreground">
                {confirmResult.created_count}
              </span>{" "}
              event{confirmResult.created_count !== 1 ? "s" : ""}.
              {confirmResult.error_count > 0 && (
                <>
                  {" "}
                  <span className="text-destructive">
                    {confirmResult.error_count} error
                    {confirmResult.error_count !== 1 ? "s" : ""}
                  </span>{" "}
                  occurred.
                </>
              )}
            </p>
          </div>
          {confirmResult.errors.length > 0 && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 px-4 py-3 text-left">
              <p className="text-sm font-medium text-destructive mb-1">
                Errors:
              </p>
              <ul className="text-xs text-destructive space-y-1">
                {confirmResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          <Button onClick={() => navigate(`/cases/${caseId}`)}>
            View Timeline
          </Button>
        </div>
      )}

      {/* Confirm error */}
      {confirmImport.isError && step === "review" && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">
            {confirmImport.error?.message ?? "Import failed"}
          </p>
        </div>
      )}
    </div>
  );
}
