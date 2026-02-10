import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { UserInfo } from "@/types/case";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<UserInfo[]>("/api/users"),
    staleTime: 10 * 60 * 1000, // 10 minutes -- user list changes infrequently
  });
}
