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

// ─── Types ─────────────────────────────────────────────────────────────────

type Thread = { id: string; unreadCount: number; updatedAt: string; preview: string };

// ─── Mock data ──────────────────────────────────────────────────────────────

const MOCK_EARNINGS = [
  { month: "J", amount: 2400 },
  { month: "F", amount: 3100 },
  { month: "M", amount: 2800 },
  { month: "A", amount: 4200 },
  { month: "M", amount: 3900 },
  { month: "J", amount: 5100 },
];

const MOCK_SKILLS = [
  { label: "React", level: 92 },
  { label: "Node.js", level: 85 },
  { label: "TypeScript", level: 88 },
  { label: "PostgreSQL", level: 78 },
  { label: "Docker", level: 65 },
];

const MOCK_PROJECTS = [
  { id: "1", title: "E-commerce Storefront", status: "Live", tech: ["Next.js", "Stripe"], views: 284, saves: 31 },
  { id: "2", title: "SaaS Analytics Dashboard", status: "Live", tech: ["React", "D3.js"], views: 196, saves: 18 },
  { id: "3", title: "Mobile Booking App", status: "Draft", tech: ["Flutter", "Firebase"], views: 0, saves: 0 },
];

const MOCK_REVIEWS = [
  { id: "r1", client: "Miriam A.", initials: "MA", rating: 5, text: "Delivered on time, clean code, great communication throughout.", date: "2 weeks ago" },
  { id: "r2", client: "Tom R.", initials: "TR", rating: 5, text: "Exactly what we needed. Will hire again without hesitation.", date: "1 month ago" },
  { id: "r3", client: "Priya S.", initials: "PS", rating: 4, text: "Very professional. Minor revision needed but sorted quickly.", date: "2 months ago" },
];

const MOCK_ACTIVITY = [
  { id: "a1", label: "INQ", text: "New inquiry from a client in London", time: "5m ago", hot: true },
  { id: "a2", label: "SAVE", text: "'SaaS Dashboard' was saved by a client", time: "22m ago", hot: false },
  { id: "a3", label: "REV", text: "New 5-star review received", time: "2h ago", hot: false },
  { id: "a4", label: "DEAL", text: "Deal interest on E-commerce project", time: "Yesterday", hot: false },
  { id: "a5", label: "VIEW", text: "Profile viewed 14 times today", time: "Today", hot: false },
];

const MOCK_CALENDAR = [
  { id: "c1", title: "Discovery call — Tom R.", when: "Today · 3:00 PM", accent: "#38bdf8" },
  { id: "c2", title: "Proposal deadline — Miriam A.", when: "Tomorrow · 11:59 PM", accent: "#f87171" },
  { id: "c3", title: "Handoff — Priya S.", when: "Jun 20 · 2:00 PM", accent: "#34d399" },
];

const MOCK_PROFILE = [
  { label: "Bio written", done: true },
  { label: "Profile photo", done: false },
  { label: "3+ projects live", done: true },
  { label: "Hourly rate set", done: true },
  { label: "Skills added", done: true },
  { label: "First testimonial", done: false },
];

// ─── Tokens ─────────────────────────────────────────────────────────────────
// Background: #0d0d0f  Surface: #141417  Border: #242428
// Accent: #7c6fff (violet)  Green: #22c55e  Amber: #f59e0b  Red: #ef4444
// Text-primary: #f4f4f5  Text-secondary: #71717a  Text-muted: #3f3f46

// ─── Shared atoms ───────────────────────────────────────────────────────────

