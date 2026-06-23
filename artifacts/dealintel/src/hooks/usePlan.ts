import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentUser, type AppUser } from "./useCurrentUser";

export type Plan = "free" | "investor_pro" | "investor_elite" | "seller_premium";

export const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  investor_pro: "Investor Pro",
  investor_elite: "Investor Elite",
  seller_premium: "Seller Premium",
};

export function usePlan() {
  const { data: user } = useCurrentUser();
  const plan = (user?.tier ?? "free") as Plan;

  return {
    plan,
    label: PLAN_LABELS[plan] ?? plan,
    isInvestorPro: plan === "investor_pro",
    isInvestorElite: plan === "investor_elite",
    isSellerPremium: plan === "seller_premium",
    isFree: plan === "free",
    hasAccess: (required: Plan) => {
      if (required === "free") return true;
      if (required === "seller_premium") return plan === "seller_premium";
      if (required === "investor_pro") return plan === "investor_pro" || plan === "investor_elite";
      if (required === "investor_elite") return plan === "investor_elite";
      return false;
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
