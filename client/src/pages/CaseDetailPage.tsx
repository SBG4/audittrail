import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft, ClipboardCheck, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCase, useUpdateCase, useDeleteCase } from "@/hooks/useCases";
import { getCaseCompleteness, getCompletenessScore } from "@/lib/completeness";
import LifecycleControl from "@/components/cases/LifecycleControl";
import AssigneeSelect from "@/components/cases/AssigneeSelect";
import CaseMetadata from "@/components/cases/CaseMetadata";
import TimelineView from "@/components/timeline/TimelineView";
import ReportDownloadButton from "@/components/reports/ReportDownloadButton";
import ReportDialog from "@/components/reports/ReportDialog";

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: case_, isLoading, error } = useCase(id ?? "");
  const updateCase = useUpdateCase();
  const deleteCase = useDeleteCase();

  // Inline editing state
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  function showFeedback(message: string) {
    setFeedback(message);
    setTimeout(() => setFeedback(null), 3000);
  }

  function handleStartEditTitle() {
    if (!case_) return;
    setTitleValue(case_.title);
    setEditingTitle(true);
  }

  function handleSaveTitle() {
    if (!case_ || !id) return;
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== case_.title) {
      updateCase.mutate(
        { id, title: trimmed },
        {
          onSuccess: () => showFeedback("Title updated"),
          onError: (err) => showFeedback(`Error: ${err.message}`),
        }
      );
    }
    setEditingTitle(false);
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleSaveTitle();
    } else if (e.key === "Escape") {
      setEditingTitle(false);
    }
  }

  function handleStartEditDescription() {
    if (!case_) return;
    setDescriptionValue(case_.description ?? "");
    setEditingDescription(true);
  }

  function handleSaveDescription() {
    if (!case_ || !id) return;
    updateCase.mutate(
      { id, description: descriptionValue },
      {
        onSuccess: () => showFeedback("Description updated"),
        onError: (err) => showFeedback(`Error: ${err.message}`),
      }
    );
    setEditingDescription(false);
  }

  function handleStatusChange(newStatus: string) {
    if (!id) return;
    updateCase.mutate(
      { id, status: newStatus },
      {
        onSuccess: () => showFeedback("Status updated"),
        onError: (err) => showFeedback(`Error: ${err.message}`),
      }
    );
  }

  function handleAssign(userId: string | null) {
    if (!id) return;
    updateCase.mutate(
      { id, assigned_to_id: userId },
      {
        onSuccess: () => showFeedback("Assignment updated"),
        onError: (err) => showFeedback(`Error: ${err.message}`),
      }
    );
  }

  function handleMetadataSave(metadata: Record<string, unknown>) {
    if (!id) return;
    updateCase.mutate(
      { id, metadata },
      {
        onSuccess: () => showFeedback("Metadata updated"),
        onError: (err) => showFeedback(`Error: ${err.message}`),
      }
    );
  }

  function handleDelete() {
    if (!id) return;
    deleteCase.mutate(id, {
      onSuccess: () => navigate("/"),
      onError: (err) => showFeedback(`Error: ${err.message}`),
    });
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading case...</div>
      </div>
    );
  }

  // Error state
  if (error || !case_) {
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
            {error?.message ?? "Case not found"}
          </p>
        </div>
      </div>
    );
  }

  const isUpdating = updateCase.isPending;

  return (
    <div className="space-y-6">
      {/* Feedback message */}
      {feedback && (
        <div className="rounded-md bg-muted px-4 py-2 text-sm text-muted-foreground">
          {feedback}
        </div>
      )}

      {/* Header */}
      <div className="space-y-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to cases
        </Link>

        <div className="flex items-start gap-3">
          {editingTitle ? (
            <Input
              autoFocus
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={handleTitleKeyDown}
              className="text-2xl font-bold h-auto py-1"
            />
          ) : (
            <h1
              className="text-2xl font-bold text-foreground cursor-pointer hover:text-foreground/80"
              onClick={handleStartEditTitle}
              title="Click to edit title"
            >
              {case_.title}
            </h1>
          )}
          <Badge variant="outline" className="font-mono shrink-0 mt-1">
            #{case_.case_number}
          </Badge>
        </div>

        {/* Status and assignment row */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <LifecycleControl
            currentStatus={case_.status}
            onStatusChange={handleStatusChange}
            disabled={isUpdating}
          />
          <div className="flex items-center gap-3">
            <AssigneeSelect
              currentAssigneeId={case_.assigned_to_id}
              onAssign={handleAssign}
              disabled={isUpdating}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReportDialogOpen(true)}
            >
              <FileText className="size-4 mr-1" />
              Generate Report
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to={`/cases/${id}/review`}>
                <ClipboardCheck className="size-4 mr-1" />
                Review ({getCompletenessScore(getCaseCompleteness(case_)).percentage}%)
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Description
            </h3>
            {editingDescription ? (
              <div className="space-y-2">
                <Textarea
                  autoFocus
                  value={descriptionValue}
                  onChange={(e) => setDescriptionValue(e.target.value)}
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveDescription}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingDescription(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p
                className="text-sm text-foreground cursor-pointer hover:bg-muted/50 rounded p-2 -m-2"
                onClick={handleStartEditDescription}
                title="Click to edit description"
              >
                {case_.description || (
                  <span className="text-muted-foreground italic">
                    No description. Click to add one.
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Metadata */}
          <CaseMetadata case_={case_} onSave={handleMetadataSave} />

          {/* Case info (read-only) */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Case Info
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Created by
                </p>
                <p className="text-foreground">
                  {case_.created_by?.full_name ?? "Unknown"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Created at
                </p>
                <p className="text-foreground">
                  {new Date(case_.created_at).toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Updated at
                </p>
                <p className="text-foreground">
                  {new Date(case_.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Delete case */}
          <div className="border-t pt-6">
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">Delete Case</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Case</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this case? This action
                    cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteCase.isPending}
                  >
                    {deleteCase.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="pt-4">
          <TimelineView caseId={id!} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6 pt-4">
          {/* PDF / DOCX Reports */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              PDF & DOCX Reports
            </h3>
            <p className="text-sm text-muted-foreground">
              Generate professional reports in PDF or Word format. Choose between
              a quick timeline summary or a detailed narrative with findings,
              conclusions, and recommendations.
            </p>
            <Button
              variant="outline"
              onClick={() => setReportDialogOpen(true)}
              className="gap-2"
            >
              <FileText className="size-4" />
              Generate PDF / DOCX Report
            </Button>
          </div>

          {/* HTML Report */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-sm font-medium text-muted-foreground">
              Interactive HTML Report
            </h3>
            <p className="text-sm text-muted-foreground">
              Download a self-contained HTML report with interactive charts.
              The report works offline -- just open the .html file in any browser.
            </p>
            <ReportDownloadButton caseId={id!} />
            <p className="text-xs text-muted-foreground mt-4">
              The HTML report includes dashboard statistics, an interactive event
              timeline, and detailed event data. All charts support hover, zoom,
              and pan.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Report generation dialog */}
      <ReportDialog
        caseId={id!}
        caseNumber={case_.case_number}
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
      />
    </div>
  );
}
