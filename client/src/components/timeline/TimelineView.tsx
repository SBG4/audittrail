import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import TimelineRow from "./TimelineRow";
import { useEvents, useCreateEvent, useDeleteEvent } from "@/hooks/useEvents";

interface TimelineViewProps {
  caseId: string;
}

export default function TimelineView({ caseId }: TimelineViewProps) {
  const { data, isLoading, error } = useEvents(caseId);
  const createEvent = useCreateEvent(caseId);
  const deleteEvent = useDeleteEvent(caseId);

  function handleAddEvent() {
    const today = new Date().toISOString().split("T")[0];
    createEvent.mutate({
      event_type: "note",
      event_date: today,
    });
  }

  function handleDelete(eventId: string) {
    deleteEvent.mutate(eventId);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading timeline...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center">
        <p className="text-destructive">{error.message}</p>
      </div>
    );
  }

  const events = data?.items ?? [];

  return (
    <div className="space-y-4">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {events.length} event{events.length !== 1 ? "s" : ""}
        </h3>
        <Button
          size="sm"
          onClick={handleAddEvent}
          disabled={createEvent.isPending}
        >
          <Plus className="size-4 mr-1" />
          {createEvent.isPending ? "Adding..." : "Add Event"}
        </Button>
      </div>

      {/* Empty state */}
      {events.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-muted-foreground">
            No events yet. Add the first event to start building the timeline.
          </p>
        </div>
      )}

      {/* Events table */}
      {events.length > 0 && (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-10">
                  Type
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Date
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Time
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  File Name
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                  Count
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Description
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  File Type
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-10">
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <TimelineRow
                  key={event.id}
                  event={event}
                  onDelete={handleDelete}
                  isDeleting={deleteEvent.isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
