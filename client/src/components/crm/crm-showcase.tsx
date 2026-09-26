import {
  BarChart3,
  Bell,
  CalendarClock,
  CheckSquare,
  ChevronDown,
  Contact,
  Handshake,
  LayoutDashboard,
  MessageCircle,
  Phone,
  Search,
  Settings,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

/*
 * Marketing-only CRM mockup for the landing page.
 *
 * Everything here is STATIC dummy data rendered as plain markup: no API calls,
 * no state, no links, no buttons. The whole mockup is aria-hidden and contains
 * nothing focusable - screen readers get the sr-only summary instead - so it
 * behaves like a product screenshot, not an entry point into the app.
 */

const SIDEBAR: { label: string; icon: LucideIcon }[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Leads", icon: UserPlus },
  { label: "Contacts", icon: Contact },
  { label: "Deals", icon: Handshake },
  { label: "Tasks", icon: CheckSquare },
  { label: "Follow-ups", icon: CalendarClock },
  { label: "Team", icon: Users },
  { label: "Reports", icon: BarChart3 },
  { label: "Settings", icon: Settings },
];

const STATS = [
  { label: "Total Leads", value: "2,480", delta: "+12% this month", tone: "text-teal-600" },
  { label: "New Leads", value: "186", delta: "+24 today", tone: "text-sky-600" },
  { label: "Follow-ups", value: "126", delta: "18 due today", tone: "text-amber-600" },
  { label: "Deals", value: "₹18.6 Cr", delta: "Pipeline value", tone: "text-violet-600" },
];

type Status = "New" | "Follow-up" | "Qualified" | "Negotiation" | "Won";

const STATUS_BADGE: Record<Status, string> = {
  New: "bg-sky-50 text-sky-700 ring-sky-200",
  "Follow-up": "bg-amber-50 text-amber-700 ring-amber-200",
  Qualified: "bg-teal-50 text-teal-700 ring-teal-200",
  Negotiation: "bg-violet-50 text-violet-700 ring-violet-200",
  Won: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const LEADS: { name: string; phone: string; source: string; status: Status; owner: string }[] = [
  { name: "Rahul Sharma", phone: "+91 98765 43210", source: "Website", status: "New", owner: "Amit Kumar" },
  { name: "Priya Singh", phone: "+91 98765 43120", source: "WhatsApp", status: "Follow-up", owner: "Neha Singh" },
  { name: "Aman Verma", phone: "+91 98765 43015", source: "Meta Ads", status: "Qualified", owner: "Rahul Gupta" },
  { name: "Sneha Kapoor", phone: "+91 98765 43991", source: "Referral", status: "Negotiation", owner: "Amit Kumar" },
];

const PIPELINE: { stage: string; dot: string; cards: { name: string; deal: string; value: string }[] }[] = [
  {
    stage: "New Leads",
    dot: "bg-sky-500",
    cards: [
      { name: "Rahul Sharma", deal: "Residential Plot", value: "₹25 Lakh" },
      { name: "Vikas Yadav", deal: "2BHK Apartment", value: "₹48 Lakh" },
    ],
  },
  {
    stage: "Qualified",
    dot: "bg-teal-500",
    cards: [{ name: "Aman Verma", deal: "Investment", value: "₹32 Lakh" }],
  },
  {
    stage: "Follow-up",
    dot: "bg-amber-500",
    cards: [
      { name: "Priya Singh", deal: "Commercial Space", value: "₹45 Lakh" },
      { name: "Rohit Jain", deal: "Office Unit", value: "₹72 Lakh" },
    ],
  },
  {
    stage: "Negotiation",
    dot: "bg-violet-500",
    cards: [{ name: "Sneha Kapoor", deal: "Villa", value: "₹1.2 Cr" }],
  },
  {
    stage: "Won",
    dot: "bg-emerald-500",
    cards: [{ name: "Karan Mehta", deal: "3BHK Apartment", value: "₹85 Lakh" }],
  },
];

const FOLLOW_UPS: { name: string; action: string; time: string; icon: LucideIcon; tone: string }[] = [
  { name: "Rahul Sharma", action: "Call", time: "11:30 AM", icon: Phone, tone: "bg-sky-50 text-sky-600" },
  { name: "Priya Singh", action: "WhatsApp", time: "1:00 PM", icon: MessageCircle, tone: "bg-emerald-50 text-emerald-600" },
  { name: "Aman Verma", action: "Call", time: "3:30 PM", icon: Phone, tone: "bg-sky-50 text-sky-600" },
];

const TEAM = [
  { name: "Amit Kumar", role: "Sales Executive", leads: 12 },
  { name: "Neha Singh", role: "Team Leader", leads: 18 },
  { name: "Rahul Gupta", role: "Sales Executive", leads: 9 },
];

const REPORT = [
  { label: "New", value: 186, bar: "bg-sky-500" },
  { label: "Qualified", value: 92, bar: "bg-teal-500" },
  { label: "Follow-up", value: 74, bar: "bg-amber-500" },
  { label: "Won", value: 28, bar: "bg-emerald-500" },
];
const REPORT_MAX = Math.max(...REPORT.map((r) => r.value));

const AVATAR_TONES = [
  "bg-teal-100 text-teal-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];

function Avatar({ name, size = "h-7 w-7 text-[11px]" }: { name: string; size?: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
  const tone = AVATAR_TONES[name.length % AVATAR_TONES.length];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${tone} ${size}`}>
      {initials}
    </span>
  );
}

function Badge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${STATUS_BADGE[status]}`}>
      {status}
    </span>
  );
}

/** White panel inside the mockup, with the caption explaining what that area is for. */
function Panel({ title, caption, className = "", children }: { title: string; caption: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{caption}</p>
      </div>
      {children}
    </div>
  );
}

/** Looks like a form select; it's a div, so there is nothing to open. */
function FakeSelect({ label, value, avatar }: { label: string; value: string; avatar?: boolean }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium text-slate-500">{label}</p>
      <div className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800">
        {avatar && <Avatar name={value} size="h-5 w-5 text-[9px]" />}
        <span className="flex-1 truncate">{value}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </div>
    </div>
  );
}

function DashboardScreen() {
  return (
    <div className="flex min-w-0">
      {/* Sidebar */}
      <aside className="hidden w-48 shrink-0 border-r border-slate-200 bg-slate-50/80 p-3 md:block">
        <div className="mb-4 flex items-center gap-2 px-2 py-1">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-teal-700 text-[11px] font-bold text-white">
            CB
          </span>
          <span className="text-sm font-bold text-slate-900">ChatBoatAI</span>
        </div>
        <ul className="space-y-0.5">
          {SIDEBAR.map(({ label, icon: Icon }, i) => (
            <li
              key={label}
              className={`flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium ${
                i === 0 ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200/60"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </li>
          ))}
        </ul>
      </aside>

      <div className="min-w-0 flex-1 bg-slate-50/40 p-3 sm:p-5">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-slate-900">Dashboard</p>
            <p className="text-xs text-slate-500">Good morning, Neha - here&apos;s today at a glance.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden h-9 w-48 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-400 lg:flex">
              <Search className="h-3.5 w-3.5" /> Search leads, contacts…
            </div>
            <span className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
            </span>
            <Avatar name="Neha Singh" size="h-9 w-9 text-xs" />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
              <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{s.value}</p>
              <p className={`mt-0.5 text-[11px] font-medium ${s.tone}`}>{s.delta}</p>
            </div>
          ))}
        </div>

        {/* Lead table */}
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Recent Leads</p>
            <span className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white">+ Add Lead</span>
          </div>
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-semibold">Name</th>
                <th className="hidden px-4 py-2 font-semibold sm:table-cell">Phone</th>
                <th className="hidden px-4 py-2 font-semibold lg:table-cell">Source</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="hidden px-4 py-2 font-semibold md:table-cell">Assigned To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {LEADS.map((l) => (
                <tr key={l.name} className="hover:bg-slate-50/80">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2 font-medium text-slate-900">
                      <Avatar name={l.name} /> <span className="truncate">{l.name}</span>
                    </span>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-2.5 text-slate-600 sm:table-cell">{l.phone}</td>
                  <td className="hidden px-4 py-2.5 text-slate-600 lg:table-cell">{l.source}</td>
                  <td className="px-4 py-2.5">
                    <Badge status={l.status} />
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-2.5 text-slate-600 md:table-cell">{l.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PipelinePanel() {
  return (
    <Panel title="Sales Pipeline" caption="See every deal and the stage it's in" className="md:col-span-2 lg:col-span-4">
      <div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {PIPELINE.map((col) => (
            <div key={col.stage} className="rounded-lg bg-slate-50 p-2.5">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                {col.stage}
                <span className="ml-auto text-slate-400">{col.cards.length}</span>
              </p>
              <div className="space-y-2">
                {col.cards.map((c) => (
                  <div key={c.name} className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md">
                    <p className="text-[13px] font-semibold text-slate-900">{c.name}</p>
                    <p className="text-[11px] text-slate-500">{c.deal}</p>
                    <p className="mt-1.5 text-xs font-semibold text-teal-700">{c.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function AssignPanel() {
  return (
    <Panel title="Assign Lead" caption="Hand every lead to the right person">
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 p-2.5">
          <Avatar name="Rahul Sharma" size="h-8 w-8 text-xs" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Rahul Sharma</p>
            <p className="text-[11px] text-slate-500">Property Inquiry · ₹25 Lakh</p>
          </div>
          <span className="ml-auto">
            <Badge status="New" />
          </span>
        </div>
        <FakeSelect label="Assign To" value="Amit Kumar" avatar />
        <FakeSelect label="Team" value="Sales Team" />
        {/* Decorative only: a styled span, not a button - it can't be clicked or focused. */}
        <span className="mt-1 flex h-9 cursor-default items-center justify-center rounded-lg bg-teal-600 text-sm font-semibold text-white transition-colors hover:bg-teal-700">
          Assign Lead
        </span>
      </div>
    </Panel>
  );
}

function FollowUpPanel() {
  return (
    <Panel title="Today's Follow-ups" caption="Never miss a call or a WhatsApp reply">
      <ul className="space-y-2">
        {FOLLOW_UPS.map(({ name, action, time, icon: Icon, tone }) => (
          <li key={name} className="flex items-center gap-2.5 rounded-lg border border-slate-100 p-2.5">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{name}</p>
              <p className="text-[11px] text-slate-500">
                {action} at {time}
              </p>
            </div>
            <span className="h-4 w-4 rounded border border-slate-300" />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function TeamPanel() {
  return (
    <Panel title="Sales Team" caption="Manage team members and their workload">
      <ul className="space-y-2.5">
        {TEAM.map((m) => (
          <li key={m.name} className="flex items-center gap-2.5">
            <Avatar name={m.name} size="h-8 w-8 text-xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{m.name}</p>
              <p className="text-[11px] text-slate-500">{m.role}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{m.leads} Leads</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function ReportPanel() {
  return (
    <Panel title="Lead Overview" caption="Reports on your pipeline at a glance">
      <div className="space-y-3">
        {REPORT.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-medium text-slate-600">{r.label}</span>
              <span className="font-semibold text-slate-900">{r.value}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className={`h-2 rounded-full ${r.bar}`} style={{ width: `${(r.value / REPORT_MAX) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** The full static CRM mockup: a dashboard "screenshot" plus feature panels. */
export function CrmShowcase() {
  return (
    <div>
      <p className="sr-only">
        Illustration of the ChatBoatAI CRM with sample data: a dashboard with lead counts, a recent leads table,
        lead assignment, a sales pipeline, today&apos;s follow-ups, the sales team and a lead overview report.
      </p>
      <div aria-hidden="true" className="select-none">
        {/* App window */}
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl shadow-black/40 ring-1 ring-white/5">
          <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-100 px-4 py-2.5">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="mx-auto w-full max-w-xs truncate rounded-md bg-white px-3 py-1 text-center text-[11px] text-slate-400 ring-1 ring-slate-200">
              app.chatboatai.in/dashboard
            </div>
            <span className="w-12" />
          </div>
          <DashboardScreen />
        </div>

        {/* Feature panels */}
        <div className="mt-4 grid gap-4 rounded-2xl bg-slate-100 p-3 ring-1 ring-white/10 sm:p-4 md:grid-cols-2 lg:grid-cols-4">
          <PipelinePanel />
          <AssignPanel />
          <FollowUpPanel />
          <TeamPanel />
          <ReportPanel />
        </div>
      </div>
    </div>
  );
}
