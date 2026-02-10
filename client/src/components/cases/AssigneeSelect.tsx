import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsers } from "@/hooks/useUsers";

const UNASSIGNED = "__unassigned__";

interface AssigneeSelectProps {
  currentAssigneeId: string | null;
  onAssign: (userId: string | null) => void;
  disabled?: boolean;
}

export default function AssigneeSelect({
  currentAssigneeId,
  onAssign,
  disabled = false,
}: AssigneeSelectProps) {
  const { data: users, isLoading } = useUsers();

  function handleChange(value: string) {
    onAssign(value === UNASSIGNED ? null : value);
  }

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading users...</div>
    );
  }

  return (
    <Select
      value={currentAssigneeId ?? UNASSIGNED}
      onValueChange={handleChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Assign to..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
        {users?.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.full_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
