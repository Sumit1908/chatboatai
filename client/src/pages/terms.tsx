import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { EMAIL_INFO } from "@/lib/marketing-content";
import { ContentSeo } from "@/components/seo-head";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <ContentSeo path="/terms" />
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
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using Sampark ("Service"), you accept and agree to be bound 
              by these Terms of Service. If you do not agree to these terms, you should not use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Sampark provides a platform for businesses to send broadcast messages through 
              the official WhatsApp Business API. Our Service includes template management, contact 
              management, campaign scheduling, and analytics features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">To use our Service, you must:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Create an account with accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Be at least 18 years old or have parental consent</li>
              <li>Be authorized to bind your organization to these terms if using for business</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Send spam or unsolicited messages</li>
              <li>Violate WhatsApp's Business Policy or Commerce Policy</li>
              <li>Send illegal, harmful, or offensive content</li>
              <li>Impersonate others or misrepresent your affiliation</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Attempt to gain unauthorized access to any systems</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Payment and Subscription</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Our Service is offered on a subscription basis. Current plan prices are listed on our Pricing page and may change over time:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Payment is due at the beginning of each billing cycle</li>
              <li>Subscriptions auto-renew unless cancelled before the renewal date</li>
              <li>WhatsApp message costs are separate and charged by Meta</li>
              <li>Refunds are subject to our Refund Policy</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. WhatsApp Business API Compliance</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for ensuring your use of the Service complies with Meta's WhatsApp 
              Business Terms of Service, WhatsApp Business Policy, and all applicable laws. We reserve 
              the right to suspend accounts that violate these policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service and its original content, features, and functionality are owned by 
              Sampark and are protected by international copyright, trademark, and 
              other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, Sampark shall not be liable for any 
              indirect, incidental, special, consequential, or punitive damages, including loss of 
              profits, data, or business opportunities arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account immediately, without prior notice, for conduct 
              that we believe violates these Terms or is harmful to other users, us, or third parties, 
              or for any other reason at our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify users of any 
              material changes via email or through the Service. Continued use after changes 
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us at:
            </p>
            <p className="text-muted-foreground mt-2">
              Email: <a href={`mailto:${EMAIL_INFO}`} className="text-primary hover:underline">{EMAIL_INFO}</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
