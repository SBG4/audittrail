import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SchemaForm from "@/components/cases/SchemaForm";
import JiraImportPanel from "@/components/jira/JiraImportPanel";
import { useAuditTypes } from "@/hooks/useAuditTypes";
import { useCreateCase } from "@/hooks/useCases";

export default function CaseCreatePage() {
  const navigate = useNavigate();
  const { data: auditTypes, isLoading: isLoadingTypes } = useAuditTypes();
  const createCase = useCreateCase();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [auditTypeId, setAuditTypeId] = useState("");
  const [metadata, setMetadata] = useState<Record<string, unknown>>({});

  const selectedAuditType = auditTypes?.find((t) => t.id === auditTypeId);

  function handleAuditTypeChange(value: string) {
    setAuditTypeId(value);
    setMetadata({});
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    await createCase.mutateAsync({
      title,
      audit_type_id: auditTypeId,
      description: description || undefined,
      metadata,
    });

    navigate("/");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create New Case</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Case Details */}
        <Card>
          <CardHeader>
            <CardTitle>Case Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter case title"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter case description (optional)"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Audit Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Audit Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Label htmlFor="audit-type">
                Audit Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={auditTypeId}
                onValueChange={handleAuditTypeChange}
                disabled={isLoadingTypes}
                required
              >
                <SelectTrigger id="audit-type" className="w-full">
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
          </CardContent>
        </Card>

        {/* Metadata Fields */}
        <Card>
          <CardHeader>
            <CardTitle>Metadata Fields</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedAuditType ? (
              <SchemaForm
                schema={selectedAuditType.schema}
                values={metadata}
                onChange={setMetadata}
                disabled={createCase.isPending}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Select an audit type to see metadata fields
              </p>
            )}
          </CardContent>
        </Card>

        {/* Jira Import */}
        {auditTypeId && selectedAuditType && (
          <JiraImportPanel
            auditTypeId={auditTypeId}
            onApply={(scraped) =>
              setMetadata((prev) => ({ ...prev, ...scraped }))
            }
            currentMetadata={metadata}
            schema={selectedAuditType.schema}
          />
        )}

        {/* Error display */}
        {createCase.isError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {createCase.error instanceof Error
                ? createCase.error.message
                : "Failed to create case. Please try again."}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={
              createCase.isPending || !title.trim() || !auditTypeId
            }
          >
            {createCase.isPending ? "Creating..." : "Create Case"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
