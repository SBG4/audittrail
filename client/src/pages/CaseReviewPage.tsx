import { useState } from "react";
import { useParams, Link } from "react-router";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCase } from "@/hooks/useCases";
import { useEvents } from "@/hooks/useEvents";
import {
  getCaseCompleteness,
  getEventCompleteness,
  getFileBatchCompleteness,
  getCompletenessScore,
  type FieldStatus,
} from "@/lib/completeness";

function FieldRow({ field }: { field: FieldStatus }) {
  return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      {field.filled ? (
        <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
      ) : (
        <AlertTriangle className="size-4 shrink-0 text-amber-500" />
      )}
      <span className={field.filled ? "text-foreground" : "text-amber-600 dark:text-amber-400"}>
        {field.label}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </span>
      {!field.filled && (
        <span className="ml-auto text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700 rounded px-1.5 py-0.5">
          Missing
        </span>
      )}
    </div>
  );
}

function ProgressBar({ percentage }: { percentage: number }) {
  const color =
    percentage >= 80
      ? "bg-emerald-500"
      : percentage >= 50
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function CollapsibleSection({
  title,
  subtitle,
  defaultOpen,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
          <span className="font-medium text-sm">{title}</span>
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      </button>
      {open && <div className="border-t px-4 py-3">{children}</div>}
    </div>
  );
}

export default function CaseReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { data: case_, isLoading: caseLoading, error: caseError } = useCase(id ?? "");
  const { data: eventsData, isLoading: eventsLoading } = useEvents(id ?? "");

  if (caseLoading || eventsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading review...</div>
      </div>
    );
  }

  if (caseError || !case_) {
    return (
      <div className="space-y-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to cases
        </Link>
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center">
          <p className="text-destructive">
            {caseError?.message ?? "Case not found"}
          </p>
        </div>
      </div>
    );
  }

  const events = eventsData?.items ?? [];

  // Calculate completeness data
  const caseFields = getCaseCompleteness(case_);
  const caseScore = getCompletenessScore(caseFields);

  // Calculate event-level completeness
  const eventResults = events.map((event, index) => {
    const fields = getEventCompleteness(event);
    const score = getCompletenessScore(fields);

    // Check file batch completeness
    const batchFields: FieldStatus[] = [];
    for (const batch of event.file_batches) {
      batchFields.push(...getFileBatchCompleteness(batch));
    }
    const batchScore = batchFields.length > 0
      ? getCompletenessScore(batchFields)
      : null;

    return {
      event,
      index,
      fields,
      score,
      batchFields,
      batchScore,
      hasBatches: event.file_batches.length > 0,
    };
  });

  // Overall aggregation
  const allFields: FieldStatus[] = [
    ...caseFields,
    ...eventResults.flatMap((r) => r.fields),
    ...eventResults.flatMap((r) => r.batchFields),
  ];
  const overallScore = getCompletenessScore(allFields);

  const hasEvents = events.length > 0;
  const eventsWithMissing = eventResults.filter((r) => r.score.percentage < 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Link
          to={`/cases/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to case
        </Link>

        <div className="flex items-start gap-3">
          <ClipboardCheck className="size-6 text-muted-foreground mt-0.5" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Case Review
            </h1>
            <p className="text-sm text-muted-foreground">
              {case_.title}
              <Badge variant="outline" className="ml-2 font-mono">
                #{case_.case_number}
              </Badge>
            </p>
          </div>
        </div>
      </div>

      {/* Overall Score */}
      <div className="rounded-lg border p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Overall Completeness</h2>
          <span className="text-2xl font-bold">
            {overallScore.percentage}%
          </span>
        </div>
        <ProgressBar percentage={overallScore.percentage} />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {overallScore.filled} of {overallScore.total} fields filled
          </span>
          {overallScore.allRequiredFilled ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              All required fields complete
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-4" />
              Some required fields missing
            </span>
          )}
        </div>
      </div>

      {/* Case Details Section */}
      <CollapsibleSection
        title="Case Details"
        subtitle={`${caseScore.filled}/${caseScore.total} fields`}
        defaultOpen={caseScore.percentage < 100}
      >
        <div className="divide-y">
          {caseFields.map((field) => (
            <FieldRow key={field.field} field={field} />
          ))}
        </div>
      </CollapsibleSection>

      {/* Timeline Events Section */}
      <CollapsibleSection
        title={`Timeline Events (${events.length} event${events.length !== 1 ? "s" : ""})`}
        subtitle={
          hasEvents
            ? `${eventsWithMissing.length} with missing fields`
            : undefined
        }
        defaultOpen={!hasEvents || eventsWithMissing.length > 0}
      >
        {!hasEvents ? (
          <div className="flex items-center gap-2 py-2 text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-4" />
            No events in timeline. Add events before generating a report.
          </div>
        ) : (
          <div className="space-y-3">
            {eventResults.map((result) => {
              const hasMissing = result.score.percentage < 100;
              return (
                <CollapsibleSection
                  key={result.event.id}
                  title={`Event ${result.index + 1}: ${result.event.event_type} - ${result.event.event_date}`}
                  subtitle={`${result.score.filled}/${result.score.total} fields`}
                  defaultOpen={hasMissing}
                >
                  <div className="divide-y">
                    {result.fields.map((field) => (
                      <FieldRow key={field.field} field={field} />
                    ))}
                  </div>

                  {/* File Batches for this event */}
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      File Batches
                    </p>
                    {!result.hasBatches ? (
                      <div className="flex items-center gap-2 py-1 text-sm text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="size-3.5" />
                        No file batches attached
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {result.event.file_batches.map((batch) => {
                          const batchFields = getFileBatchCompleteness(batch);
                          const batchMissing = batchFields.filter((f) => !f.filled);
                          return (
                            <div key={batch.id} className="flex items-center gap-2 text-sm py-1">
                              {batchMissing.length === 0 ? (
                                <CheckCircle2 className="size-3.5 text-emerald-500" />
                              ) : (
                                <AlertTriangle className="size-3.5 text-amber-500" />
                              )}
                              <span>{batch.label}</span>
                              <span className="text-xs text-muted-foreground">
                                ({batch.file_count} files)
                              </span>
                              {batchMissing.length > 0 && (
                                <span className="text-xs text-amber-600 dark:text-amber-400">
                                  - missing: {batchMissing.map((f) => f.label).join(", ")}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* Summary Bar */}
      <div className="rounded-lg border p-4 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {overallScore.allRequiredFilled ? (
              <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-5" />
                Ready for report generation
              </span>
            ) : (
              <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-5" />
                Review needed before report generation
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {overallScore.total - overallScore.filled} field{overallScore.total - overallScore.filled !== 1 ? "s" : ""} missing
            {" "}&middot;{" "}
            {overallScore.filled} field{overallScore.filled !== 1 ? "s" : ""} filled
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to={`/cases/${id}`}>Back to Case</Link>
        </Button>
      </div>
    </div>
  );
}
