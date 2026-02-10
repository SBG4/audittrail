import { AlertTriangle, Zap, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_CONFIG = {
  finding: {
    icon: AlertTriangle,
    bg: "bg-amber-100",
    text: "text-amber-600",
    label: "Finding",
  },
  action: {
    icon: Zap,
    bg: "bg-blue-100",
    text: "text-blue-600",
    label: "Action",
  },
  note: {
    icon: StickyNote,
    bg: "bg-gray-100",
    text: "text-gray-600",
    label: "Note",
  },
} as const;

interface EventTypeIconProps {
  type: "finding" | "action" | "note";
  className?: string;
}

export default function EventTypeIcon({ type, className }: EventTypeIconProps) {
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.note;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full p-1.5",
        config.bg,
        config.text,
        className
      )}
      title={config.label}
    >
      <Icon className="size-3.5" />
    </div>
  );
}
