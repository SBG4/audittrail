import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import EventTypeIcon from "./EventTypeIcon";
import type { TimelineEvent } from "@/types/event";

interface TimelineRowProps {
  event: TimelineEvent;
  onDelete: (eventId: string) => void;
  isDeleting?: boolean;
}

export default function TimelineRow({
  event,
  onDelete,
  isDeleting,
}: TimelineRowProps) {
  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/30">
      <td className="px-3 py-2">
        <EventTypeIcon type={event.event_type} />
      </td>
      <td className="px-3 py-2 text-sm whitespace-nowrap">
        {event.event_date}
      </td>
      <td className="px-3 py-2 text-sm whitespace-nowrap text-muted-foreground">
        {event.event_time ?? "--:--"}
      </td>
      <td className="px-3 py-2 text-sm">
        {event.file_name ?? (
          <span className="text-muted-foreground italic">--</span>
        )}
      </td>
      <td className="px-3 py-2 text-sm text-center">
        {event.file_count ?? (
          <span className="text-muted-foreground">--</span>
        )}
      </td>
      <td className="px-3 py-2 text-sm max-w-[200px] truncate">
        {event.file_description ?? (
          <span className="text-muted-foreground italic">--</span>
        )}
      </td>
      <td className="px-3 py-2 text-sm">
        {event.file_type ?? (
          <span className="text-muted-foreground italic">--</span>
        )}
      </td>
      <td className="px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="size-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(event.id)}
          disabled={isDeleting}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </td>
    </tr>
  );
}
