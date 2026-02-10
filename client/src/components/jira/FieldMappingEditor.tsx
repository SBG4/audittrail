import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useJiraFieldMappings, useUpdateJiraFieldMappings } from "@/hooks/useJira";
import type { JiraFieldMappingCreate } from "@/types/jira";
import type { JsonSchema } from "@/types/case";

interface FieldMappingEditorProps {
  auditTypeId: string;
  schema: JsonSchema;
}

export default function FieldMappingEditor({
  auditTypeId,
  schema,
}: FieldMappingEditorProps) {
  const { data: mappings, isLoading } = useJiraFieldMappings(auditTypeId);
  const updateMappings = useUpdateJiraFieldMappings();

  const [localMappings, setLocalMappings] = useState<JiraFieldMappingCreate[]>(
    []
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Initialize local state from fetched data
  useEffect(() => {
    if (mappings) {
      setLocalMappings(
        mappings.map((m) => ({
          jira_field_name: m.jira_field_name,
          case_metadata_key: m.case_metadata_key,
        }))
      );
      setIsDirty(false);
    }
  }, [mappings]);

  const metadataKeys = Object.entries(schema.properties).map(
    ([key, prop]) => ({
      key,
      label: prop.title || key,
    })
  );

  function handleAddRow() {
    setLocalMappings((prev) => [
      ...prev,
      { jira_field_name: "", case_metadata_key: "" },
    ]);
    setIsDirty(true);
  }

  function handleRemoveRow(index: number) {
    setLocalMappings((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  }

  function handleFieldChange(
    index: number,
    field: keyof JiraFieldMappingCreate,
    value: string
  ) {
    setLocalMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
    setIsDirty(true);
  }

  async function handleSave() {
    // Filter out incomplete rows
    const validMappings = localMappings.filter(
      (m) => m.jira_field_name.trim() && m.case_metadata_key
    );

    try {
      await updateMappings.mutateAsync({
        auditTypeId,
        mappings: validMappings,
      });
      setFeedback("Mappings saved successfully");
      setIsDirty(false);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback(
        `Error: ${err instanceof Error ? err.message : "Failed to save"}`
      );
      setTimeout(() => setFeedback(null), 5000);
    }
  }

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        Loading mappings...
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Field Mappings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedback && (
          <div
            className={`rounded-md px-4 py-2 text-sm ${
              feedback.startsWith("Error")
                ? "border border-destructive/50 bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {feedback}
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jira Field Name</TableHead>
              <TableHead>Case Metadata Key</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localMappings.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center text-muted-foreground py-8"
                >
                  No mappings configured. Click "Add Mapping" to create one.
                </TableCell>
              </TableRow>
            ) : (
              localMappings.map((mapping, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={mapping.jira_field_name}
                      onChange={(e) =>
                        handleFieldChange(
                          index,
                          "jira_field_name",
                          e.target.value
                        )
                      }
                      placeholder="e.g., Assignee, Summary"
                      className="h-9"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={mapping.case_metadata_key}
                      onValueChange={(value) =>
                        handleFieldChange(index, "case_metadata_key", value)
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {metadataKeys.map((mk) => (
                          <SelectItem key={mk.key} value={mk.key}>
                            {mk.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveRow(index)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={handleAddRow}>
            Add Mapping
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || updateMappings.isPending}
          >
            {updateMappings.isPending ? "Saving..." : "Save Mappings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
