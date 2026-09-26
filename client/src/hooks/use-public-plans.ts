import { useQuery } from "@tanstack/react-query";

export interface PublicBillingPlan {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  priceLabel: string;
  amountInr: number;
  period: string;
  featured: boolean;
  features: string[];
  razorpayEnabled: boolean;
  sortOrder: number;
  maxContacts: number | null;
  maxMessagesPerDay: number | null;
  maxWhatsappNumbers: number | null;
  maxTemplates: number | null;
  maxTeamSeats: number | null;
  /** True when "Get Started" can really lead to Razorpay checkout right now. */
  checkoutAvailable?: boolean;
}

function formatLimit(value: number | null | undefined): string {
  if (value == null) return "Unlimited";
  return value.toLocaleString("en-IN");
}

export function usePublicPlans() {
  return useQuery<{ plans: PublicBillingPlan[] }>({
    queryKey: ["/api/plans"],
  });
}

export function buildPlanComparison(plans: PublicBillingPlan[]) {
  const rows = [
    {
      feature: "WhatsApp numbers",
      values: plans.map((p) => formatLimit(p.maxWhatsappNumbers)),
    },
    {
      feature: "Contacts",
      values: plans.map((p) => formatLimit(p.maxContacts)),
    },
    {
      feature: "Users",
      values: plans.map((p) => formatLimit(p.maxTeamSeats)),
    },
    {
      feature: "Templates",
      values: plans.map((p) => formatLimit(p.maxTemplates)),
    },
    {
      feature: "Messages / subscription",
      values: plans.map((p) => formatLimit(p.maxMessagesPerDay)),
    },
  ];
  return { headers: plans.map((p) => p.name), rows };
}

export function cheapestPlan(plans: PublicBillingPlan[]): PublicBillingPlan | undefined {
  if (plans.length === 0) return undefined;
  return [...plans].sort((a, b) => a.amountInr - b.amountInr)[0];
}
