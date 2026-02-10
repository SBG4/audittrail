import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuditTypes } from "@/hooks/useAuditTypes";
import FieldMappingEditor from "@/components/jira/FieldMappingEditor";

export default function FieldMappingsPage() {
  const { data: auditTypes, isLoading: isLoadingTypes } = useAuditTypes();
  const [selectedAuditTypeId, setSelectedAuditTypeId] = useState("");

  const selectedAuditType = auditTypes?.find(
    (t) => t.id === selectedAuditTypeId
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to cases
        </Link>
        <h1 className="text-2xl font-bold">Jira Field Mappings</h1>
        <p className="text-sm text-muted-foreground">
          Configure how Jira issue fields map to case metadata for each audit
          type. When importing from Jira, scraped field values will be
          automatically mapped to the corresponding case metadata fields.
        </p>
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <Label htmlFor="audit-type-select">Audit Type</Label>
        <Select
          value={selectedAuditTypeId}
          onValueChange={setSelectedAuditTypeId}
          disabled={isLoadingTypes}
        >
          <SelectTrigger id="audit-type-select" className="w-full">
            <SelectValue
              placeholder={
                isLoadingTypes
                  ? "Loading audit types..."
                  : "Select an audit type"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {auditTypes?.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedAuditType ? (
        <FieldMappingEditor
          auditTypeId={selectedAuditType.id}
          schema={selectedAuditType.schema}
        />
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Select an audit type above to configure its Jira field mappings.
        </div>
      )}
    </div>
  );
}
