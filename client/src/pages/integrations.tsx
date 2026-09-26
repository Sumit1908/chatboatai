import { Band, IntegrationsGrid, MarketingPage, SectionHeading, WhatsAppSection } from "@/components/crm/marketing-kit";

export default function IntegrationsPage() {
  return (
    <MarketingPage
      eyebrow="Integrations"
      title="Your business tools, connected to one CRM"
      subtitle="Channels and apps feed your CRM instead of living in separate tabs — so every message, lead and meeting lands on the right customer record."
    >
      <Band tinted>
        <SectionHeading
          eyebrow="All integrations"
          title="Live today, and what's next"
          subtitle="WhatsApp is available now. Integrations marked “Coming soon” are on our roadmap and not available yet."
        />
        <IntegrationsGrid />
      </Band>
      <WhatsAppSection />
    </MarketingPage>
  );
}
