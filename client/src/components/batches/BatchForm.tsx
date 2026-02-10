import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateFileBatch, useUpdateFileBatch } from "@/hooks/useFileBatches";
import type { FileBatch } from "@/types/file-batch";

interface BatchFormProps {
  caseId: string;
  eventId: string;
  batch?: FileBatch;
  onClose: () => void;
}

export function BatchForm({ caseId, eventId, batch, onClose }: BatchFormProps) {
  const isEditing = !!batch;

  const [label, setLabel] = useState(batch?.label ?? "");
  const [fileCount, setFileCount] = useState<number>(batch?.file_count ?? 0);
  const [fileTypes, setFileTypes] = useState(batch?.file_types ?? "");
  const [description, setDescription] = useState(batch?.description ?? "");

  const createMutation = useCreateFileBatch(caseId, eventId);
  const updateMutation = useUpdateFileBatch(caseId, eventId);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const data = {
      label: label.trim(),
      file_count: fileCount,
      file_types: fileTypes.trim() || undefined,
      description: description.trim() || undefined,
    };

    if (isEditing && batch) {
      updateMutation.mutate(
        { id: batch.id, ...data },
        { onSuccess: onClose }
      );
    } else {
      createMutation.mutate(data, { onSuccess: onClose });
    }
  }

  // Public method for template pre-filling (called from parent)
  function applyTemplate(defaults: {
    label?: string;
    description?: string;
    file_types?: string;
  }) {
    if (defaults.label !== undefined) setLabel(defaults.label);
    if (defaults.description !== undefined) setDescription(defaults.description);
    if (defaults.file_types !== undefined) setFileTypes(defaults.file_types);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border p-3">
      <div className="space-y-1.5">
        <Label htmlFor="batch-label">Label</Label>
        <Input
          id="batch-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., USB File Copy"
          required
          maxLength={200}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="batch-file-count">File Count</Label>
        <Input
          id="batch-file-count"
          type="number"
          value={fileCount}
          onChange={(e) => setFileCount(Math.max(0, parseInt(e.target.value) || 0))}
          placeholder="Number of files"
          required
          min={0}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="batch-file-types">File Types</Label>
        <Input
          id="batch-file-types"
          value={fileTypes}
          onChange={(e) => setFileTypes(e.target.value)}
          placeholder=".pdf, .docx, .xlsx"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="batch-description">Description</Label>
        <Textarea
          id="batch-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the file batch"
          className="min-h-12"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error.message}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending || !label.trim()}>
          {isPending ? "Saving..." : isEditing ? "Update" : "Create"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Export applyTemplate helper for external use
BatchForm.displayName = "BatchForm";
