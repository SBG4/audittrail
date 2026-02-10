import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import EventTypeIcon from "./EventTypeIcon";
import InlineField from "./InlineField";
import DateTimeInput from "./DateTimeInput";
import type { TimelineEvent } from "@/types/event";

interface TimelineRowProps {
  event: TimelineEvent;
  onFieldUpdate: (
    eventId: string,
    field: string,
    value: unknown
  ) => void;
  onDelete: (eventId: string) => void;
  onCreateNew?: () => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
  isLastRow?: boolean;
}

const EVENT_TYPES = ["finding", "action", "note"] as const;

export default function TimelineRow({
  event,
  onFieldUpdate,
  onDelete,
  onCreateNew,
  isUpdating,
  isDeleting,
  isLastRow,
}: TimelineRowProps) {
  const [typeSelectOpen, setTypeSelectOpen] = useState(false);

  function handleFieldSave(field: string, value: string) {
    let parsed: unknown = value;

    if (field === "file_count") {
      parsed = value === "" ? null : parseInt(value, 10);
      if (typeof parsed === "number" && isNaN(parsed)) parsed = null;
    } else if (field === "event_time") {
      parsed = value === "" ? null : value;
    } else if (field === "file_name" || field === "file_description" || field === "file_type") {
      parsed = value === "" ? null : value;
    }

    onFieldUpdate(event.id, field, parsed);
  }

  function handleLastFieldKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && isLastRow && onCreateNew) {
      e.preventDefault();
      onCreateNew();
    }
  }

  return (
    <tr
      className={`border-b last:border-b-0 hover:bg-muted/30 ${
        isUpdating ? "opacity-70" : ""
      }`}
    >
      {/* Event type - click to select */}
      <td className="px-3 py-2">
        {typeSelectOpen ? (
          <select
            autoFocus
            value={event.event_type}
            onChange={(e) => {
              onFieldUpdate(event.id, "event_type", e.target.value);
              setTypeSelectOpen(false);
            }}
            onBlur={() => setTypeSelectOpen(false)}
            className="h-7 rounded border border-input bg-background px-1 text-xs outline-none ring-ring focus:ring-1"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        ) : (
          <button
            onClick={() => setTypeSelectOpen(true)}
            tabIndex={0}
            className="cursor-pointer"
            title="Click to change type"
          >
            <EventTypeIcon type={event.event_type} />
          </button>
        )}
      </td>

      {/* Date and Time combined */}
      <td className="px-3 py-2" colSpan={2}>
        <DateTimeInput
          date={event.event_date}
          time={event.event_time}
          onDateChange={(v) => onFieldUpdate(event.id, "event_date", v)}
          onTimeChange={(v) => onFieldUpdate(event.id, "event_time", v)}
        />
      </td>

      {/* File Name */}
      <td className="px-3 py-2">
        <InlineField
          value={event.file_name}
          onSave={(v) => handleFieldSave("file_name", v)}
          placeholder="File name..."
        />
      </td>

      {/* File Count */}
      <td className="px-3 py-2">
        <InlineField
          value={event.file_count}
          onSave={(v) => handleFieldSave("file_count", v)}
          type="number"
          placeholder="0"
        />
      </td>

      {/* File Description */}
      <td className="px-3 py-2">
        <InlineField
          value={event.file_description}
          onSave={(v) => handleFieldSave("file_description", v)}
          placeholder="Description..."
        />
      </td>

      {/* File Type */}
      <td className="px-3 py-2">
        <InlineField
          value={event.file_type}
          onSave={(v) => handleFieldSave("file_type", v)}
          placeholder="File type..."
          onKeyDown={isLastRow ? handleLastFieldKeyDown : undefined}
        />
      </td>

      {/* Delete */}
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
