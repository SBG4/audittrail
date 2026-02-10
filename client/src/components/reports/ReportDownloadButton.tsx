import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDownloadHtmlReport } from "@/hooks/useReports";

interface ReportDownloadButtonProps {
  caseId: string;
}

export default function ReportDownloadButton({
  caseId,
}: ReportDownloadButtonProps) {
  const { downloadHtmlReport, isLoading, error } =
    useDownloadHtmlReport(caseId);

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        onClick={downloadHtmlReport}
        disabled={isLoading}
        className="gap-2"
      >
        <FileDown className="size-4" />
        {isLoading ? "Generating..." : "Download HTML Report"}
      </Button>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
