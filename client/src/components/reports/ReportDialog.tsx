import { useState } from "react";
import { FileText, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGenerateReport } from "@/hooks/useReports";
import type { ReportFormat, ReportMode } from "@/types/report";

interface ReportDialogProps {
  caseId: string;
  caseNumber: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReportDialog({
  caseId,
  caseNumber,
  open,
  onOpenChange,
}: ReportDialogProps) {
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [mode, setMode] = useState<ReportMode>("timeline");
  const generateReport = useGenerateReport(caseId);

  function handleGenerate() {
    generateReport.mutate(
      { format, mode },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Report</DialogTitle>
          <DialogDescription>
            Select format and mode for case #{caseNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Format selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={format === "pdf" ? "default" : "outline"}
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => setFormat("pdf")}
              >
                <FileText className="size-5" />
                <span className="text-sm font-medium">PDF</span>
              </Button>
              <Button
                type="button"
                variant={format === "docx" ? "default" : "outline"}
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => setFormat("docx")}
              >
                <FileText className="size-5" />
                <span className="text-sm font-medium">DOCX</span>
              </Button>
            </div>
          </div>

          {/* Mode selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Mode</label>
            <div className="grid grid-cols-1 gap-2">
              <Button
                type="button"
                variant={mode === "timeline" ? "default" : "outline"}
                className="h-auto py-3 text-left justify-start"
                onClick={() => setMode("timeline")}
              >
                <div>
                  <div className="text-sm font-medium">Quick Timeline</div>
                  <div className="text-xs opacity-70">
                    Case summary with chronological events
                  </div>
                </div>
              </Button>
              <Button
                type="button"
                variant={mode === "narrative" ? "default" : "outline"}
                className="h-auto py-3 text-left justify-start"
                onClick={() => setMode("narrative")}
              >
                <div>
                  <div className="text-sm font-medium">Detailed Narrative</div>
                  <div className="text-xs opacity-70">
                    Findings, conclusions, and recommendations
                  </div>
                </div>
              </Button>
            </div>
          </div>

          {/* Error message */}
          {generateReport.isError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {generateReport.error instanceof Error
                ? generateReport.error.message
                : "Failed to generate report"}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={generateReport.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generateReport.isPending}
            className="gap-2"
          >
            <FileDown className="size-4" />
            {generateReport.isPending ? "Generating..." : "Generate & Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
