import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import CaseFilters from "@/components/cases/CaseFilters";
import CaseList from "@/components/cases/CaseList";
import { useCases } from "@/hooks/useCases";
import type { CaseFilters as CaseFiltersType } from "@/types/case";

const DEFAULT_FILTERS: CaseFiltersType = {
  status: "",
  audit_type_id: "",
  search: "",
  offset: 0,
  limit: 20,
};

export default function CaseListPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<CaseFiltersType>(DEFAULT_FILTERS);
  const { data, isLoading, error } = useCases(filters);

  function handleFiltersChange(updated: CaseFiltersType) {
    setFilters(updated);
  }

  function handlePageChange(offset: number) {
    setFilters((prev) => ({ ...prev, offset }));
  }

  function handleCaseClick(id: string) {
    navigate(`/cases/${id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Cases</h1>
        <Button asChild>
          <Link to="/cases/new">New Case</Link>
        </Button>
      </div>

      <CaseFilters filters={filters} onFiltersChange={handleFiltersChange} />

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <CaseList
        cases={data?.items ?? []}
        total={data?.total ?? 0}
        offset={data?.offset ?? 0}
        limit={data?.limit ?? 20}
        onPageChange={handlePageChange}
        onCaseClick={handleCaseClick}
        isLoading={isLoading}
      />
    </div>
  );
}
