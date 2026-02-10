import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { ReportFormat, ReportMode } from "@/types/report";

const TOKEN_KEY = "token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Downloads a file from a URL with auth headers, triggering a browser download.
 */
async function downloadBlob(url: string, fallbackFilename: string) {
  const token = getToken();
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message =
      errorBody?.detail ??
      `Report generation failed with status ${response.status}`;
    throw new Error(message);
  }

  const blob = await response.blob();

  // Extract filename from Content-Disposition header
  const disposition = response.headers.get("Content-Disposition");
  let filename = fallbackFilename;
  if (disposition) {
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    if (match) {
      filename = match[1];
    }
  }

  // Trigger browser download
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

/**
 * Hook for downloading HTML reports (existing Phase 8 functionality).
 */
export function useDownloadHtmlReport(caseId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadHtmlReport() {
    setIsLoading(true);
    setError(null);

    try {
      await downloadBlob(
        `/api/cases/${caseId}/reports/html`,
        "audit-report.html",
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate report";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return { downloadHtmlReport, isLoading, error };
}

/**
 * Hook for generating PDF/DOCX reports with format and mode selection.
 */
export function useGenerateReport(caseId: string) {
  return useMutation({
    mutationFn: async ({
      format,
      mode,
    }: {
      format: ReportFormat;
      mode: ReportMode;
    }) => {
      const url = `/api/cases/${caseId}/reports/generate?format=${format}&mode=${mode}`;
      const fallbackFilename = `report.${format}`;
      await downloadBlob(url, fallbackFilename);
    },
  });
}
