import {
  Usb,
  Mail,
  Network,
  Printer,
  CloudUpload,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BATCH_TEMPLATES, type BatchTemplate } from "@/data/batch-templates";

const ICON_MAP: Record<string, LucideIcon> = {
  usb: Usb,
  mail: Mail,
  network: Network,
  printer: Printer,
  "cloud-upload": CloudUpload,
  plus: Plus,
};

interface BatchTemplatesProps {
  onSelect: (template: BatchTemplate) => void;
}

export function BatchTemplates({ onSelect }: BatchTemplatesProps) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        Quick add:
      </span>
      <div className="flex flex-wrap gap-2">
        {BATCH_TEMPLATES.map((template) => {
          const Icon = ICON_MAP[template.icon] ?? Plus;
          return (
            <Button
              key={template.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelect(template)}
              title={template.description}
            >
              <Icon className="size-3.5" />
              {template.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
