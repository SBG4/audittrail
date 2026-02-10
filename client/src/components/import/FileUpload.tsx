import { useState, useRef, useCallback } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadFile } from "@/hooks/useImport";
import type { ImportUploadResponse } from "@/types/import";

interface FileUploadProps {
  caseId: string;
  onUploadComplete: (response: ImportUploadResponse) => void;
}

export default function FileUpload({
  caseId,
  onUploadComplete,
}: FileUploadProps) {
  const uploadFile = useUploadFile(caseId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !["csv", "xlsx", "xls"].includes(ext)) {
        uploadFile.reset();
        return;
      }
      uploadFile.mutate(file, {
        onSuccess: onUploadComplete,
      });
    },
    [uploadFile, onUploadComplete],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-4">
      <div
        className={`flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="rounded-full bg-muted p-4">
          <FileSpreadsheet className="size-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">
            Drag and drop your file here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports .csv, .xlsx, and .xls files (max 10MB)
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadFile.isPending}
        >
          <Upload className="size-4 mr-2" />
          {uploadFile.isPending ? "Uploading..." : "Choose File"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      {uploadFile.isError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">
            {uploadFile.error?.message ?? "Upload failed"}
          </p>
        </div>
      )}
    </div>
  );
}
