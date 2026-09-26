import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin } from "lucide-react";
import { MarketingLayout } from "@/components/marketing-layout";
import { apiRequest } from "@/lib/queryClient";

export default function Contact() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setIsSubmitting(true);

    try {
      const formData = new FormData(form);
      const payload = {
        firstName: String(formData.get("firstName") || "").trim(),
        lastName: String(formData.get("lastName") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        phone: String(formData.get("phone") || "").trim() || undefined,
        subject: String(formData.get("subject") || "").trim(),
        message: String(formData.get("message") || "").trim(),
      };

      const res = await apiRequest("POST", "/api/contact-inquiry", payload);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast({
          title: "Couldn't send your message",
          description: data.error || "Please try again in a few minutes.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Message Sent",
        description: "Thank you for contacting us. We'll get back to you by email.",
      });
      form.reset();
    } catch {
      toast({
        title: "Couldn't send your message",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MarketingLayout>
      <main className="container mx-auto max-w-6xl px-4 py-12">
        <div className="text-center mb-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#0E8C7F]">Contact</p>
          <h1 className="mb-4 font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Need a Custom CRM? Let&apos;s Talk
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            Tell us about your business, workflow and integrations. Our team will help you configure the right CRM
            setup. For support or billing questions, use the same form.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Send us a Message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you by email.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" name="firstName" placeholder="John" required data-testid="input-first-name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" name="lastName" placeholder="Doe" required data-testid="input-last-name" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="john@example.com" required data-testid="input-email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" name="phone" type="tel" placeholder="Your phone number (optional)" data-testid="input-phone" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" name="subject" placeholder="How can we help?" required data-testid="input-subject" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Tell us more about your inquiry..."
                      className="min-h-32 resize-none"
                      required
                      data-testid="input-message"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="button-submit-contact">
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Office Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  ChatBoatAI Pvt. Ltd.<br />
                  412 Business Park, Tower C<br />
                  Bengaluru, India
                </p>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Response Time</h3>
                <p className="text-sm text-muted-foreground">
                  We reply to every inquiry by email as soon as we can.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </MarketingLayout>
  );
}
