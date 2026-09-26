import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/crm/brand";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";
import { ContentSeo } from "@/components/seo-head";

export default function Refund() {
  return (
    <div className="min-h-screen bg-background">
      <ContentSeo path="/refund" />
      <nav className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/">
            <BrandLogo className="cursor-pointer" />
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
        <p className="text-muted-foreground mb-8">Last updated: {LEGAL_LAST_UPDATED}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          {/* OWNER REVIEW: 7-day money-back guarantee is existing business policy, not verified
              by the product. Confirm you honour it. */}
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
              <li>Send us a request through our <Link href="/contact" className="text-primary hover:underline">Contact page</Link></li>
              <li>Include your account email and reason for the refund request</li>
              {/* OWNER REVIEW: the review and processing timelines below are business commitments. */}
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

          {/* LEGAL REVIEW (owner): cancellation previously said "through your account settings",
              but the app has no self-serve cancel - changed to email. Confirm this process. */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Cancellation</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may cancel your subscription at any time by sending a request through our{" "}
              <Link href="/contact" className="text-primary hover:underline">Contact page</Link>. Upon 
              cancellation, you will continue to have access to the Service until the end of your 
              current billing period. No refunds will be provided for the remaining period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about our Refund Policy, please send us a message through our <Link href="/contact" className="text-primary hover:underline">Contact page</Link>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
