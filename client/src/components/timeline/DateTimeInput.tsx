import { cn } from "@/lib/utils";

interface DateTimeInputProps {
  date: string;
  time: string | null;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string | null) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
}

export default function DateTimeInput({
  date,
  time,
  onDateChange,
  onTimeChange,
  onKeyDown,
  className,
}: DateTimeInputProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <input
        type="date"
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="h-7 rounded border border-input bg-background px-2 text-sm outline-none ring-ring focus:ring-1 w-36"
      />
      <input
        type="time"
        value={time ?? ""}
        onChange={(e) =>
          onTimeChange(e.target.value === "" ? null : e.target.value)
        }
        onKeyDown={onKeyDown}
        className="h-7 rounded border border-input bg-background px-2 text-sm outline-none ring-ring focus:ring-1 w-24"
      />
    </div>
  );
}
