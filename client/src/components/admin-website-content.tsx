import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Save, Plus, Trash2 } from "lucide-react";

interface FeatureItem { title: string; desc: string; }
interface FaqItem { q: string; a: string; }
interface TestimonialItem { quote: string; name: string; role: string; }

// Deliberately excludes websiteName/supportEmail/supportPhone - those are
// edited exclusively on the Settings panel (admin-settings.tsx), which PUTs
// the same /api/admin/website-settings endpoint with just those 3 fields.
// This form must never include them, or saving here (even untouched) would
// submit them as empty strings and silently wipe out whatever was set there
// - the backend does a partial update, so a key that's simply absent from
// the payload is left alone, but an empty string is a real overwrite.
interface WebsiteSettingsData {
  heroHeading?: string | null;
  heroDescription?: string | null;
  features?: FeatureItem[] | null;
  faqs?: FaqItem[] | null;
  testimonials?: TestimonialItem[] | null;
  pricingNote?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactAddress?: string | null;
}

const emptyForm: WebsiteSettingsData = {
  heroHeading: "", heroDescription: "",
  features: [], faqs: [], testimonials: [],
  pricingNote: "", contactEmail: "", contactPhone: "", contactAddress: "",
};

export function AdminWebsiteContentPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<WebsiteSettingsData>(emptyForm);

  const { data, isLoading } = useQuery<WebsiteSettingsData | null>({
    queryKey: ["/api/admin/website-settings"],
  });

  useEffect(() => {
    if (data) setForm({ ...emptyForm, ...data });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: WebsiteSettingsData) => apiRequest("PUT", "/api/admin/website-settings", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/website-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/website-settings"] });
      toast({ title: "Saved", description: "Website content updated." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save website content", variant: "destructive" }),
  });

  const set = <K extends keyof WebsiteSettingsData>(key: K, value: WebsiteSettingsData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateFeature = (i: number, patch: Partial<FeatureItem>) =>
    set("features", (form.features || []).map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const updateFaq = (i: number, patch: Partial<FaqItem>) =>
    set("faqs", (form.faqs || []).map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const updateTestimonial = (i: number, patch: Partial<TestimonialItem>) =>
    set("testimonials", (form.testimonials || []).map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading website content…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold">Website Content</h1>
          <p className="text-sm text-muted-foreground">
            Edit public marketing site copy. Blank fields keep the site's current wording — nothing changes
            until you fill something in and save.
          </p>
        </div>
        <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} data-testid="button-save-website-content">
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Hero Section</CardTitle>
          <CardDescription>The main headline visitors see on the landing page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Hero Heading</Label>
            <Input value={form.heroHeading || ""} onChange={(e) => set("heroHeading", e.target.value)} placeholder="Leave blank to keep the current heading" data-testid="input-hero-heading" />
          </div>
          <div className="space-y-2">
            <Label>Hero Description</Label>
            <Textarea value={form.heroDescription || ""} onChange={(e) => set("heroDescription", e.target.value)} placeholder="Leave blank to keep the current description" className="min-h-20" data-testid="input-hero-description" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Features</CardTitle>
              <CardDescription>Optional — overrides the features list shown on the site when set</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => set("features", [...(form.features || []), { title: "", desc: "" }])}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Feature
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(form.features || []).length === 0 && <p className="text-sm text-muted-foreground">No overrides — using the site's built-in feature list.</p>}
          {(form.features || []).map((f, i) => (
            <div key={i} className="flex gap-2 items-start p-3 border rounded-lg">
              <div className="flex-1 space-y-2">
                <Input value={f.title} onChange={(e) => updateFeature(i, { title: e.target.value })} placeholder="Feature title" data-testid={`input-feature-title-${i}`} />
                <Textarea value={f.desc} onChange={(e) => updateFeature(i, { desc: e.target.value })} placeholder="Feature description" className="min-h-16" data-testid={`input-feature-desc-${i}`} />
              </div>
              <Button variant="ghost" size="icon" onClick={() => set("features", (form.features || []).filter((_, idx) => idx !== i))} data-testid={`button-remove-feature-${i}`}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">FAQs</CardTitle>
              <CardDescription>Optional — overrides the FAQ list shown on the site when set</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => set("faqs", [...(form.faqs || []), { q: "", a: "" }])}>
              <Plus className="h-4 w-4 mr-1.5" /> Add FAQ
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(form.faqs || []).length === 0 && <p className="text-sm text-muted-foreground">No overrides — using the site's built-in FAQ list.</p>}
          {(form.faqs || []).map((f, i) => (
            <div key={i} className="flex gap-2 items-start p-3 border rounded-lg">
              <div className="flex-1 space-y-2">
                <Input value={f.q} onChange={(e) => updateFaq(i, { q: e.target.value })} placeholder="Question" data-testid={`input-faq-q-${i}`} />
                <Textarea value={f.a} onChange={(e) => updateFaq(i, { a: e.target.value })} placeholder="Answer" className="min-h-16" data-testid={`input-faq-a-${i}`} />
              </div>
              <Button variant="ghost" size="icon" onClick={() => set("faqs", (form.faqs || []).filter((_, idx) => idx !== i))} data-testid={`button-remove-faq-${i}`}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Testimonials</CardTitle>
              <CardDescription>Optional — overrides the testimonials shown on the site when set</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => set("testimonials", [...(form.testimonials || []), { quote: "", name: "", role: "" }])}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Testimonial
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(form.testimonials || []).length === 0 && <p className="text-sm text-muted-foreground">No overrides — using the site's built-in testimonials.</p>}
          {(form.testimonials || []).map((t, i) => (
            <div key={i} className="flex gap-2 items-start p-3 border rounded-lg">
              <div className="flex-1 space-y-2">
                <Textarea value={t.quote} onChange={(e) => updateTestimonial(i, { quote: e.target.value })} placeholder="Quote" className="min-h-16" data-testid={`input-testimonial-quote-${i}`} />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={t.name} onChange={(e) => updateTestimonial(i, { name: e.target.value })} placeholder="Name" data-testid={`input-testimonial-name-${i}`} />
                  <Input value={t.role} onChange={(e) => updateTestimonial(i, { role: e.target.value })} placeholder="Role / company" data-testid={`input-testimonial-role-${i}`} />
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => set("testimonials", (form.testimonials || []).filter((_, idx) => idx !== i))} data-testid={`button-remove-testimonial-${i}`}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Pricing & Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pricing Page Note</Label>
            <Textarea value={form.pricingNote || ""} onChange={(e) => set("pricingNote", e.target.value)} placeholder="Optional note shown on the pricing page" className="min-h-16" data-testid="input-pricing-note" />
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input value={form.contactEmail || ""} onChange={(e) => set("contactEmail", e.target.value)} placeholder="Leave blank to keep current" data-testid="input-contact-email" />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input value={form.contactPhone || ""} onChange={(e) => set("contactPhone", e.target.value)} placeholder="Leave blank to keep current" data-testid="input-contact-phone" />
            </div>
            <div className="space-y-2">
              <Label>Contact Address</Label>
              <Input value={form.contactAddress || ""} onChange={(e) => set("contactAddress", e.target.value)} placeholder="Leave blank to keep current" data-testid="input-contact-address" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
