/**
 * Real ChatBoatAI screenshots (captured from the running app with a sample
 * workspace - see client/public/product). Nothing here is a mock-up: when
 * the app UI changes, re-capture these images rather than drawing fakes.
 */
export type ProductShot = {
  id: string;
  label: string;
  src: string;
  alt: string;
  blurb: string;
};

export const PRODUCT_SHOTS: ProductShot[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    src: "/product/dashboard.webp",
    alt: "ChatBoatAI CRM dashboard with total leads, active deals, deals won, revenue, sales pipeline, upcoming follow-ups and recent leads",
    blurb: "Leads, open deals, this month's wins and revenue — calculated from your own data.",
  },
  {
    id: "leads",
    label: "Leads",
    src: "/product/leads.webp",
    alt: "ChatBoatAI leads list with contact details, source, status and estimated value",
    blurb: "Every enquiry with its source, status and value. Search, filter and convert to a deal.",
  },
  {
    id: "pipeline",
    label: "Pipeline",
    src: "/product/pipeline.webp",
    alt: "ChatBoatAI sales pipeline board with deals in New, Contacted, Proposal, Negotiation, Closed Won and Closed Lost",
    blurb: "Drag deals from New to Closed Won and see the value in every stage.",
  },
  {
    id: "follow-ups",
    label: "Follow-ups",
    src: "/product/follow-ups.webp",
    alt: "ChatBoatAI follow-ups grouped into overdue, today and upcoming",
    blurb: "Calls, meetings and emails grouped into Overdue, Today and Upcoming.",
  },
  {
    id: "tasks",
    label: "Tasks",
    src: "/product/tasks.webp",
    alt: "ChatBoatAI task list with due dates",
    blurb: "Internal to-dos next to your customer follow-ups.",
  },
  {
    id: "inbox",
    label: "WhatsApp Inbox",
    src: "/product/inbox.webp",
    alt: "ChatBoatAI WhatsApp inbox with customer conversations and a reply thread",
    blurb: "Customer WhatsApp conversations in a shared inbox — reply from the CRM.",
  },
  {
    id: "campaigns",
    label: "Campaigns",
    src: "/product/campaigns.webp",
    alt: "ChatBoatAI WhatsApp campaigns with a completed campaign and a scheduled campaign",
    blurb: "Send approved-template campaigns now or schedule them, and track delivery.",
  },
];

export function productShot(id: string): ProductShot {
  const shot = PRODUCT_SHOTS.find((s) => s.id === id);
  if (!shot) throw new Error(`Unknown product shot: ${id}`);
  return shot;
}

/** A screenshot in a simple browser window frame. */
export function ProductFrame({
  shot,
  priority = false,
  className = "",
  caption = true,
}: {
  shot: ProductShot;
  /** Above-the-fold image: load eagerly with high priority. */
  priority?: boolean;
  className?: string;
  caption?: boolean;
}) {
  return (
    <figure className={className}>
      <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_40px_80px_-32px_rgba(2,30,27,0.55)] sm:rounded-2xl">
        <div className="flex items-center gap-1.5 border-b border-slate-200/80 bg-slate-50 px-3 py-2 sm:px-4 sm:py-2.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          <span className="ml-3 hidden truncate rounded-md bg-white px-3 py-0.5 text-[11px] text-slate-400 ring-1 ring-slate-200 sm:block">
            chatboatai.in/{shot.id === "campaigns" ? "notifications" : shot.id}
          </span>
        </div>
        <img
          src={shot.src}
          alt={shot.alt}
          width={2880}
          height={1800}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          // @ts-expect-error fetchpriority is valid HTML; React 18 types lag behind.
          fetchpriority={priority ? "high" : "auto"}
          className="block h-auto w-full"
        />
      </div>
      {caption && (
        <figcaption className="mt-2.5 text-center text-xs text-current opacity-70">
          The real ChatBoatAI app · sample data
        </figcaption>
      )}
    </figure>
  );
}
