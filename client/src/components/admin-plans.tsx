import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Check, CheckCircle2, CreditCard, Eye, Plus, Pencil, Trash2, XCircle } from "lucide-react";
import type { PlanCheckoutStatus } from "@shared/billingPlans";

export interface AdminBillingPlan {
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
  active?: boolean;
  /** Linked Razorpay plan (null until the first checkout creates it). */
  razorpayPlanId?: string | null;
  /** Whether customers can buy it right now, and why not. */
  checkout?: PlanCheckoutStatus;
}

type PlanFormState = {
  name: string;
  slug: string;
  tagline: string;
  amountInr: string;
  featured: boolean;
  active: boolean;
  razorpayEnabled: boolean;
  featuresText: string;
  sortOrder: string;
  maxContacts: string;
  maxMessagesPerDay: string;
  maxWhatsappNumbers: string;
  maxTemplates: string;
  maxTeamSeats: string;
};

const emptyForm = (): PlanFormState => ({
  name: "",
  slug: "",
  tagline: "",
  amountInr: "",
  featured: false,
  active: true,
  razorpayEnabled: true,
  featuresText: "",
  sortOrder: "100",
  maxContacts: "",
  maxMessagesPerDay: "",
  maxWhatsappNumbers: "",
  maxTemplates: "",
  maxTeamSeats: "",
});

function planToForm(plan: AdminBillingPlan): PlanFormState {
  return {
    name: plan.name,
    slug: plan.slug,
    tagline: plan.tagline,
    amountInr: String(plan.amountInr),
    featured: plan.featured,
    active: plan.active !== false,
    razorpayEnabled: plan.razorpayEnabled,
    featuresText: (plan.features || []).join("\n"),
    sortOrder: String(plan.sortOrder ?? 100),
    maxContacts: plan.maxContacts == null ? "" : String(plan.maxContacts),
    maxMessagesPerDay: plan.maxMessagesPerDay == null ? "" : String(plan.maxMessagesPerDay),
    maxWhatsappNumbers: plan.maxWhatsappNumbers == null ? "" : String(plan.maxWhatsappNumbers),
    maxTemplates: plan.maxTemplates == null ? "" : String(plan.maxTemplates),
    maxTeamSeats: plan.maxTeamSeats == null ? "" : String(plan.maxTeamSeats),
  };
}

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function formToPayload(form: PlanFormState) {
  return {
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    tagline: form.tagline.trim(),
    amountInr: Math.round(Number(form.amountInr) || 0),
    featured: form.featured,
    active: form.active,
    razorpayEnabled: form.razorpayEnabled,
    features: form.featuresText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    sortOrder: Math.round(Number(form.sortOrder) || 100),
    maxContacts: parseOptionalInt(form.maxContacts),
    maxMessagesPerDay: parseOptionalInt(form.maxMessagesPerDay),
    maxWhatsappNumbers: parseOptionalInt(form.maxWhatsappNumbers),
    maxTemplates: parseOptionalInt(form.maxTemplates),
    maxTeamSeats: parseOptionalInt(form.maxTeamSeats),
  };
}

function formatLimit(value: number | null | undefined): string {
  if (value == null) return "Unlimited";
  return value.toLocaleString("en-IN");
}

