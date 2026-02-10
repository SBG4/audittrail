import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface InlineFieldProps {
  value: string | number | null;
  onSave: (value: string) => void;
  type?: "text" | "number" | "date" | "time";
  placeholder?: string;
  className?: string;
}

export default function InlineField({
  value,
  onSave,
  type = "text",
  placeholder = "--",
  className,
}: InlineFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (type === "text") {
        inputRef.current.select();
      }
    }
  }, [editing, type]);

  function startEditing() {
    setDraft(String(value ?? ""));
    setEditing(true);
  }

  function save() {
    const trimmed = draft.trim();
    if (trimmed !== String(value ?? "")) {
      onSave(trimmed);
    }
    setEditing(false);
  }

  function cancel() {
    setDraft(String(value ?? ""));
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
    // Tab: browser default behavior saves on blur and moves focus
  }

  if (!editing) {
    const displayValue = value != null && value !== "" ? String(value) : null;

    return (
      <span
        className={cn(
          "inline-block cursor-pointer rounded px-2 py-1 hover:bg-muted/50 min-w-[2rem]",
          className
        )}
        onClick={startEditing}
        onFocus={startEditing}
        tabIndex={0}
        role="button"
        title="Click to edit"
      >
        {displayValue ?? (
          <span className="text-muted-foreground italic text-xs">
            {placeholder}
          </span>
        )}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={handleKeyDown}
      className={cn(
        "h-7 w-full rounded border border-input bg-background px-2 text-sm outline-none ring-ring focus:ring-1",
        type === "number" && "w-16 text-center",
        type === "date" && "w-36",
        type === "time" && "w-24",
        className
      )}
      min={type === "number" ? 0 : undefined}
    />
  );
}
