import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface AppUser {
  id: number;
  clerkId: string;
  email: string;
  name: string | null;
  role: string | null;
  tier: string;
  avatarUrl: string | null;
  createdAt: string;
}

export function useCurrentUser() {
  return useQuery<AppUser>({
    queryKey: ["me"],
    queryFn: () => api.get("/auth/me"),
    retry: false,
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; role?: string }) =>
      api.patch<AppUser>("/auth/me", data),
    onSuccess: (user) => {
      qc.setQueryData(["me"], user);
    },
  });
}
