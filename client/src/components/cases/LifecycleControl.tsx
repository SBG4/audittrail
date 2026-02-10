import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LifecycleControlProps {
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
  disabled?: boolean;
}

function statusBadge(status: string) {
  switch (status) {
    case "open":
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-300">
          Open
        </Badge>
      );
    case "active":
      return <Badge variant="default">Active</Badge>;
    case "closed":
      return <Badge variant="secondary">Closed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

const TRANSITIONS: Record<string, { label: string; target: string; variant: "default" | "destructive" | "outline" }[]> = {
  open: [
    { label: "Start", target: "active", variant: "default" },
    { label: "Close", target: "closed", variant: "destructive" },
  ],
  active: [
    { label: "Close", target: "closed", variant: "destructive" },
  ],
  closed: [
    { label: "Reopen", target: "open", variant: "outline" },
  ],
};

export default function LifecycleControl({
  currentStatus,
  onStatusChange,
  disabled = false,
}: LifecycleControlProps) {
  const transitions = TRANSITIONS[currentStatus] ?? [];

  return (
    <div className="flex items-center gap-3">
      {statusBadge(currentStatus)}
      {transitions.map((t) => (
        <Button
          key={t.target}
          variant={t.variant}
          size="sm"
          disabled={disabled}
          onClick={() => onStatusChange(t.target)}
        >
          {t.label}
        </Button>
      ))}
    </div>
  );
}
