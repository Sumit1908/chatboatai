import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/crm/brand";
import { LEGAL_LAST_UPDATED, SERVICE_DESCRIPTION } from "@/lib/legal";
import { ContentSeo } from "@/components/seo-head";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <ContentSeo path="/privacy" />
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
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: {LEGAL_LAST_UPDATED}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              ChatBoatAI ("we", "our", or "us") is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
              when you use our service.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">{SERVICE_DESCRIPTION}</p>
            {/* LEGAL REVIEW (owner): add the legal entity name, registered address and, if required
                for your business, a Grievance Officer name and contact. These are business-specific
                and were not invented here. */}
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">We collect information that you provide directly to us, including:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Account information (name, email address, phone number)</li>
              <li>CRM records you create or import, such as leads, contacts, deals, follow-ups, tasks and notes</li>
              <li>Contact lists and customer data you upload, and WhatsApp messages, templates and campaign content if you use the WhatsApp integration</li>
              <li>Payment information processed through secure third-party payment processors</li>
              <li>Usage data and analytics about how you use our platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and customer service requests</li>
              <li>Monitor and analyze trends, usage, and activities in connection with our services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Information Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. 
              We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
              <li>With Meta/WhatsApp as required to provide the WhatsApp Business API services</li>
              <li>With service providers who assist in our operations</li>
              {/* LEGAL REVIEW (owner): providers the code actually uses - Razorpay (payments),
                  Resend (email), Cloudflare R2 (file storage, if configured), Redis/Upstash
                  (message queue, if configured), plus your hosting and database providers.
                  Decide whether to name them here. */}
              <li>To comply with legal obligations or protect our rights</li>
              <li>With your consent or at your direction</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal 
              information against unauthorized access, alteration, disclosure, or destruction. 
              However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5a. AI Features</h2>
            <p className="text-muted-foreground leading-relaxed">
              AI features shown as “Coming soon” are not yet active, and we do not currently send your data to
              any AI provider.
            </p>
            {/* LEGAL REVIEW (owner): update this section before any AI feature launches. */}
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your information for as long as your account is active or as needed to provide 
              you services. We will retain and use your information as necessary to comply with our 
              legal obligations, resolve disputes, and enforce our agreements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Access, update, or delete your personal information</li>
              <li>Object to processing of your personal information</li>
              <li>Request portability of your personal information</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              To delete your account and all associated data, visit our{" "}
              <Link href="/delete-data" className="text-primary hover:underline">
                Data Deletion Page
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please send us a message through our <Link href="/contact" className="text-primary hover:underline">Contact page</Link>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
