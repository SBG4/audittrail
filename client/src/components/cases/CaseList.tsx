import { Link } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCaseCompleteness, getCompletenessScore } from "@/lib/completeness";
import type { Case } from "@/types/case";

interface CaseListProps {
  cases: Case[];
  total: number;
  offset: number;
  limit: number;
  onPageChange: (offset: number) => void;
  onCaseClick: (id: string) => void;
  isLoading: boolean;
}

function statusBadge(status: Case["status"]) {
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

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function CaseList({
  cases,
  total,
  offset,
  limit,
  onPageChange,
  onCaseClick,
  isLoading,
}: CaseListProps) {
  const start = offset + 1;
  const end = Math.min(offset + limit, total);
  const hasPrevious = offset > 0;
  const hasNext = offset + limit < total;

  if (!isLoading && cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <p className="text-muted-foreground mb-2">No cases found</p>
        <Link
          to="/cases/new"
          className="text-primary text-sm underline underline-offset-4 hover:text-primary/80"
        >
          Create a new case
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={isLoading ? "opacity-60 transition-opacity" : ""}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70px]">#</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="w-[80px]">Complete</TableHead>
              <TableHead className="w-[100px]">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer"
                onClick={() => onCaseClick(c.id)}
              >
                <TableCell className="font-mono text-muted-foreground">
                  {c.case_number}
                </TableCell>
                <TableCell className="font-medium">
                  {truncate(c.title, 50)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.audit_type?.name ?? "Unknown"}
                </TableCell>
                <TableCell>{statusBadge(c.status)}</TableCell>
                <TableCell>
                  {c.assigned_to ? (
                    c.assigned_to.full_name
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  {(() => {
                    const score = getCompletenessScore(getCaseCompleteness(c));
                    return score.percentage < 100 ? (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700"
                      >
                        {score.percentage}%
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700"
                      >
                        100%
                      </Badge>
                    );
                  })()}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatRelativeDate(c.updated_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Showing {start}-{end} of {total} cases
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrevious}
              onClick={() => onPageChange(Math.max(0, offset - limit))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() => onPageChange(offset + limit)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
