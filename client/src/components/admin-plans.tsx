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
import { CreditCard, Plus, Pencil, Trash2 } from "lucide-react";

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
  amountInr: "1999",
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

  const { data, isLoading } = useQuery<{ plans: AdminBillingPlan[] }>({
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
      toast({ title: "Plan deactivated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not deactivate plan",
        description: error.message?.replace(/^\d+:\s*/, "") || "Try again",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-[#14205a]">Billing plans</h2>
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
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Contacts: {formatLimit(plan.maxContacts)}</li>
                  <li>Messages/subscription: {formatLimit(plan.maxMessagesPerDay)}</li>
                  <li>WhatsApp numbers: {formatLimit(plan.maxWhatsappNumbers)}</li>
                  <li>Templates: {formatLimit(plan.maxTemplates)}</li>
                  <li>Team seats: {formatLimit(plan.maxTeamSeats)}</li>
                </ul>
                <div className="flex gap-2">
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
                  {plan.active !== false && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive"
                      onClick={() => deactivateMutation.mutate(plan.id)}
                      disabled={deactivateMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hide
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
    </div>
  );
}
