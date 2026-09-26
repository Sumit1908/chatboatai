import { Link } from "wouter";
import { ArrowRight, Check } from "lucide-react";
import { FadeIn } from "@/components/marketing-layout";
import { Band, MarketingPage, SectionHeading } from "@/components/crm/marketing-kit";
import { steps } from "@/lib/marketing-content";

const firstWeek = [
  { when: "Day 1", title: "Sign up and add your leads", desc: "Create your account and add the leads you're already working on." },
  { when: "Day 1", title: "Build your pipeline", desc: "Create deals for your open opportunities and place each one in the right stage." },
  { when: "Every day", title: "Work your follow-ups", desc: "Start the day with Overdue and Today on the Follow-ups page; mark calls and meetings done as you go." },
  { when: "When ready", title: "Connect WhatsApp", desc: "Connect your WhatsApp Business number to run campaigns and reply to customers from the same workspace." },
];

const needs = [
  { label: "For the CRM", items: ["An email address to sign up", "Your current leads (optional)"] },
  {
    label: "For the WhatsApp integration",
    items: [
      "Facebook Business Manager with admin access",
      "A phone number not active on the WhatsApp app",
      "An opted-in contact list for marketing campaigns",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <MarketingPage
      eyebrow="How it works"
      title="From first enquiry to closed deal"
      subtitle="Set up your CRM in an afternoon, work your pipeline every day, and connect your channels when you're ready."
    >
      <Band tinted>
        <SectionHeading eyebrow="Three steps" title="How ChatBoatAI works" />
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <FadeIn key={step.n} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-[#04322E]/10 bg-[#F4FBF9] p-7">
                <span className="font-heading text-4xl font-bold text-teal-200">{step.n}</span>
                <h3 className="mt-2 font-heading text-lg font-semibold text-[#04322E]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#04322E]/60">{step.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Band>

      <Band>
        <SectionHeading eyebrow="Your first week" title="What getting started looks like" />
        <ol className="mx-auto max-w-3xl space-y-3">
          {firstWeek.map((item, i) => (
            <FadeIn key={item.title} delay={i * 0.06}>
              <li className="flex flex-col gap-1 rounded-xl border border-[#04322E]/10 bg-white p-5 sm:flex-row sm:gap-5">
                <span className="shrink-0 text-sm font-semibold text-[#0E8C7F] sm:w-24">{item.when}</span>
                <span>
                  <span className="block font-heading font-semibold text-[#04322E]">{item.title}</span>
                  <span className="mt-1 block text-sm text-[#04322E]/60">{item.desc}</span>
                </span>
              </li>
            </FadeIn>
          ))}
        </ol>
      </Band>

      <Band tinted>
        <SectionHeading eyebrow="What you'll need" title="Most teams already have these" />
        <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
          {needs.map((group) => (
            <FadeIn key={group.label}>
              <div className="h-full rounded-2xl border border-[#04322E]/10 bg-[#F4FBF9] p-6">
                <p className="font-heading font-semibold text-[#04322E]">{group.label}</p>
                <ul className="mt-3 space-y-2">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[#04322E]/75">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#14B8A6]" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/setup-guide"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0E8C7F] transition-colors hover:text-[#04322E]"
          >
            Read the full setup guide <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </Band>
    </MarketingPage>
  );
}
