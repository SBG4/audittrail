import { useState } from "react";
import { Package, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDeleteFileBatch } from "@/hooks/useFileBatches";
import { BatchForm } from "./BatchForm";
import type { FileBatch } from "@/types/file-batch";

interface BatchListProps {
  caseId: string;
  eventId: string;
  batches: FileBatch[];
}

export function BatchList({ caseId, eventId, batches }: BatchListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const deleteMutation = useDeleteFileBatch(caseId, eventId);

  function handleDelete(batchId: string) {
    if (!window.confirm("Delete this file batch?")) return;
    deleteMutation.mutate(batchId);
  }

  return (
    <div className="space-y-2">
      {batches.length === 0 && !showCreate && (
        <p className="text-sm text-muted-foreground">
          No file batches. Add one to track file evidence.
        </p>
      )}

      {batches.map((batch) =>
        editingId === batch.id ? (
          <BatchForm
            key={batch.id}
            caseId={caseId}
            eventId={eventId}
            batch={batch}
            onClose={() => setEditingId(null)}
          />
        ) : (
          <div
            key={batch.id}
            className="group flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
          >
            <Package className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{batch.label}</span>
                <Badge variant="outline" className="text-xs">
                  {batch.file_count} {batch.file_count === 1 ? "file" : "files"}
                </Badge>
                {batch.file_types && (
                  <span className="text-xs text-muted-foreground">
                    {batch.file_types}
                  </span>
                )}
              </div>
              {batch.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {batch.description}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setEditingId(batch.id)}
                title="Edit batch"
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handleDelete(batch.id)}
                title="Delete batch"
                disabled={deleteMutation.isPending}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        )
      )}

      {showCreate ? (
        <BatchForm
          caseId={caseId}
          eventId={eventId}
          onClose={() => setShowCreate(false)}
        />
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="size-3.5" />
          Add batch
        </Button>
      )}
    </div>
  );
}
