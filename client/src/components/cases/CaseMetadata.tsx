import { useState } from "react";
import { Button } from "@/components/ui/button";
import SchemaForm from "@/components/cases/SchemaForm";
import JiraImportPanel from "@/components/jira/JiraImportPanel";
import type { Case } from "@/types/case";

interface CaseMetadataProps {
  case_: Case;
  onSave: (metadata: Record<string, unknown>) => void;
}

export default function CaseMetadata({ case_, onSave }: CaseMetadataProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});

  const schema = case_.audit_type?.schema;

  if (!schema) {
    return (
      <div className="text-sm text-muted-foreground">
        No schema available for this audit type.
      </div>
    );
  }

  function handleEdit() {
    setEditValues({ ...case_.metadata });
    setIsEditing(true);
  }

  function handleCancel() {
    setEditValues({});
    setIsEditing(false);
  }

  function handleSave() {
    onSave(editValues);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="space-y-4">
        <SchemaForm
          schema={schema}
          values={editValues}
          onChange={setEditValues}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // VIEW mode: display metadata as labeled key-value grid
  const properties = schema.properties ?? {};
  const entries = Object.entries(properties);

  if (entries.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No metadata fields defined for this audit type.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Metadata</h3>
        <Button size="sm" variant="outline" onClick={handleEdit}>
          Edit
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {entries.map(([key, property]) => {
          const value = case_.metadata[key];
          return (
            <div key={key} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {property.title || key}
              </p>
              {value != null && value !== "" ? (
                <p className="text-sm text-foreground">{String(value)}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not set</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Jira Import */}
      <JiraImportPanel
        auditTypeId={case_.audit_type_id}
        onApply={(scraped) => onSave({ ...case_.metadata, ...scraped })}
        currentMetadata={case_.metadata}
        schema={schema}
      />
    </div>
  );
}
