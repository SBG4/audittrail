import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useJiraScrapeAndMap } from "@/hooks/useJira";
import type { JiraScrapeResponse } from "@/types/jira";
import type { JsonSchema } from "@/types/case";

interface JiraImportPanelProps {
  auditTypeId: string;
  onApply: (metadata: Record<string, string>) => void;
  currentMetadata?: Record<string, unknown>;
  schema?: JsonSchema;
}

export default function JiraImportPanel({
  auditTypeId,
  onApply,
  currentMetadata = {},
  schema,
}: JiraImportPanelProps) {
  const [jiraUrl, setJiraUrl] = useState("");
  const [scrapeResult, setScrapeResult] = useState<JiraScrapeResponse | null>(
    null
  );
  const scrapeAndMap = useJiraScrapeAndMap();

  function getFieldLabel(key: string): string {
    if (schema?.properties[key]?.title) {
      return schema.properties[key].title;
    }
    return key;
  }

  async function handleFetch() {
    if (!jiraUrl.trim()) return;

    try {
      const result = await scrapeAndMap.mutateAsync({
        auditTypeId,
        url: jiraUrl.trim(),
      });
      setScrapeResult(result);
    } catch {
      // Error is handled by mutation state
    }
  }

  function handleApply() {
    if (!scrapeResult) return;
    onApply(scrapeResult.fields);
    setScrapeResult(null);
    setJiraUrl("");
  }

  function handleDismiss() {
    setScrapeResult(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleFetch();
    }
  }

  // Determine unmapped fields (in raw_fields but not in mapped fields)
  const unmappedFields = scrapeResult
    ? Object.entries(scrapeResult.raw_fields).filter(
        ([key]) =>
          !Object.values(scrapeResult.fields).includes(
            scrapeResult.raw_fields[key]
          ) ||
          !Object.keys(scrapeResult.fields).some(
            (mappedKey) =>
              scrapeResult.raw_fields[key] === scrapeResult.fields[mappedKey]
          )
      )
    : [];

  // Better unmapped detection: fields in raw_fields whose values don't appear as mapped values
  const mappedRawKeys = new Set<string>();
  if (scrapeResult) {
    // Find which raw field keys were used in mapping
    for (const [rawKey, rawValue] of Object.entries(scrapeResult.raw_fields)) {
      for (const mappedValue of Object.values(scrapeResult.fields)) {
        if (rawValue === mappedValue) {
          mappedRawKeys.add(rawKey);
        }
      }
    }
  }

  const actualUnmappedFields = scrapeResult
    ? Object.entries(scrapeResult.raw_fields).filter(
        ([key]) => !mappedRawKeys.has(key)
      )
    : [];

  return (
    <div className="space-y-4">
      {/* URL input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Import from Jira</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="jira-url" className="text-sm">
              Jira Issue URL
            </Label>
            <div className="flex gap-2">
              <Input
                id="jira-url"
                value={jiraUrl}
                onChange={(e) => setJiraUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://jira.internal/browse/PROJ-123"
                className="flex-1"
                disabled={scrapeAndMap.isPending}
              />
              <Button
                onClick={handleFetch}
                disabled={
                  !jiraUrl.trim() || !auditTypeId || scrapeAndMap.isPending
                }
                size="default"
              >
                {scrapeAndMap.isPending ? "Fetching..." : "Fetch"}
              </Button>
            </div>
          </div>

          {/* Error display */}
          {scrapeAndMap.isError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">
                {scrapeAndMap.error instanceof Error
                  ? scrapeAndMap.error.message
                  : "Failed to fetch Jira issue"}
              </p>
            </div>
          )}

          {/* Scrape returned success=false */}
          {scrapeResult && !scrapeResult.success && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">
                {scrapeResult.error || "Failed to scrape Jira issue"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview/Review panel */}
      {scrapeResult && scrapeResult.success && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Scraped Data Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mapped fields */}
            {Object.keys(scrapeResult.fields).length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(scrapeResult.fields).map(([key, value]) => {
                    const existingValue = currentMetadata[key];
                    const hasExisting =
                      existingValue != null && existingValue !== "";
                    const isChanged =
                      hasExisting && String(existingValue) !== value;
                    const isNew = !hasExisting;

                    return (
                      <TableRow key={key}>
                        <TableCell className="font-medium">
                          {getFieldLabel(key)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {isChanged && (
                              <div className="text-xs text-muted-foreground line-through">
                                {String(existingValue)}
                              </div>
                            )}
                            <div className="text-sm">{value}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isNew && (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200"
                            >
                              New
                            </Badge>
                          )}
                          {isChanged && (
                            <Badge
                              variant="outline"
                              className="bg-yellow-50 text-yellow-700 border-yellow-200"
                            >
                              Changed
                            </Badge>
                          )}
                          {!isNew && !isChanged && (
                            <Badge variant="secondary">Same</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                No mapped fields found. Check your field mapping configuration
                at{" "}
                <a
                  href="/settings/jira-mappings"
                  className="text-primary underline"
                >
                  Settings &gt; Jira Mappings
                </a>
                .
              </div>
            )}

            {/* Unmapped fields (informational) */}
            {actualUnmappedFields.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Unmapped Fields (found in Jira but not configured)
                </h4>
                <div className="rounded-md bg-muted/50 p-3">
                  <div className="grid grid-cols-1 gap-1 md:grid-cols-2 text-xs">
                    {actualUnmappedFields.map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="font-medium text-muted-foreground">
                          {key}:
                        </span>
                        <span className="text-foreground truncate">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={handleApply}
                disabled={Object.keys(scrapeResult.fields).length === 0}
              >
                Apply All
              </Button>
              <Button size="sm" variant="outline" onClick={handleDismiss}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
