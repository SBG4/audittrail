import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router";
import { Plus, Undo2, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import TimelineRow from "./TimelineRow";
import {
  useEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
} from "@/hooks/useEvents";
import type { TimelineEvent, EventListResponse } from "@/types/event";

interface TimelineViewProps {
  caseId: string;
}

export default function TimelineView({ caseId }: TimelineViewProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useEvents(caseId);
  const createEvent = useCreateEvent(caseId);
  const updateEvent = useUpdateEvent(caseId);
  const deleteEvent = useDeleteEvent(caseId);

  // Undo state
  const [deletedEvent, setDeletedEvent] = useState<TimelineEvent | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  function handleAddEvent() {
    const today = new Date().toISOString().split("T")[0];
    createEvent.mutate({
      event_type: "note",
      event_date: today,
    });
  }

  function handleFieldUpdate(
    eventId: string,
    field: string,
    value: unknown
  ) {
    updateEvent.mutate({
      id: eventId,
      [field]: value,
    });
  }

  const handleDelete = useCallback(
    (eventId: string) => {
      // Find the event to store for undo
      const events = data?.items ?? [];
      const eventToDelete = events.find((e) => e.id === eventId);
      if (!eventToDelete) return;

      // Store for undo
      setDeletedEvent(eventToDelete);

      // Optimistically remove from cache
      queryClient.setQueryData<EventListResponse>(
        ["events", caseId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.filter((e) => e.id !== eventId),
            total: old.total - 1,
          };
        }
      );

      // Clear any existing timer
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }

      // Start 5-second undo window, then permanently delete
      undoTimerRef.current = setTimeout(() => {
        deleteEvent.mutate(eventId, {
          onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["events", caseId] });
          },
        });
        setDeletedEvent(null);
        undoTimerRef.current = null;
      }, 5000);
    },
    [caseId, data, deleteEvent, queryClient]
  );

  const handleUndo = useCallback(() => {
    if (!deletedEvent) return;

    // Cancel the pending delete
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }

    // Restore event to cache
    queryClient.setQueryData<EventListResponse>(
      ["events", caseId],
      (old) => {
        if (!old) return old;
        const restored = [...old.items, deletedEvent].sort((a, b) => {
          const dateCompare = a.event_date.localeCompare(b.event_date);
          if (dateCompare !== 0) return dateCompare;
          const timeA = a.event_time ?? "";
          const timeB = b.event_time ?? "";
          const timeCompare = timeA.localeCompare(timeB);
          if (timeCompare !== 0) return timeCompare;
          return a.sort_order - b.sort_order;
        });
        return {
          ...old,
          items: restored,
          total: old.total + 1,
        };
      }
    );

    setDeletedEvent(null);
  }, [caseId, deletedEvent, queryClient]);

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
        <div className="flex items-center gap-2">
          <Link to={`/cases/${caseId}/import`}>
            <Button size="sm" variant="outline">
              <Upload className="size-4 mr-1" />
              Import
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={handleAddEvent}
            disabled={createEvent.isPending}
          >
            <Plus className="size-4 mr-1" />
            {createEvent.isPending ? "Adding..." : "Add Event"}
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {events.length === 0 && !deletedEvent && (
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
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground" colSpan={2}>
                  Date / Time
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
              {events.map((event, index) => (
                <TimelineRow
                  key={event.id}
                  event={event}
                  onFieldUpdate={handleFieldUpdate}
                  onDelete={handleDelete}
                  onCreateNew={handleAddEvent}
                  isUpdating={updateEvent.isPending}
                  isDeleting={deleteEvent.isPending}
                  isLastRow={index === events.length - 1}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Undo banner */}
      {deletedEvent && (
        <div className="flex items-center justify-between rounded-md border bg-muted px-4 py-2">
          <span className="text-sm text-muted-foreground">
            Event deleted.
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary underline-offset-4 hover:underline"
            onClick={handleUndo}
          >
            <Undo2 className="size-3.5 mr-1" />
            Undo
          </Button>
        </div>
      )}

      {/* Keyboard navigation hint */}
      {events.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Tab to navigate between fields. Enter on the last field to add a new event.
        </p>
      )}
    </div>
  );
}
