import type { IconType } from "react-icons";
import { FaWhatsapp } from "react-icons/fa";
import {
  SiFacebook,
  SiGmail,
  SiGoogle,
  SiGooglecalendar,
  SiGoogleforms,
  SiHubspot,
  SiSlack,
  SiZapier,
} from "react-icons/si";

/** Marketing palette for the CRM-first site (teal hero, bright green accent). */
export const CRM = {
  ink: "#04322E", // darkest teal — body text on light, text on accent buttons
  deep: "#063F3A",
  teal: "#0B6E66",
  tealMid: "#0E8C7F",
  tealLight: "#14B8A6",
  accent: "#34D399",
  accentHi: "#5EEAD4",
  mist: "#F4FBF9",
} as const;

/** Headline accent: bright green → teal gradient text. */
export const accentGradientText =
  "bg-gradient-to-r from-[#86EFAC] via-[#34D399] to-[#5EEAD4] bg-clip-text text-transparent";

/** Primary CTA on dark teal backgrounds. */
export const accentButton =
  "bg-gradient-to-r from-[#4ADE80] to-[#2DD4BF] text-[#04322E] font-semibold shadow-lg shadow-emerald-900/25 hover:brightness-105 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200";

/** ChatBoatAI logo mark — a hub with connected nodes ("everything connects here"). */
export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#14B8A6] to-[#0B6E66] shadow-md shadow-teal-900/25 ${className}`}
      role="img"
      aria-label="ChatBoatAI logo"
    >
      <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]" fill="none" aria-hidden>
        <path
          d="M12 12 5.5 6.5M12 12l6.5-5.5M12 12l-6.5 5.5M12 12l6.5 5.5"
          stroke="white"
          strokeOpacity=".55"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="3.4" fill="white" />
        <circle cx="5" cy="6" r="2" fill="#86EFAC" />
        <circle cx="19" cy="6" r="2" fill="white" />
        <circle cx="5" cy="18" r="2" fill="white" />
        <circle cx="19" cy="18" r="2" fill="#86EFAC" />
      </svg>
    </div>
  );
}

export function BrandLogo({
  tone = "dark",
  className = "",
}: {
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-2.5 min-w-0 ${className}`}>
      <BrandMark className="h-8 w-8 sm:h-9 sm:w-9 shrink-0" />
      <span
        className={`font-heading text-lg sm:text-xl font-bold tracking-tight truncate ${
          tone === "light" ? "text-white" : "text-[#04322E]"
        }`}
      >
        ChatBoat<span className={tone === "light" ? "text-[#5EEAD4]" : "text-[#0E8C7F]"}>AI</span>
      </span>
    </span>
  );
}

export type IntegrationStatus = "live" | "soon";

export type Integration = {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: IconType;
  color: string;
  /**
   * "live" = works in the product today; "soon" = on the roadmap. Keep this
   * truthful — the public integrations grid shows it to visitors.
   */
  status: IntegrationStatus;
};

export const INTEGRATIONS: Integration[] = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    category: "Messaging",
    description: "Official Business API — campaigns, templates and a shared inbox linked to every contact.",
    icon: FaWhatsapp,
    color: "#25D366",
    status: "live",
  },
  {
    id: "gmail",
    name: "Gmail",
    category: "Email",
    description: "Log sent and received emails against the right lead automatically.",
    icon: SiGmail,
    color: "#EA4335",
    status: "soon",
  },
  {
    id: "facebook-leads",
    name: "Facebook Leads",
    category: "Lead capture",
    description: "Pull Meta lead-ad submissions straight into your pipeline in real time.",
    icon: SiFacebook,
    color: "#1877F2",
    status: "soon",
  },
  {
    id: "google",
    name: "Google Ads",
    category: "Lead capture",
    description: "Capture Google lead-form extensions with source and campaign attached.",
    icon: SiGoogle,
    color: "#4285F4",
    status: "soon",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    category: "Scheduling",
    description: "Meetings and follow-ups sync both ways with each rep's calendar.",
    icon: SiGooglecalendar,
    color: "#4285F4",
    status: "soon",
  },
  {
    id: "forms",
    name: "Web Forms",
    category: "Lead capture",
    description: "Website and Google Forms submissions become leads, de-duplicated by phone.",
    icon: SiGoogleforms,
    color: "#7248B9",
    status: "soon",
  },
  {
    id: "slack",
    name: "Slack",
    category: "Team alerts",
    description: "Notify the right channel when a hot lead arrives or a deal is won.",
    icon: SiSlack,
    color: "#4A154B",
    status: "soon",
  },
  {
    id: "zapier",
    name: "Zapier",
    category: "Automation",
    description: "Connect thousands of other apps without writing code.",
    icon: SiZapier,
    color: "#FF4F00",
    status: "soon",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "CRM sync",
    description: "Import contacts and deals when you move over from HubSpot.",
    icon: SiHubspot,
    color: "#FF7A59",
    status: "soon",
  },
];

export function integrationById(id: string): Integration {
  const found = INTEGRATIONS.find((i) => i.id === id);
  if (!found) throw new Error(`Unknown integration: ${id}`);
  return found;
}

/** Rounded white tile with a brand icon — shared by the mockup, badges and grid. */
export function IntegrationIcon({
  integration,
  className = "h-9 w-9",
  iconClassName = "h-[55%] w-[55%]",
}: {
  integration: Integration;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = integration.icon;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-black/5 ${className}`}
    >
      <Icon className={iconClassName} style={{ color: integration.color }} aria-hidden />
    </span>
  );
}
