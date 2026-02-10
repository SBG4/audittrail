import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuditTypes } from "@/hooks/useAuditTypes";
import type { CaseFilters as CaseFiltersType } from "@/types/case";

interface CaseFiltersProps {
  filters: CaseFiltersType;
  onFiltersChange: (filters: CaseFiltersType) => void;
}

const DEFAULT_FILTERS: CaseFiltersType = {
  status: "",
  audit_type_id: "",
  search: "",
  offset: 0,
  limit: 20,
};

export default function CaseFilters({
  filters,
  onFiltersChange,
}: CaseFiltersProps) {
  const { data: auditTypes } = useAuditTypes();
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external filter changes to search input
  useEffect(() => {
    setSearchInput(filters.search ?? "");
  }, [filters.search]);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFiltersChange({ ...filters, search: value, offset: 0 });
    }, 300);
  }

  function handleStatusChange(value: string) {
    const status = value === "__all__" ? "" : value;
    onFiltersChange({ ...filters, status, offset: 0 });
  }

  function handleAuditTypeChange(value: string) {
    const audit_type_id = value === "__all__" ? "" : value;
    onFiltersChange({ ...filters, audit_type_id, offset: 0 });
  }

  function handleClearFilters() {
    setSearchInput("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onFiltersChange({ ...DEFAULT_FILTERS });
  }

  const hasActiveFilters =
    !!filters.status || !!filters.audit_type_id || !!filters.search;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search cases..."
        value={searchInput}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="w-[250px]"
      />

      <Select
        value={filters.status || "__all__"}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Statuses</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.audit_type_id || "__all__"}
        onValueChange={handleAuditTypeChange}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Types</SelectItem>
          {auditTypes?.map((type) => (
            <SelectItem key={type.id} value={type.id}>
              {type.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
