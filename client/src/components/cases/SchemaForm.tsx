import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { JsonSchema } from "@/types/case";

interface SchemaFormProps {
  schema: JsonSchema;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  disabled?: boolean;
}

export default function SchemaForm({
  schema,
  values,
  onChange,
  disabled = false,
}: SchemaFormProps) {
  const requiredFields = new Set(schema.required ?? []);

  function handleFieldChange(key: string, value: unknown) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Object.entries(schema.properties).map(([key, property]) => {
        const isRequired = requiredFields.has(key);
        const label = property.title || key;

        return (
          <div key={key} className="flex flex-col gap-2">
            <Label htmlFor={`schema-${key}`}>
              {label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {renderField(key, property, isRequired)}
          </div>
        );
      })}
    </div>
  );

  function renderField(
    key: string,
    property: { type: string; format?: string; enum?: string[]; title: string },
    isRequired: boolean,
  ) {
    const currentValue = values[key] ?? "";

    // String with enum -> Select
    if (property.type === "string" && property.enum) {
      return (
        <Select
          value={String(currentValue)}
          onValueChange={(val: string) => handleFieldChange(key, val)}
          disabled={disabled}
        >
          <SelectTrigger id={`schema-${key}`} className="w-full">
            <SelectValue placeholder={`Select ${property.title || key}`} />
          </SelectTrigger>
          <SelectContent>
            {property.enum.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Number or integer -> Input type="number"
    if (property.type === "number" || property.type === "integer") {
      return (
        <Input
          id={`schema-${key}`}
          type="number"
          value={String(currentValue)}
          onChange={(e) => {
            const val = e.target.value;
            handleFieldChange(key, val === "" ? "" : Number(val));
          }}
          required={isRequired}
          disabled={disabled}
        />
      );
    }

    // String with format "email" -> Input type="email"
    if (property.type === "string" && property.format === "email") {
      return (
        <Input
          id={`schema-${key}`}
          type="email"
          value={String(currentValue)}
          onChange={(e) => handleFieldChange(key, e.target.value)}
          required={isRequired}
          disabled={disabled}
        />
      );
    }

    // Default: string -> Input type="text"
    return (
      <Input
        id={`schema-${key}`}
        type="text"
        value={String(currentValue)}
        onChange={(e) => handleFieldChange(key, e.target.value)}
        required={isRequired}
        disabled={disabled}
      />
    );
  }
}
