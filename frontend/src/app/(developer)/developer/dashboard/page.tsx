"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getAuthSession,
  NotificationItem,
  getMessageThreads,
  getNotifications,
  getSavedProjects,
  logout,
  logoutEverywhere,
} from "@/lib/api";
import DeveloperDashboardNavbar from "@/features/developer/developer-dashboard-navbar";
import {
  Badge,
  HeaderMetrics,
  SectionHeading,
} from "@/features/developer/dashboard/dashboard-ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type Thread = { id: string; unreadCount: number; updatedAt: string; preview: string };
type FocusMode = "pipeline" | "delivery" | "profile";

// ─── Mock / placeholder data (replace with real API calls later) ──────────────

const MOCK_EARNINGS = [
  { month: "Jan", amount: 2400 },
  { month: "Feb", amount: 3100 },
  { month: "Mar", amount: 2800 },
  { month: "Apr", amount: 4200 },
  { month: "May", amount: 3900 },
  { month: "Jun", amount: 5100 },
];

const MOCK_SKILLS = [
  { label: "React", level: 92 },
  { label: "Node.js", level: 85 },
  { label: "PostgreSQL", level: 78 },
  { label: "TypeScript", level: 88 },
  { label: "Docker", level: 65 },
];

const MOCK_PROJECTS = [
  { id: "1", title: "E-commerce Storefront", status: "Live", tech: ["Next.js", "Stripe"], views: 284, saves: 31 },
  { id: "2", title: "SaaS Analytics Dashboard", status: "Live", tech: ["React", "D3"], views: 196, saves: 18 },
  { id: "3", title: "Mobile Booking App", status: "Draft", tech: ["Flutter", "Firebase"], views: 0, saves: 0 },
];

const MOCK_REVIEWS = [
  { id: "r1", client: "Miriam A.", avatar: "MA", rating: 5, text: "Delivered on time, clean code, great communication throughout.", date: "2 weeks ago" },
  { id: "r2", client: "Tom R.", avatar: "TR", rating: 5, text: "Exactly what we needed. Will hire again.", date: "1 month ago" },
  { id: "r3", client: "Priya S.", avatar: "PS", rating: 4, text: "Very professional and responsive. Minor revision needed but sorted quickly.", date: "2 months ago" },
];

const MOCK_ACTIVITY = [
  { id: "a1", icon: "MSG", text: "New inquiry from a client in London", time: "5 min ago", type: "inquiry" },
  { id: "a2", icon: "SAVE", text: "Your project 'SaaS Dashboard' was saved", time: "22 min ago", type: "save" },
  { id: "a3", icon: "REV", text: "New 5-star review received", time: "2 hrs ago", type: "review" },
  { id: "a4", icon: "DEAL", text: "Deal interest signal on E-commerce project", time: "Yesterday", type: "deal" },
  { id: "a5", icon: "VIEW", text: "Profile viewed 14 times today", time: "Today", type: "view" },
];

const MOCK_CALENDAR = [
  { id: "c1", title: "Discovery call — Tom R.", time: "Today, 3:00 PM", type: "call" },
  { id: "c2", title: "Proposal deadline — Miriam A.", time: "Tomorrow, 11:59 PM", type: "deadline" },
  { id: "c3", title: "Project handoff — Priya S.", time: "Jun 20, 2:00 PM", type: "handoff" },
];

const MOCK_PROFILE_COMPLETION = [
  { label: "Bio written", done: true },
  { label: "Profile photo", done: false },
  { label: "3+ projects published", done: true },
  { label: "Hourly rate set", done: true },
  { label: "Skills added", done: true },
  { label: "First testimonial", done: false },
];

// ─── Availability Toggle ──────────────────────────────────────────────────────

