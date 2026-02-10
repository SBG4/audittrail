import { useAuth } from "../hooks/useAuth.ts";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">
        Welcome, {user?.fullName ?? "User"}
      </h1>
      <p className="text-muted-foreground">
        Dashboard coming in Phase 2
      </p>
    </div>
  );
}
