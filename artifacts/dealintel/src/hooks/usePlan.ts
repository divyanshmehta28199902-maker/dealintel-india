import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentUser, type AppUser } from "./useCurrentUser";

export type Plan = "free" | "investor_pro" | "seller_premium";

export const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  investor_pro: "Investor Pro",
  seller_premium: "Seller Premium",
};

export function usePlan() {
  const { data: user } = useCurrentUser();
  const plan = (user?.tier ?? "free") as Plan;

  return {
    plan,
    label: PLAN_LABELS[plan] ?? plan,
    isInvestorPro: plan === "investor_pro",
    isSellerPremium: plan === "seller_premium",
    isFree: plan === "free",
    hasAccess: (required: Plan) => {
      if (required === "free") return true;
      return plan === required || plan === "investor_pro";
    },
  };
}

export function useUpgradePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: Plan) =>
      api.post<{ user: AppUser; subscription: unknown }>("/subscriptions/upgrade", { plan }),
    onSuccess: ({ user }) => {
      qc.setQueryData(["me"], user);
    },
  });
}