function AvailabilityToggle() {
  const [status, setStatus] = useState<"open" | "busy" | "away">("open");
  const options: { value: "open" | "busy" | "away"; label: string; color: string }[] = [
    { value: "open", label: "Open to work", color: "bg-emerald-500" },
    { value: "busy", label: "Busy", color: "bg-amber-500" },
    { value: "away", label: "Away", color: "bg-neutral-400" },
  ];
  const current = options.find((o) => o.value === status)!;
  return (
    <div className="rounded-2xl border border-emerald-200/70 bg-[linear-gradient(160deg,#ecfdf5_0%,#ffffff_60%,#f8fafc_100%)] p-4 shadow-[0_14px_34px_rgba(16,185,129,0.14)]">
      <SectionHeading title="Availability control" />
      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-white/90 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${current.color}`} />
          <span className="text-sm font-semibold text-neutral-800">{current.label}</span>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-emerald-700">Live</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => setStatus(o.value)}
            className={`rounded-lg border py-1.5 text-[11px] font-semibold transition-colors ${
              status === o.value
                ? "border-emerald-500 bg-emerald-100 text-emerald-800"
                : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Mini Earnings Chart ──────────────────────────────────────────────────────

function EarningsChart() {
  const max = Math.max(...MOCK_EARNINGS.map((e) => e.amount));
  const total = MOCK_EARNINGS.reduce((s, e) => s + e.amount, 0);
  const avg = Math.round(total / MOCK_EARNINGS.length);
  const peak = MOCK_EARNINGS.reduce((best, curr) => (curr.amount > best.amount ? curr : best), MOCK_EARNINGS[0]);
  return (
    <div className="overflow-hidden rounded-2xl border border-cyan-200/70 bg-[linear-gradient(160deg,#ecfeff_0%,#ffffff_44%,#f8fafc_100%)] p-4 shadow-[0_14px_34px_rgba(14,116,144,0.15)]">
      <SectionHeading
        title="Revenue runway"
        action={<span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-700">Last 6 months</span>}
      />
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-cyan-200 bg-white/85 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-[0.08em] text-neutral-500">Total</p>
          <p className="text-sm font-bold text-neutral-900">${total.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-cyan-200 bg-white/85 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-[0.08em] text-neutral-500">Avg / mo</p>
          <p className="text-sm font-bold text-neutral-900">${avg.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-cyan-200 bg-white/85 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-[0.08em] text-neutral-500">Peak</p>
          <p className="text-sm font-bold text-neutral-900">{peak.month}</p>
        </div>
      </div>

      <p className="mb-4 mt-2 text-[11px] text-neutral-500">Projected earnings trend. Replace with live billing metrics when available.</p>
      <div className="flex items-end gap-1.5 h-20">
        {MOCK_EARNINGS.map((e) => (
          <div key={e.month} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full cursor-default rounded-t-md bg-linear-to-t from-teal-600 to-cyan-400 transition-colors hover:from-teal-500 hover:to-cyan-300"
              style={{ height: `${(e.amount / max) * 100}%` }}
              title={`$${e.amount}`}
            />
            <span className="text-[10px] font-medium text-neutral-500">{e.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Skill Proficiency ────────────────────────────────────────────────────────

function SkillBars() {
  return (
    <div className="rounded-2xl border border-emerald-200/70 bg-[linear-gradient(165deg,#ecfeff_0%,#ffffff_62%,#f8fafc_100%)] p-4 shadow-[0_14px_34px_rgba(20,184,166,0.14)]">
      <SectionHeading
        title="Skill strength"
        action={
          <button className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-600">Tune</button>
        }
      />
      <ul className="mt-3 space-y-3">
        {MOCK_SKILLS.map((s) => (
          <li key={s.label}>
            <div className="mb-1 flex justify-between text-[11px]">
              <span className="font-medium text-neutral-700">{s.label}</span>
              <span className="text-neutral-400">{s.level}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white">
              <div
                className="h-1.5 rounded-full bg-linear-to-r from-emerald-500 to-cyan-400"
                style={{ width: `${s.level}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Project Showcase Panel ───────────────────────────────────────────────────

function ProjectShowcase() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur">
      <SectionHeading
        title="Active projects"
        action={
          <Link href="/developer/projects/new" className="text-[11px] font-semibold text-teal-700 hover:text-teal-600">
            + New
          </Link>
        }
      />
      <ul className="mt-3 space-y-1.5">
        {MOCK_PROJECTS.map((p) => (
          <li key={p.id} className="rounded-xl border border-neutral-200 bg-neutral-50/80 px-3 py-2.5 transition-colors hover:bg-neutral-100">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-xs font-semibold text-neutral-800">{p.title}</p>
              <Badge color={p.status === "Live" ? "green" : "neutral"}>{p.status}</Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-neutral-500">
              <span className="rounded-md bg-white px-1.5 py-0.5">{p.tech[0]}</span>
              <span className="rounded-md bg-white px-1.5 py-0.5">{p.tech[1]}</span>
              {p.status === "Live" ? <span className="ml-auto">{p.views} views · {p.saves} saves</span> : <span className="ml-auto">Draft</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Reviews Panel ────────────────────────────────────────────────────────────

function ReviewsPanel() {
  const avg = (MOCK_REVIEWS.reduce((s, r) => s + r.rating, 0) / MOCK_REVIEWS.length).toFixed(1);
  return (
    <div className="rounded-2xl border border-indigo-200/70 bg-[linear-gradient(160deg,#eef2ff_0%,#ffffff_48%,#f8fafc_100%)] p-4 shadow-[0_14px_34px_rgba(79,70,229,0.14)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Client sentiment</h2>
          <p className="text-[11px] text-neutral-500">★ {avg} avg · {MOCK_REVIEWS.length} testimonials</p>
        </div>
        <Link href="/developer/reviews" className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-600">View all</Link>
      </div>
      <ul className="space-y-2">
        {MOCK_REVIEWS.map((r) => (
          <li key={r.id} className="rounded-xl border border-indigo-200/70 bg-white/90 p-2.5">
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">{r.avatar}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-neutral-800">{r.client}</p>
                <p className="text-[10px] text-neutral-400">{r.date}</p>
              </div>
              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">{"★".repeat(r.rating)}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-neutral-600">{r.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Profile Completion ───────────────────────────────────────────────────────

function ProfileCompletion() {
  const done = MOCK_PROFILE_COMPLETION.filter((i) => i.done).length;
  const pct = Math.round((done / MOCK_PROFILE_COMPLETION.length) * 100);
  return (
    <div className="rounded-2xl border border-emerald-200/70 bg-[linear-gradient(165deg,#f0fdf4_0%,#ffffff_58%,#f8fafc_100%)] p-4 shadow-[0_14px_34px_rgba(34,197,94,0.14)]">
      <SectionHeading title="Profile optimization" />
      <div className="mt-2 flex items-center gap-3 rounded-xl border border-emerald-200 bg-white/90 px-3 py-2.5">
        <div className="relative h-12 w-12 shrink-0">
          <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke="#0f766e" strokeWidth="3"
              strokeDasharray={`${pct} ${100 - pct}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-neutral-700">{pct}%</span>
        </div>
        <p className="text-[11px] leading-relaxed text-neutral-600">Complete these items to rank higher and convert more profile views.</p>
      </div>
      <ul className="mt-3 space-y-1.5">
        {MOCK_PROFILE_COMPLETION.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-[11px]">
            <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${item.done ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-400"}`}>
              {item.done ? "✓" : "○"}
            </span>
            <span className={item.done ? "text-neutral-600 line-through" : "text-neutral-800"}>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Live Activity Feed ───────────────────────────────────────────────────────

function ActivityFeed({ threads }: { threads: Thread[] }) {
  const typeStyles: Record<string, string> = {
    inquiry: "bg-sky-100 text-sky-700",
    save: "bg-indigo-100 text-indigo-700",
    review: "bg-amber-100 text-amber-700",
    deal: "bg-emerald-100 text-emerald-700",
    view: "bg-neutral-200 text-neutral-700",
    thread: "bg-cyan-100 text-cyan-700",
  };

  const items = threads.length > 0
    ? threads.map((t) => ({ id: t.id, icon: "MSG", text: t.preview, time: new Date(t.updatedAt).toLocaleDateString(), type: "thread" }))
    : MOCK_ACTIVITY;

  return (
    <div className="rounded-2xl border border-amber-200/70 bg-[linear-gradient(170deg,#fff7ed_0%,#ffffff_55%,#f8fafc_100%)] p-4 shadow-[0_14px_34px_rgba(245,158,11,0.15)]">
      <SectionHeading title="Signal stream" action={<Badge color="amber">Realtime</Badge>} />
      <ul className="mt-3 space-y-1.5">
        {items.slice(0, 6).map((item) => (
          <li key={item.id} className="flex items-start gap-2.5 rounded-lg border border-amber-200/70 bg-white/90 px-2.5 py-2 transition-colors hover:bg-amber-50/40">
            <span className={`mt-0.5 inline-flex h-5 min-w-8 items-center justify-center rounded-md px-1 text-[9px] font-bold tracking-[0.06em] ${typeStyles[item.type] ?? typeStyles.thread}`}>
              {item.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="line-clamp-2 text-[11px] leading-relaxed text-neutral-800">{item.text}</p>
              <p className="mt-0.5 text-[10px] font-medium text-amber-700/80">{item.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Upcoming Calendar ────────────────────────────────────────────────────────

function UpcomingCalendar() {
  const typeColor: Record<string, string> = {
    call: "border-l-sky-400",
    deadline: "border-l-rose-400",
    handoff: "border-l-emerald-400",
  };
  return (
    <div className="rounded-2xl border border-sky-200/70 bg-[linear-gradient(165deg,#eff6ff_0%,#ffffff_58%,#f8fafc_100%)] p-4 shadow-[0_14px_34px_rgba(59,130,246,0.14)]">
      <SectionHeading
        title="Upcoming"
        action={<button className="text-[11px] font-semibold text-sky-700 hover:text-sky-600">+ Add</button>}
      />
      <ul className="mt-3 space-y-1.5">
        {MOCK_CALENDAR.map((c) => (
          <li key={c.id} className={`rounded-lg border border-sky-200/70 border-l-4 bg-white/90 px-3 py-2 ${typeColor[c.type]}`}>
            <p className="text-[11px] font-semibold text-neutral-800">{c.title}</p>
            <p className="mt-0.5 text-[10px] text-sky-700/80">{c.time}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Proposal Tracker ────────────────────────────────────────────────────────

function ProposalTracker({ inquiry, proposal, contracts }: { inquiry: Thread[]; proposal: Thread[]; contracts: NotificationItem[] }) {
  const stages = [
    { label: "Inquiry", count: inquiry.length, color: "bg-amber-400", items: inquiry, borderColor: "border-amber-200", bgColor: "bg-amber-50", textColor: "text-amber-900" },
    { label: "Proposal", count: proposal.length, color: "bg-sky-400", items: proposal, borderColor: "border-sky-200", bgColor: "bg-sky-50", textColor: "text-sky-900" },
    { label: "Contract", count: contracts.length, color: "bg-emerald-400", items: contracts, borderColor: "border-emerald-200", bgColor: "bg-emerald-50", textColor: "text-emerald-900" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold text-neutral-900">Pipeline ops</h2>
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-400">Live stages</span>
      </div>
      <div className="space-y-2">
        {stages.map((stage) => (
          <div key={stage.label} className={`rounded-xl border ${stage.borderColor} ${stage.bgColor} p-2.5`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`h-2 w-2 rounded-full ${stage.color}`} />
              <h3 className={`text-[11px] font-semibold uppercase tracking-wide ${stage.textColor}`}>{stage.label}</h3>
              <span className={`ml-auto rounded-md border ${stage.borderColor} bg-white px-1.5 py-0.5 text-[10px] font-bold ${stage.textColor}`}>{stage.count}</span>
            </div>
            <ul className="space-y-1">
              {stage.items.length === 0 && (
                <li className={`rounded-md border ${stage.borderColor} bg-white px-2 py-1.5 text-[11px] ${stage.textColor} opacity-70`}>No items yet.</li>
              )}
              {(stage.items as Array<{ id: string; preview?: string; updatedAt?: string; createdAt?: string; unreadCount?: number; isRead?: boolean }>).slice(0, 3).map((item) => (
                <li key={item.id} className={`rounded-md border ${stage.borderColor} bg-white px-2 py-1.5`}>
                  <p className={`text-[10px] font-semibold ${stage.textColor}`}>
                    {item.preview ? `Thread ${item.id.slice(0, 6)}` : "Deal interest"}
                  </p>
                  <p className={`mt-0.5 line-clamp-1 text-[10px] ${stage.textColor} opacity-75`}>
                    {item.preview ?? new Date(item.createdAt ?? "").toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

function QuickActions({ onLogout, onLogoutEverywhere, pending }: { onLogout: () => void; onLogoutEverywhere: () => void; pending: boolean }) {
  const actions = [
    { label: "Browse projects", href: "/projects", style: "border border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-neutral-100" },
    { label: "My profile", href: "/developer/settings", style: "border border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-neutral-100" },
    { label: "New project", href: "/developer/projects/new", style: "border border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-neutral-100" },
    { label: "Messages", href: "/developer/messages", style: "border border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-neutral-100" },
    { label: "Client workspace", href: "/client/dashboard", style: "bg-teal-700 text-white hover:bg-teal-600" },
    { label: "Admin panel", href: "/admin/dashboard", style: "border border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-neutral-100" },
  ];
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur">
      <SectionHeading title="Action hub" />
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className={`rounded-lg px-2.5 py-2 text-[11px] font-semibold transition-colors ${a.style}`}>
            {a.label}
          </Link>
        ))}
        <button
          disabled={pending}
          onClick={onLogout}
          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11px] font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
        >
          {pending ? "Signing out…" : "Sign out"}
        </button>
        <button
          disabled={pending}
          onClick={onLogoutEverywhere}
          className="rounded-lg border border-rose-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
        >
          Sign out everywhere
        </button>
      </div>
    </div>
  );
}

// ─── Saved Projects ───────────────────────────────────────────────────────────

function SavedProjectsPanel({ projects, state }: { projects: Array<{ id: string; project: { slug: string; title: string } }>; state: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur">
      <SectionHeading
        title="Saved projects"
        action={<Link href="/projects" className="text-[11px] font-semibold text-teal-700 hover:text-teal-600">Browse all</Link>}
      />
      {state && <p className="mt-1 text-[10px] text-neutral-400">{state}</p>}
      {projects.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3 text-[11px] text-neutral-500 text-center">
          No saved projects yet. Browse listings and bookmark opportunities.
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {projects.map((entry) => (
            <li key={entry.id} className="rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-2">
              <a href={`/projects/${entry.project.slug}`} className="text-[11px] font-semibold text-teal-700 hover:text-teal-600">
                {entry.project.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Visibility Score ─────────────────────────────────────────────────────────

function VisibilityScore() {
  const score = 74; // replace with real score later
  const tips = [
    "Add a profile video to boost visibility by 2×",
    "Reply to all inquiries within 24 hours",
    "Publish at least one live demo link",
  ];
  return (
    <div className="rounded-2xl border border-teal-200/70 bg-[linear-gradient(165deg,#f0fdfa_0%,#ffffff_60%,#f8fafc_100%)] p-4 shadow-[0_14px_34px_rgba(13,148,136,0.14)]">
      <SectionHeading title="Discovery score" />
      <div className="mt-3 flex items-center gap-4 rounded-xl border border-teal-200 bg-white/90 px-3 py-2">
        <div className="flex-1">
          <div className="mb-1 flex justify-between text-[11px]">
            <span className="text-neutral-600">Score</span>
            <span className="font-bold text-neutral-800">{score}/100</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white">
            <div className="h-2 rounded-full bg-linear-to-r from-teal-500 to-cyan-400" style={{ width: `${score}%` }} />
          </div>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {tips.map((tip) => (
          <li key={tip} className="flex items-start gap-2 text-[11px] text-neutral-600">
            <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-amber-100 text-[10px] font-bold text-amber-700">i</span>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProfileQuickFixes({ items }: { items: string[] }) {
  return (
    <div className="rounded-2xl border border-amber-200/80 bg-[linear-gradient(165deg,#fffbeb_0%,#ffffff_60%,#f8fafc_100%)] p-3 shadow-[0_10px_24px_rgba(245,158,11,0.12)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700">Quick fixes</p>
        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">{items.length} pending</span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {items.map((label) => (
          <li key={label} className="flex items-center gap-2 rounded-lg border border-amber-200/70 bg-white/90 px-2 py-1.5 text-[11px] text-neutral-700">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-amber-100 text-[10px] font-bold text-amber-700">!</span>
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CommandStrip({
  mode,
  onModeChange,
}: {
  mode: FocusMode;
  onModeChange: (mode: FocusMode) => void;
}) {
  const today = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    weekday: "short",
  });

  const modes: Array<{ key: FocusMode; label: string; style: string; activeStyle: string }> = [
    {
      key: "pipeline",
      label: "Pipeline mode",
      style: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
      activeStyle: "border-sky-500 bg-sky-600 text-white hover:bg-sky-600",
    },
    {
      key: "delivery",
      label: "Delivery mode",
      style: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
      activeStyle: "border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-600",
    },
    {
      key: "profile",
      label: "Optimize profile",
      style: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
      activeStyle: "border-amber-500 bg-amber-500 text-white hover:bg-amber-500",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-300/60 bg-white/85 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.10)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Command strip</p>
          <p className="text-sm font-semibold text-neutral-800">Daily focus • {today}</p>
          <p className="mt-0.5 text-[10px] text-neutral-500">Select a mode to prioritize the matching dashboard lane.</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          {modes.map((entry) => {
            const active = mode === entry.key;
            return (
              <button
                key={entry.key}
                onClick={() => onModeChange(entry.key)}
                className={`rounded-lg border px-2.5 py-1.5 transition-colors ${active ? entry.activeStyle : entry.style}`}
                aria-pressed={active}
              >
                {entry.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DeveloperDashboardPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | undefined>(undefined);
  const [animateIn, setAnimateIn] = useState(false);
  const [pendingLogout, setPendingLogout] = useState(false);
  const [focusMode, setFocusMode] = useState<FocusMode>("pipeline");
  const [savedState, setSavedState] = useState("");
  const [analyticsState, setAnalyticsState] = useState("");
  const [threadCount, setThreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [dealInterestCount, setDealInterestCount] = useState(0);
  const [inquiryThreads, setInquiryThreads] = useState<Thread[]>([]);
  const [proposalThreads, setProposalThreads] = useState<Thread[]>([]);
  const [contractNotifications, setContractNotifications] = useState<NotificationItem[]>([]);
  const [savedProjects, setSavedProjects] = useState<Array<{ id: string; project: { slug: string; title: string } }>>([]);

  useEffect(() => {
    queueMicrotask(() => {
      void getAuthSession()
        .then(() => setHasSession(true))
        .catch(() => { setHasSession(false); router.replace("/login"); });
    });
  }, [router]);

  useEffect(() => {
    if (!hasSession) return;
    async function loadSaved() {
      try {
        setSavedState("Loading saved projects…");
        const items = await getSavedProjects();
        setSavedProjects(items.map((item) => ({ id: item.id, project: item.project })));
        setSavedState(items.length ? "" : "No saved projects yet.");
      } catch (e) {
        setSavedState(e instanceof Error ? e.message : "Failed to load.");
      }
    }
    async function loadAnalytics() {
      try {
        setAnalyticsState("Loading analytics…");
        const [threads, notifications] = await Promise.all([getMessageThreads(), getNotifications(30)]);
        const inquiry = threads.filter((t) => t.unreadCount > 0).map((t) => ({ id: t.id, unreadCount: t.unreadCount, updatedAt: t.updatedAt, preview: t.messages[0]?.content ?? "" }));
        const proposal = threads.filter((t) => t.unreadCount === 0).map((t) => ({ id: t.id, unreadCount: t.unreadCount, updatedAt: t.updatedAt, preview: t.messages[0]?.content ?? "" }));
        const contracts = notifications.filter((n) => n.type === "DEAL_INTEREST");
        setThreadCount(threads.length);
        setUnreadMessageCount(threads.reduce((s, t) => s + t.unreadCount, 0));
        setDealInterestCount(contracts.length);
        setInquiryThreads(inquiry);
        setProposalThreads(proposal);
        setContractNotifications(contracts);
        setAnalyticsState("");
      } catch (e) {
        setAnalyticsState(e instanceof Error ? e.message : "Failed to load analytics.");
      }
    }
    void loadSaved();
    void loadAnalytics();
  }, [hasSession]);

  useEffect(() => {
    const id = window.setTimeout(() => setAnimateIn(true), 40);
    return () => window.clearTimeout(id);
  }, []);

  async function onLogout() { setPendingLogout(true); await logout(); router.replace("/login"); }
  async function onLogoutEverywhere() { setPendingLogout(true); await logoutEverywhere(); router.replace("/login"); }

  const conversionRate = useMemo(() => (threadCount === 0 ? 0 : Math.round((dealInterestCount / threadCount) * 100)), [dealInterestCount, threadCount]);

  const spotlightThreads = useMemo(
    () => [...inquiryThreads, ...proposalThreads].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5),
    [inquiryThreads, proposalThreads],
  );

  const hottestLead = spotlightThreads[0];
  const pendingProfileTasks = useMemo(
    () => MOCK_PROFILE_COMPLETION.filter((item) => !item.done).map((item) => item.label).slice(0, 4),
    [],
  );

  if (!hasSession) return null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_8%,#dbeafe_0%,#eef2ff_20%,#f8fafc_42%,#f1f5f9_100%)]">
      <DeveloperDashboardNavbar onSignOut={onLogout} onSignOutEverywhere={onLogoutEverywhere} pendingSignOut={pendingLogout} />

      <section className="mx-auto w-full max-w-[1500px] space-y-4 p-4 md:p-6">

        {/* ── Hero header card ── */}
        <div className="overflow-hidden rounded-3xl border border-slate-300/60 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur">
          <div className="relative border-b border-slate-200 bg-[linear-gradient(115deg,#0b1220_0%,#134e4a_36%,#0f766e_64%,#155e75_100%)] p-5 text-white md:p-6">
            <div className="absolute -right-14 -top-14 h-48 w-48 rounded-full bg-white/20 blur-3xl" aria-hidden="true" />
            <div className="absolute -left-8 bottom-0 h-24 w-40 rounded-full bg-cyan-300/20 blur-3xl" aria-hidden="true" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/90">Developer Control Center</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Command your pipeline, projects, and growth.</h1>
                <p className="mt-2 max-w-2xl text-sm text-cyan-100/90">Daily operations dashboard for managing active leads, portfolio traction, and profile readiness in one place.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                <span className="rounded-full border border-white/40 bg-white/15 px-3 py-1">Role: Developer</span>
                <span className="rounded-full border border-white/40 bg-white/15 px-3 py-1">Session: Active</span>
                {analyticsState && <span className="rounded-full border border-white/40 bg-white/15 px-3 py-1 text-cyan-100">{analyticsState}</span>}
              </div>
            </div>
          </div>
          <HeaderMetrics
            unreadMessageCount={unreadMessageCount}
            threadCount={threadCount}
            dealInterestCount={dealInterestCount}
            conversionRate={conversionRate}
            savedProjects={savedProjects.length}
          />
        </div>

        <CommandStrip mode={focusMode} onModeChange={setFocusMode} />

        {/* ── Main content grid (Left / Center / Right) ── */}
        <div className="grid gap-3 xl:grid-cols-[1fr_1.2fr_1fr] xl:items-start">

          {/* Left column: pipeline + work assets */}
          <div className={`space-y-3 rounded-2xl p-1 transition-all duration-500 ${animateIn ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"} ${focusMode === "pipeline" ? "ring-2 ring-indigo-300/70" : "opacity-70 saturate-[0.9]"}`}>
            <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
              Workstream
            </div>
            {focusMode === "pipeline" && (
              <div className="rounded-xl border border-indigo-300/70 bg-white/90 px-3 py-2 shadow-[0_8px_20px_rgba(99,102,241,0.15)]">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-700">Lead spotlight</p>
                  <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800">{inquiryThreads.length} active inquiries</span>
                </div>
                <p className="mt-1 text-[11px] text-neutral-700">{hottestLead?.preview || "No fresh inquiry yet. Keep profile active to attract new leads."}</p>
              </div>
            )}
            <ProposalTracker inquiry={inquiryThreads} proposal={proposalThreads} contracts={contractNotifications} />
            <QuickActions onLogout={onLogout} onLogoutEverywhere={onLogoutEverywhere} pending={pendingLogout} />
            <ProjectShowcase />
            <SavedProjectsPanel projects={savedProjects} state={savedState} />
          </div>

          {/* Center column: performance + momentum */}
          <div className={`space-y-3 rounded-2xl p-1 transition-all delay-75 duration-500 ${animateIn ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"} ${focusMode === "delivery" ? "ring-2 ring-cyan-300/70" : "opacity-70 saturate-[0.9]"}`}>
            <div className="rounded-xl border border-cyan-200/70 bg-cyan-50/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-700">
              Performance
            </div>
            {focusMode === "delivery" && (
              <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-cyan-300/70 bg-white/90 p-2 shadow-[0_8px_20px_rgba(14,116,144,0.14)]">
                <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1.5 text-center">
                  <p className="text-[10px] text-neutral-500">Unread</p>
                  <p className="text-xs font-bold text-cyan-800">{unreadMessageCount}</p>
                </div>
                <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1.5 text-center">
                  <p className="text-[10px] text-neutral-500">Deals</p>
                  <p className="text-xs font-bold text-cyan-800">{dealInterestCount}</p>
                </div>
                <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1.5 text-center">
                  <p className="text-[10px] text-neutral-500">Conversion</p>
                  <p className="text-xs font-bold text-cyan-800">{conversionRate}%</p>
                </div>
              </div>
            )}
            <EarningsChart />
            <ActivityFeed threads={spotlightThreads} />
            <ReviewsPanel />
          </div>

          {/* Right column: profile + readiness */}
          <div className={`space-y-3 rounded-2xl p-1 transition-all delay-150 duration-500 ${animateIn ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"} ${focusMode === "profile" ? "ring-2 ring-emerald-300/70" : "opacity-70 saturate-[0.9]"}`}>
            <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Readiness
            </div>

            <div className="space-y-3 xl:sticky xl:top-24">
              {focusMode === "profile" && <ProfileQuickFixes items={pendingProfileTasks} />}
              <AvailabilityToggle />
              <ProfileCompletion />
              <VisibilityScore />
            </div>

            <SkillBars />
            <UpcomingCalendar />
          </div>
        </div>

      </section>
    </main>
  );
}

