import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { EMAIL_SUPPORT, EMAIL_BILLING } from "@/lib/marketing-content";
import { ContentSeo } from "@/components/seo-head";

export default function Refund() {
  return (
    <div className="min-h-screen bg-background">
      <ContentSeo path="/refund" />
      <nav className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <MessageSquare className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold">Sampark</span>
            </div>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Refund Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Subscription Refunds</h2>
            <p className="text-muted-foreground leading-relaxed">
              We offer a 7-day money-back guarantee for new subscriptions. If you are not satisfied 
              with our Service within the first 7 days of your subscription, you may request a 
              full refund of your subscription fee.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Eligibility for Refund</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">To be eligible for a refund:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>The refund request must be made within 7 days of the initial subscription purchase</li>
              <li>You must not have violated our Terms of Service</li>
              <li>This is your first subscription to our Service</li>
              <li>You must submit your request through our official support channels</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Non-Refundable Items</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">The following are not eligible for refunds:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>WhatsApp message costs charged by Meta (these are separate from our platform fee)</li>
              <li>Subscription renewals after the first 7 days</li>
              <li>Accounts terminated due to Terms of Service violations</li>
              <li>Partial month usage after cancellation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. How to Request a Refund</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">To request a refund:</p>
            <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
              <li>Email us at <a href={`mailto:${EMAIL_SUPPORT}`} className="text-primary hover:underline">{EMAIL_SUPPORT}</a></li>
              <li>Include your account email and reason for the refund request</li>
              <li>We will review your request within 2 business days</li>
              <li>If approved, refunds will be processed within 5-7 business days</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Refund Method</h2>
            <p className="text-muted-foreground leading-relaxed">
              Refunds will be credited back to the original payment method used for the purchase. 
              The time it takes for the refund to appear in your account depends on your payment 
              provider and may take up to 10 business days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Cancellation</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may cancel your subscription at any time through your account settings. Upon 
              cancellation, you will continue to have access to the Service until the end of your 
              current billing period. No refunds will be provided for the remaining period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about our Refund Policy, please contact us:
            </p>
            <p className="text-muted-foreground mt-2">
              Email: <a href={`mailto:${EMAIL_BILLING}`} className="text-primary hover:underline">{EMAIL_BILLING}</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