function Pill({ children, color = "neutral" }: { children: React.ReactNode; color?: "violet" | "green" | "amber" | "red" | "neutral" }) {
  const c = {
    violet: "bg-violet-950/60 text-violet-300 border-violet-800/60",
    green: "bg-emerald-950/60 text-emerald-400 border-emerald-800/60",
    amber: "bg-amber-950/60 text-amber-400 border-amber-800/60",
    red: "bg-red-950/60 text-red-400 border-red-800/60",
    neutral: "bg-slate-200/60 text-slate-600 border-zinc-700/60",
  }[color];
  return <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${c}`}>{children}</span>;
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">{children}</p>
  );
}

function Divider() {
  return <div className="my-3 border-t border-slate-200" />;
}

// ─── LEFT: Pipeline ─────────────────────────────────────────────────────────

function Pipeline({ inquiry, proposal, contracts }: { inquiry: Thread[]; proposal: Thread[]; contracts: NotificationItem[] }) {
  const stages = [
    { key: "inquiry", label: "Inquiry", count: inquiry.length, dot: "bg-amber-400", items: inquiry },
    { key: "proposal", label: "Proposal", count: proposal.length, dot: "bg-violet-400", items: proposal },
    { key: "contract", label: "Contract", count: contracts.length, dot: "bg-emerald-400", items: contracts },
  ];

  return (
    <div>
      <PanelLabel>Pipeline</PanelLabel>
      {/* Stage header row */}
      <div className="mb-3 flex items-center gap-0">
        {stages.map((s, i) => (
          <div key={s.key} className="flex flex-1 items-center">
            <div className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{s.label}</span>
              </div>
              <span className="text-xl font-bold text-slate-900">{s.count}</span>
            </div>
            {i < stages.length - 1 && (
              <div className="mx-1 text-slate-400 text-sm">›</div>
            )}
          </div>
        ))}
      </div>

      {/* Thread cards */}
      <div className="space-y-1.5">
        {inquiry.length === 0 && proposal.length === 0 && contracts.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-500">
            No active threads yet. Your pipeline will populate as clients reach out.
          </div>
        )}
        {(inquiry.slice(0, 2)).map((t) => (
          <div key={t.id} className="group flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:border-amber-800/60 hover:bg-slate-50 transition-colors cursor-pointer">
            <span className="mt-0.5 rounded-sm bg-amber-950/80 px-1 py-0.5 text-[9px] font-bold text-amber-400 shrink-0">INQ</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-700 line-clamp-1 font-medium">Thread {t.id.slice(0, 8)}</p>
              <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{t.preview || "No preview"}</p>
            </div>
            <span className="text-[10px] text-slate-500 shrink-0">{t.unreadCount > 0 ? `${t.unreadCount} new` : ""}</span>
          </div>
        ))}
        {(proposal.slice(0, 2)).map((t) => (
          <div key={t.id} className="group flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:border-violet-800/60 hover:bg-slate-50 transition-colors cursor-pointer">
            <span className="mt-0.5 rounded-sm bg-violet-950/80 px-1 py-0.5 text-[9px] font-bold text-violet-400 shrink-0">PRO</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-700 line-clamp-1 font-medium">Thread {t.id.slice(0, 8)}</p>
              <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{t.preview || "No preview"}</p>
            </div>
            <span className="text-[10px] text-slate-500 shrink-0">{new Date(t.updatedAt).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LEFT: Projects ─────────────────────────────────────────────────────────

function Projects({ saved, savedState }: { saved: Array<{ id: string; project: { slug: string; title: string } }>; savedState: string }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <PanelLabel>My projects</PanelLabel>
        <Link href="/developer/projects/new" className="text-[10px] font-semibold text-violet-400 hover:text-violet-300">+ New</Link>
      </div>
      <div className="space-y-1.5">
        {MOCK_PROJECTS.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-semibold text-slate-800 truncate">{p.title}</p>
                <Pill color={p.status === "Live" ? "green" : "neutral"}>{p.status}</Pill>
              </div>
              <div className="mt-1 flex gap-1.5">
                {p.tech.map((t) => <span key={t} className="text-[9px] text-slate-500 bg-slate-200 rounded px-1.5 py-0.5">{t}</span>)}
                {p.status === "Live" && <span className="ml-auto text-[9px] text-slate-500">{p.views}v · {p.saves}s</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {saved.length > 0 && (
        <>
          <Divider />
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Saved opportunities</span>
            <Link href="/projects" className="text-[10px] text-violet-400 hover:text-violet-300">Browse</Link>
          </div>
          {savedState && <p className="text-[10px] text-slate-500 mb-2">{savedState}</p>}
          <div className="space-y-1">
            {saved.map((s) => (
              <a key={s.id} href={`/projects/${s.project.slug}`} className="block rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-medium text-violet-400 hover:text-violet-300 hover:bg-slate-50 transition-colors">
                {s.project.title}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── CENTER: Earnings ────────────────────────────────────────────────────────

function Earnings() {
  const max = Math.max(...MOCK_EARNINGS.map((e) => e.amount));
  const total = MOCK_EARNINGS.reduce((s, e) => s + e.amount, 0);
  const last = MOCK_EARNINGS[MOCK_EARNINGS.length - 1];
  const prev = MOCK_EARNINGS[MOCK_EARNINGS.length - 2];
  const trend = ((last.amount - prev.amount) / prev.amount * 100).toFixed(0);
  const isUp = last.amount >= prev.amount;

  return (
    <div>
      <PanelLabel>Revenue runway</PanelLabel>
      <div className="mb-4 flex items-end gap-4">
        <div>
          <p className="text-3xl font-bold tracking-tight text-slate-900">${total.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">6-month total</p>
        </div>
        <div className={`mb-1 flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold ${isUp ? "bg-emerald-950/60 text-emerald-400" : "bg-red-950/60 text-red-400"}`}>
          <span>{isUp ? "↑" : "↓"}</span>
          <span>{Math.abs(Number(trend))}% MoM</span>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1.5 h-16">
        {MOCK_EARNINGS.map((e) => (
          <div key={e.month} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className="w-full rounded-sm transition-all"
              style={{
                height: `${(e.amount / max) * 100}%`,
                background: e.month === last.month
                  ? "linear-gradient(to top, #7c6fff, #a78bfa)"
                  : "#27272a",
              }}
              title={`$${e.amount}`}
            />
            <span className="text-[9px] font-medium text-slate-500">{e.month}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { label: "Avg/mo", val: `$${Math.round(total / MOCK_EARNINGS.length).toLocaleString()}` },
          { label: "Best mo", val: `$${Math.max(...MOCK_EARNINGS.map(e => e.amount)).toLocaleString()}` },
          { label: "This mo", val: `$${last.amount.toLocaleString()}` },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-center">
            <p className="text-[9px] text-slate-500 uppercase tracking-wide">{item.label}</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5">{item.val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CENTER: Activity ────────────────────────────────────────────────────────

function Activity({ threads }: { threads: Thread[] }) {
  const items = threads.length > 0
    ? threads.map((t) => ({ id: t.id, label: "MSG", text: t.preview || "Thread update", time: new Date(t.updatedAt).toLocaleDateString(), hot: t.unreadCount > 0 }))
    : MOCK_ACTIVITY;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <PanelLabel>Signal stream</PanelLabel>
        <span className="flex items-center gap-1 text-[9px] text-emerald-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>
      <div className="space-y-1">
        {items.slice(0, 7).map((item) => (
          <div key={item.id} className={`flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${item.hot ? "border border-violet-800/40 bg-violet-950/20" : "border border-slate-200 bg-slate-50 hover:bg-white"}`}>
            <span className={`mt-0.5 rounded-sm px-1 py-0.5 text-[9px] font-bold shrink-0 ${item.hot ? "bg-violet-900 text-violet-300" : "bg-slate-200 text-slate-500"}`}>
              {item.label}
            </span>
            <p className="flex-1 min-w-0 text-[11px] text-slate-600 line-clamp-1">{item.text}</p>
            <span className="text-[9px] text-slate-400 shrink-0 whitespace-nowrap">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CENTER: Reviews ─────────────────────────────────────────────────────────

function Reviews() {
  const avg = (MOCK_REVIEWS.reduce((s, r) => s + r.rating, 0) / MOCK_REVIEWS.length).toFixed(1);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <PanelLabel>Client reviews</PanelLabel>
        <div className="flex items-center gap-1.5">
          <span className="text-amber-400 text-xs">★</span>
          <span className="text-xs font-bold text-slate-800">{avg}</span>
          <span className="text-[10px] text-slate-500">/ {MOCK_REVIEWS.length} reviews</span>
        </div>
      </div>
      <div className="space-y-2">
        {MOCK_REVIEWS.map((r) => (
          <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0">{r.initials}</div>
              <span className="text-[11px] font-semibold text-slate-700">{r.client}</span>
              <span className="ml-auto text-[10px] text-amber-400">{"★".repeat(r.rating)}</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">{r.text}</p>
            <p className="mt-1.5 text-[9px] text-slate-400">{r.date}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RIGHT: Availability ─────────────────────────────────────────────────────

function Availability() {
  const [status, setStatus] = useState<"open" | "busy" | "away">("open");
  const opts = [
    { val: "open" as const, label: "Open", dot: "bg-emerald-400", active: "border-emerald-700 bg-emerald-950/40 text-emerald-300" },
    { val: "busy" as const, label: "Busy", dot: "bg-amber-400", active: "border-amber-700 bg-amber-950/40 text-amber-300" },
    { val: "away" as const, label: "Away", dot: "bg-zinc-500", active: "border-zinc-600 bg-slate-200 text-slate-700" },
  ];
  const cur = opts.find((o) => o.val === status)!;

  return (
    <div>
      <PanelLabel>Availability</PanelLabel>
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
        <span className={`h-2 w-2 rounded-full ${cur.dot}`} />
        <span className="text-xs font-semibold text-slate-800 capitalize">{status === "open" ? "Open to work" : status}</span>
        <span className="ml-auto text-[9px] text-slate-500">Visible to clients</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {opts.map((o) => (
          <button
            key={o.val}
            onClick={() => setStatus(o.val)}
            className={`rounded-lg border py-2 text-[11px] font-semibold transition-colors ${status === o.val ? o.active : "border-slate-200 bg-white text-slate-500 hover:text-slate-600 hover:border-slate-300"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── RIGHT: Profile ring + checklist ─────────────────────────────────────────

function ProfileReadiness() {
  const done = MOCK_PROFILE.filter((i) => i.done).length;
  const pct = Math.round((done / MOCK_PROFILE.length) * 100);

  return (
    <div>
      <PanelLabel>Profile readiness</PanelLabel>
      <div className="mb-3 flex items-center gap-3">
        {/* ring */}
        <div className="relative h-14 w-14 shrink-0">
          <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
            <circle cx="18" cy="18" r="14" fill="none" stroke="#27272a" strokeWidth="3.5" />
            <circle
              cx="18" cy="18" r="14" fill="none"
              stroke="#7c6fff" strokeWidth="3.5"
              strokeDasharray={`${(pct / 100) * 87.96} ${87.96 - (pct / 100) * 87.96}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-slate-800">{pct}%</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-700">{done}/{MOCK_PROFILE.length} complete</p>
          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">Complete your profile to rank higher in search.</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {MOCK_PROFILE.map((item) => (
          <div key={item.label} className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 ${item.done ? "opacity-50" : "border border-slate-200 bg-white"}`}>
            <span className={`h-3.5 w-3.5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${item.done ? "bg-emerald-900 text-emerald-400" : "bg-slate-200 text-slate-500"}`}>
              {item.done ? "✓" : "○"}
            </span>
            <span className={`text-[11px] ${item.done ? "text-slate-500 line-through" : "text-slate-600"}`}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RIGHT: Discovery score ───────────────────────────────────────────────────

function DiscoveryScore() {
  const score = 74;
  return (
    <div>
      <PanelLabel>Discovery score</PanelLabel>
      <div className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-500">Ranking strength</span>
          <span className="text-xs font-bold text-slate-800">{score}<span className="text-slate-500">/100</span></span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-200">
          <div
            className="h-1.5 rounded-full"
            style={{ width: `${score}%`, background: "linear-gradient(to right, #7c6fff, #818cf8)" }}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        {[
          "Add a profile video (+2× visibility)",
          "Reply within 24h to all inquiries",
          "Publish at least one live demo link",
        ].map((tip) => (
          <div key={tip} className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
            <span className="mt-0.5 text-amber-500 text-[10px] shrink-0">→</span>
            <p className="text-[10px] text-slate-500 leading-relaxed">{tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RIGHT: Skills ────────────────────────────────────────────────────────────

function Skills() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <PanelLabel>Skill stack</PanelLabel>
        <button className="text-[10px] text-violet-400 hover:text-violet-300">Edit</button>
      </div>
      <div className="space-y-2.5">
        {MOCK_SKILLS.map((s) => (
          <div key={s.label}>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-slate-600 font-medium">{s.label}</span>
              <span className="text-slate-400">{s.level}</span>
            </div>
            <div className="h-px w-full bg-slate-200 relative">
              <div
                className="h-px absolute top-0 left-0"
                style={{ width: `${s.level}%`, background: "linear-gradient(to right, #7c6fff88, #7c6fff)" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RIGHT: Upcoming ─────────────────────────────────────────────────────────

function Upcoming() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <PanelLabel>Upcoming</PanelLabel>
        <button className="text-[10px] text-violet-400 hover:text-violet-300">+ Add</button>
      </div>
      <div className="space-y-1.5">
        {MOCK_CALENDAR.map((c) => (
          <div key={c.id} className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2.5">
            <div className="mt-0.5 h-2 w-2 rounded-full shrink-0" style={{ background: c.accent }} />
            <div>
              <p className="text-[11px] font-medium text-slate-700">{c.title}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{c.when}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RIGHT: Quick actions ─────────────────────────────────────────────────────

function Actions({ onLogout, onLogoutEverywhere, pending }: { onLogout: () => void; onLogoutEverywhere: () => void; pending: boolean }) {
  const links = [
    { label: "Browse projects", href: "/projects" },
    { label: "Edit profile", href: "/developers/settings" },
    { label: "New project", href: "/developer/projects/new" },
    { label: "Messages", href: "/developer/messages" },
    { label: "Client workspace", href: "/client/dashboard" },
    { label: "Admin panel", href: "/admin/dashboard" },
  ];
  return (
    <div>
      <PanelLabel>Quick nav</PanelLabel>
      <div className="grid grid-cols-2 gap-1">
        {links.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-medium text-slate-600 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            {a.label}
          </Link>
        ))}
        <button
          disabled={pending}
          onClick={onLogout}
          className="rounded-lg border border-red-900/60 bg-red-950/30 px-2.5 py-2 text-[11px] font-medium text-red-500 hover:bg-red-950/60 transition-colors disabled:opacity-40"
        >
          {pending ? "Signing out…" : "Sign out"}
        </button>
        <button
          disabled={pending}
          onClick={onLogoutEverywhere}
          className="rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-medium text-slate-500 hover:text-red-500 hover:border-red-900/60 transition-colors disabled:opacity-40"
        >
          All devices
        </button>
      </div>
    </div>
  );
}

// ─── TOP: Metric bar ─────────────────────────────────────────────────────────

function MetricBar({
  unread, threads, deals, conversion, saved,
}: { unread: number; threads: number; deals: number; conversion: number; saved: number }) {
  const metrics = [
    { label: "Unread messages", val: unread, sub: `in ${threads} threads`, accent: "#7c6fff" },
    { label: "Deal signals", val: deals, sub: "contract-interest", accent: "#34d399" },
    { label: "Conversion", val: `${conversion}%`, sub: "deals per thread", accent: "#f59e0b" },
    { label: "Saved projects", val: saved, sub: "shortlisted", accent: "#38bdf8" },
    { label: "Profile views", val: "—", sub: "connect analytics", accent: "#a1a1aa" },
  ];

  return (
    <div className="grid grid-cols-5 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {metrics.map((m) => (
        <div key={m.label} className="px-4 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">{m.label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tracking-tight" style={{ color: typeof m.val === "number" && m.val > 0 ? m.accent : undefined }}>
            {m.val}
          </p>
          <p className="text-[9px] text-slate-500 mt-0.5">{m.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DeveloperDashboardPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | undefined>(undefined);
  const [pendingLogout, setPendingLogout] = useState(false);
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
        setSavedState("Loading…");
        const items = await getSavedProjects();
        setSavedProjects(items.map((i) => ({ id: i.id, project: i.project })));
        setSavedState(items.length ? "" : "No saved projects yet.");
      } catch (e) { setSavedState(e instanceof Error ? e.message : "Failed."); }
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
      } catch (e) { setAnalyticsState(e instanceof Error ? e.message : "Failed."); }
    }
    void loadSaved();
    void loadAnalytics();
  }, [hasSession]);

  async function onLogout() { setPendingLogout(true); await logout(); router.replace("/login"); }
  async function onLogoutEverywhere() { setPendingLogout(true); await logoutEverywhere(); router.replace("/login"); }

  const conversionRate = useMemo(() => (threadCount === 0 ? 0 : Math.round((dealInterestCount / threadCount) * 100)), [dealInterestCount, threadCount]);
  const spotlightThreads = useMemo(
    () => [...inquiryThreads, ...proposalThreads].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5),
    [inquiryThreads, proposalThreads],
  );

  if (!hasSession) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* Subtle noise overlay for texture */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.012]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "100px" }} />

      <DeveloperDashboardNavbar onSignOut={onLogout} onSignOutEverywhere={onLogoutEverywhere} pendingSignOut={pendingLogout} />

      <div className="mx-auto w-full max-w-[1600px] px-4 pb-12 pt-4 md:px-6">

        {/* ── Page header ── */}
        <div className="mb-4 flex items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Developer workspace</p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900">Command center</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-medium text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Session active
            </span>
            {analyticsState && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] text-slate-500">{analyticsState}</span>
            )}
          </div>
        </div>

        {/* ── Metric bar ── */}
        <div className="mb-4">
          <MetricBar
            unread={unreadMessageCount}
            threads={threadCount}
            deals={dealInterestCount}
            conversion={conversionRate}
            saved={savedProjects.length}
          />
        </div>

        {/* ── Three-column cockpit ── */}
        <div className="grid gap-3 xl:grid-cols-[280px_1fr_260px] xl:items-start">

          {/* ─ LEFT: work stream ─ */}
          <aside className="space-y-0 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Work stream</p>
            </div>
            <div className="divide-y divide-slate-200">
              <div className="p-4">
                <Pipeline inquiry={inquiryThreads} proposal={proposalThreads} contracts={contractNotifications} />
              </div>
              <div className="p-4">
                <Projects saved={savedProjects} savedState={savedState} />
              </div>
            </div>
          </aside>

          {/* ─ CENTER: performance ─ */}
          <main className="space-y-0 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Performance</p>
            </div>
            <div className="divide-y divide-slate-200">
              <div className="p-4">
                <Earnings />
              </div>
              <div className="p-4">
                <Activity threads={spotlightThreads} />
              </div>
              <div className="p-4">
                <Reviews />
              </div>
            </div>
          </main>

          {/* ─ RIGHT: profile + status ─ */}
          <aside className="space-y-0 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden xl:sticky xl:top-6">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Profile &amp; status</p>
            </div>
            <div className="divide-y divide-slate-200">
              <div className="p-4"><Availability /></div>
              <div className="p-4"><ProfileReadiness /></div>
              <div className="p-4"><DiscoveryScore /></div>
              <div className="p-4"><Skills /></div>
              <div className="p-4"><Upcoming /></div>
              <div className="p-4"><Actions onLogout={onLogout} onLogoutEverywhere={onLogoutEverywhere} pending={pendingLogout} /></div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}