export function AdminPlansPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBillingPlan | null>(null);
  const [form, setForm] = useState<PlanFormState>(emptyForm());
  // Plan waiting for the "Hide from website?" confirmation.
  const [hiding, setHiding] = useState<AdminBillingPlan | null>(null);

  const { data, isLoading, error } = useQuery<{ plans: AdminBillingPlan[] }>({
    queryKey: ["/api/admin/plans"],
  });

  const plans = data?.plans ?? [];

  useEffect(() => {
    if (!open) return;
    setForm(editing ? planToForm(editing) : emptyForm());
  }, [open, editing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = formToPayload(form);
      if (!payload.name || !payload.amountInr) {
        throw new Error("Name and amount are required");
      }
      if (editing) {
        const res = await apiRequest("PATCH", `/api/admin/plans/${editing.id}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/admin/plans", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/plans"] });
      toast({ title: editing ? "Plan updated" : "Plan created" });
      setOpen(false);
      setEditing(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Could not save plan",
        description: error.message?.replace(/^\d+:\s*/, "") || "Try again",
        variant: "destructive",
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/plans/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/plans"] });
      toast({ title: "Plan hidden from the website" });
      setHiding(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Could not deactivate plan",
        description: error.message?.replace(/^\d+:\s*/, "") || "Try again",
        variant: "destructive",
      });
    },
  });

  const showMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/admin/plans/${id}`, { active: true });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/plans"] });
      toast({ title: "Plan is visible on the website again" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not show plan",
        description: error.message?.replace(/^\d+:\s*/, "") || "Try again",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-[#14205a]">Pricing Plans</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Plans appear on the website pricing pages and in the user billing dashboard.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add plan
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">Loading plans…</CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-sm text-destructive" data-testid="text-plans-error">
            Could not load plans: {(error as Error).message.replace(/^\d+:\s*/, "")}
          </CardContent>
        </Card>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            No plans yet. Create your first plan to show pricing on the site.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-cyan-600" />
                      {plan.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{plan.slug}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {plan.featured && <Badge>Featured</Badge>}
                    <Badge variant={plan.active === false ? "secondary" : "outline"}>
                      {plan.active === false ? "Hidden" : "Active"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-2xl font-bold text-[#14205a]">{plan.priceLabel}</div>
                  <p className="text-sm text-muted-foreground mt-1">{plan.tagline}</p>
                </div>
                {/* Feature list exactly as customers see it on the pricing and billing pages. */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                    Customers see
                  </p>
                  {plan.features.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No features listed</p>
                  ) : (
                    <ul className="space-y-1.5" data-testid={`plan-features-${plan.slug}`}>
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#14B8A6]" aria-hidden />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Contacts: {formatLimit(plan.maxContacts)}</li>
                  <li>Messages/subscription: {formatLimit(plan.maxMessagesPerDay)}</li>
                  <li>WhatsApp numbers: {formatLimit(plan.maxWhatsappNumbers)}</li>
                  <li>Templates: {formatLimit(plan.maxTemplates)}</li>
                  <li>Team seats: {formatLimit(plan.maxTeamSeats)}</li>
                </ul>
                {/* Checkout status - same rules as real checkout (server-computed). */}
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-xs" data-testid={`plan-checkout-${plan.slug}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Razorpay checkout</span>
                    <span className={plan.razorpayEnabled ? "font-medium text-emerald-700" : "font-medium text-muted-foreground"}>
                      {plan.razorpayEnabled ? "On" : "Off"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Razorpay plan</span>
                    {plan.razorpayPlanId ? (
                      <span className="font-mono text-[11px] text-foreground truncate" title={plan.razorpayPlanId}>
                        Linked · {plan.razorpayPlanId}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-right">Not linked yet — created on first checkout</span>
                    )}
                  </div>
                  {plan.checkout && (
                    <div className="border-t pt-1.5 mt-1.5">
                      <p
                        className={`flex items-center gap-1.5 text-sm font-semibold ${
                          plan.checkout.canBuy ? "text-emerald-700" : "text-destructive"
                        }`}
                        data-testid={`plan-can-buy-${plan.slug}`}
                      >
                        {plan.checkout.canBuy ? (
                          <CheckCircle2 className="h-4 w-4" aria-hidden />
                        ) : (
                          <XCircle className="h-4 w-4" aria-hidden />
                        )}
                        Customers can buy this: {plan.checkout.canBuy ? "Yes" : "No"}
                      </p>
                      {!plan.checkout.canBuy && (
                        <ul className="mt-1 space-y-0.5 pl-5 list-disc text-muted-foreground">
                          {plan.checkout.reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setEditing(plan);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  {plan.active !== false ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive"
                      onClick={() => setHiding(plan)}
                      disabled={deactivateMutation.isPending}
                      data-testid={`button-hide-${plan.slug}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hide
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => showMutation.mutate(plan.id)}
                      disabled={showMutation.isPending}
                      data-testid={`button-show-${plan.slug}`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Show on website
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit plan" : "Create plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="plan-name">Name</Label>
                <Input
                  id="plan-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Growth"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-slug">Slug (optional)</Label>
                <Input
                  id="plan-slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="growth"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-tagline">Tagline</Label>
              <Input
                id="plan-tagline"
                value={form.tagline}
                onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                placeholder="For growing teams"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="plan-amount">Price (INR / month)</Label>
                <Input
                  id="plan-amount"
                  type="number"
                  min={1}
                  value={form.amountInr}
                  onChange={(e) => setForm((f) => ({ ...f, amountInr: e.target.value }))}
                  aria-describedby={editing ? "plan-amount-note" : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-sort">Sort order</Label>
                <Input
                  id="plan-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
            </div>
            {editing && (
              <p
                id="plan-amount-note"
                role="note"
                data-testid="text-price-change-note"
                className={`flex items-start gap-2 rounded-md border p-2.5 text-xs ${
                  Math.round(Number(form.amountInr)) !== editing.amountInr
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-transparent bg-muted/40 text-muted-foreground"
                }`}
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  Price changes apply to new checkouts only. Existing subscribers keep their current price.
                </span>
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="plan-features">Features (one per line)</Label>
              <Textarea
                id="plan-features"
                rows={5}
                value={form.featuresText}
                onChange={(e) => setForm((f) => ({ ...f, featuresText: e.target.value }))}
                placeholder={"1 WhatsApp number\n25,000 contacts"}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["maxContacts", "Max contacts", form.maxContacts],
                  ["maxMessagesPerDay", "Max messages / subscription", form.maxMessagesPerDay],
                  ["maxWhatsappNumbers", "Max WhatsApp numbers", form.maxWhatsappNumbers],
                  ["maxTemplates", "Max templates", form.maxTemplates],
                  ["maxTeamSeats", "Max team seats", form.maxTeamSeats],
                ] as const
              ).map(([key, label, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`plan-${key}`}>{label}</Label>
                  <Input
                    id={`plan-${key}`}
                    type="number"
                    min={0}
                    value={value}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder="Blank = unlimited"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Featured plan</span>
                <Switch
                  checked={form.featured}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, featured: checked }))}
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Visible on website & billing</span>
                <Switch
                  checked={form.active}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, active: checked }))}
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Razorpay self-serve checkout</span>
                <Switch
                  checked={form.razorpayEnabled}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, razorpayEnabled: checked }))}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : editing ? "Save changes" : "Create plan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!hiding} onOpenChange={(isOpen) => !isOpen && setHiding(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hide “{hiding?.name}” from the website?</AlertDialogTitle>
            <AlertDialogDescription>
              New customers won&apos;t see or be able to buy this plan. Existing subscribers keep their plan and
              price. You can show it again at any time with “Show on website”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deactivateMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (hiding) deactivateMutation.mutate(hiding.id);
              }}
              data-testid="button-confirm-hide"
            >
              Hide plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
