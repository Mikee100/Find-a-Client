import { ReactNode } from "react";

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub: string;
  accent?: string;
}) {
  return (
    <article className={`relative overflow-hidden rounded-2xl border px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.08)] ${accent ?? "border-neutral-200 bg-white"}`}>
      <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-teal-100/60 blur-xl" aria-hidden="true" />
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-neutral-900">{value}</p>
      <p className="text-[11px] text-neutral-500">{sub}</p>
    </article>
  );
}

export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-neutral-200 pb-2">
      <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-neutral-800">{title}</h2>
      {action}
    </div>
  );
}

export function Badge({
  children,
  color = "neutral",
}: {
  children: ReactNode;
  color?: "green" | "amber" | "sky" | "rose" | "neutral";
}) {
  const map = {
    green: "bg-emerald-100 text-emerald-800 border-emerald-300",
    amber: "bg-amber-100 text-amber-800 border-amber-300",
    sky: "bg-sky-100 text-sky-800 border-sky-300",
    rose: "bg-rose-100 text-rose-800 border-rose-300",
    neutral: "bg-neutral-100 text-neutral-700 border-neutral-300",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${map[color]}`}>
      {children}
    </span>
  );
}

export function HeaderMetrics({
  unreadMessageCount,
  threadCount,
  dealInterestCount,
  conversionRate,
  savedProjects,
}: {
  unreadMessageCount: number;
  threadCount: number;
  dealInterestCount: number;
  conversionRate: number;
  savedProjects: number;
}) {
  return (
    <div className="grid gap-3 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_70%)] p-4 md:grid-cols-5 md:p-5">
      <StatCard label="Inbox" value={unreadMessageCount} sub={`Unread in ${threadCount} threads`} accent="border-cyan-200 bg-cyan-50/60" />
      <StatCard label="Deal signals" value={dealInterestCount} sub="Contract-interest notifications" accent="border-emerald-200 bg-emerald-50/60" />
      <StatCard label="Conversion" value={`${conversionRate}%`} sub="Deals signaled / thread" accent="border-indigo-200 bg-indigo-50/60" />
      <StatCard label="Saved projects" value={savedProjects} sub="Shortlisted opportunities" accent="border-amber-200 bg-amber-50/60" />
      <StatCard label="Profile views" value="-" sub="Integrate analytics API" accent="border-neutral-300 bg-neutral-100/70" />
    </div>
  );
}
