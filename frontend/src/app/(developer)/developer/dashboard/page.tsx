"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Eye,
  FolderKanban,
  Heart,
  LayoutGrid,
  MessageSquare,
  Settings,
  Sparkles,
  UserCircle2,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  CurrentUserProfile,
  getAuthSession,
  getCurrentUserProfile,
  getProfileCompleteness,
  getMyProjects,
  getMessageThreads,
  getNotifications,
  getSavedProjects,
  listProjectsPaginated,
  logout,
  logoutEverywhere,
  MyProjectListItem,
  NotificationItem,
  ProjectListItem,
  ProfileCompleteness,
  ThreadSummary,
} from "@/lib/api";
import DeveloperDashboardNavbar from "@/features/developer/developer-dashboard-navbar";

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  unread?: boolean;
};

type RecommendationItem = {
  project: ProjectListItem;
  match: number;
  matchedSkills: string[];
};

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  active?: boolean;
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutGrid, href: "/developer/dashboard", active: true },
  { label: "My Profile", icon: UserCircle2, href: "/developers/profile" },
  { label: "Portfolio", icon: FolderKanban, href: "/developer/projects" },
  { label: "Projects", icon: Briefcase, href: "/projects" },
  { label: "Messages", icon: MessageSquare, href: "/developer/messages" },
  { label: "Analytics", icon: Zap, href: "/developer/dashboard#analytics" },
  { label: "AI Match", icon: Sparkles, href: "/developer/dashboard#ai-match" },
  { label: "Saved Clients", icon: Users, href: "/developer/dashboard#saved-clients" },
  { label: "Notifications", icon: Bell, href: "/developer/dashboard#notifications" },
  { label: "Settings", icon: Settings, href: "/developers/settings" },
  { label: "Help", icon: CircleHelp, href: "/developer/dashboard#help" },
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatProjectStatus(status: "DRAFT" | "PUBLISHED" | "ARCHIVED"): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatPrice(project: ProjectListItem): string {
  if (project.pricingType === "FREE") {
    return "Free";
  }
  if (project.pricingType === "NEGOTIABLE") {
    return "Negotiable";
  }
  if (project.pricingType === "CONTACT") {
    return "Contact";
  }

  const numeric = typeof project.price === "string" ? Number(project.price) : project.price;
  if (!Number.isFinite(numeric)) {
    return "Fixed";
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: project.currency,
    maximumFractionDigits: 0,
  }).format(Number(numeric));
}

function DashboardBrand() {
  return (
    <Link href="/" className="inline-flex items-center gap-2">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">
        FC
      </span>
      <span className="text-lg font-semibold tracking-tight text-slate-900">Find a Client</span>
    </Link>
  );
}

function AnimatedCard({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Sidebar({
  open,
  collapsed,
  onClose,
  onToggleCollapsed,
}: {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapsed: () => void;
}) {
  return (
    <>
      <aside
        className={`relative hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white lg:py-5 ${
          collapsed ? "lg:w-20 lg:px-2" : "lg:w-56 lg:px-3"
        }`}
      >
        <div className={`mb-5 ${collapsed ? "flex justify-center" : "px-2"}`}>
          {collapsed ? (
            <Link href="/" className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white" aria-label="Go to home">
              FC
            </Link>
          ) : (
            <DashboardBrand />
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapsed}
          className="absolute right-0 top-18 z-20 flex h-8 w-8 translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                item.active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              } ${collapsed ? "justify-center px-2" : ""}`}
            >
              <item.icon className="h-4 w-4" />
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          ))}
        </nav>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close sidebar overlay"
            className="absolute inset-0 bg-slate-950/40"
            onClick={onClose}
          />
          <aside className="relative h-full w-64 border-r border-slate-200 bg-white px-4 py-5">
            <div className="mb-5 flex items-center justify-between px-2">
              <DashboardBrand />
              <button
                onClick={onClose}
                className="rounded-md border border-slate-200 p-1.5 text-slate-600"
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    item.active
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function StatCard({
  title,
  value,
  trend,
  subtitle,
  delay,
}: {
  title: string;
  value: string;
  trend: string;
  subtitle: string;
  delay: number;
}) {
  return (
    <AnimatedCard delay={delay}>
      <article className="group min-w-[170px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="truncate text-xs font-medium text-slate-600">{title}</p>
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{trend}</span>
        </div>
        <p className="text-xl font-semibold leading-tight tracking-tight text-slate-900">{value}</p>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{subtitle}</p>
      </article>
    </AnimatedCard>
  );
}

function Hero({
  name,
  unread,
  profileViews,
  messages,
  completeness,
}: {
  name: string;
  unread: number;
  profileViews: number;
  messages: number;
  completeness: ProfileCompleteness;
}) {
  const completion = Math.max(0, Math.min(100, completeness.percentage));
  const dash = `${(completion / 100) * 87.96} ${87.96 - (completion / 100) * 87.96}`;
  const guidance = completeness.nextAction ?? (completeness.missingFields[0] ? `Complete ${completeness.missingFields[0]}` : "Your profile is fully optimized");
  const completionSummary = `${completeness.completedFields}/${completeness.totalFields} fields completed`;
  const missingSummary =
    completeness.missingFields.length > 0
      ? `Missing: ${completeness.missingFields.slice(0, 2).join(" • ")}`
      : "No missing profile fields";

  return (
    <AnimatedCard className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" delay={0.05}>
      <div className="grid gap-6 lg:grid-cols-[1fr_210px]">
        <div>
          <p className="text-sm font-medium text-slate-500">Good Morning, {name}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Welcome back.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Your profile received more attention today. You have {unread} new inquiries, {profileViews} profile views, and {messages} client messages.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">Profile completion</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="relative h-16 w-16 shrink-0">
              <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#E5E7EB" strokeWidth="3.5" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="3.5"
                  strokeDasharray={dash}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-900">
                {completion}%
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{completionSummary}</p>
              <p className="text-xs text-slate-500">{guidance}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{missingSummary}</p>
            </div>
          </div>
        </div>
      </div>
    </AnimatedCard>
  );
}

function PortfolioGrid({ projects }: { projects: MyProjectListItem[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Portfolio</h2>
        <Link href="/developer/projects/new" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
          New project <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project, index) => (
          <AnimatedCard key={project.id} delay={0.05 + index * 0.06}>
            <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="relative h-32 w-full border-b border-slate-200">
                <Image
                  src={project.thumbnailUrl ?? project.backgroundUrl ?? "/dashboard_preview.png"}
                  alt={project.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="text-base font-semibold text-slate-900">{project.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{project.shortDescription}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(project.techStack.length > 0 ? project.techStack : [project.category]).slice(0, 4).map((tech) => (
                    <span key={tech} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {tech}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
                  <span>{project.viewCount} views</span>
                  <span>{project.likeCount} likes</span>
                  <span>{formatProjectStatus(project.status)}</span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Link href={`/projects/${project.slug}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                    Open
                  </Link>
                  <Link href={`/projects/${project.slug}?edit=1`} className="text-sm font-medium text-slate-600 hover:text-slate-900">
                    Edit
                  </Link>
                </div>
              </div>
            </article>
          </AnimatedCard>
        ))}
      </div>
      {projects.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          No projects yet. Publish your first project to build your portfolio.
        </p>
      ) : null}
    </section>
  );
}

function ActivityFeed({
  activities,
}: {
  activities: ActivityItem[];
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" id="notifications">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Activity timeline</h2>
      <div className="space-y-3">
        {activities.map((item, index) => (
          <AnimatedCard key={item.id} delay={0.05 + index * 0.04}>
            <article className={`rounded-xl border px-4 py-3 ${item.unread ? "border-blue-200 bg-blue-50/60" : "border-slate-200 bg-slate-50"}`}>
              <p className="text-sm font-medium text-slate-800">{item.title}</p>
              <p className="mt-0.5 text-sm text-slate-600">{item.detail}</p>
              <p className="mt-1 text-xs text-slate-500">{item.time}</p>
            </article>
          </AnimatedCard>
        ))}
        {activities.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            No activity yet. Client messages and notifications will show up here.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function MessagesPreview({ threads }: { threads: ThreadSummary[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Messages preview</h2>
        <Link href="/developer/messages" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          Open inbox
        </Link>
      </div>
      <div className="space-y-3">
        {threads.slice(0, 4).map((thread) => (
          <article key={thread.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-slate-200" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-slate-800">Thread {thread.id.slice(0, 8)}</p>
                  <span className="text-xs text-slate-500">{formatTime(thread.updatedAt)}</span>
                </div>
                <p className="mt-0.5 truncate text-sm text-slate-600">
                  {thread.messages[0]?.content ?? "New message activity"}
                </p>
              </div>
              {thread.unreadCount > 0 ? (
                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {thread.unreadCount}
                </span>
              ) : null}
            </div>
          </article>
        ))}
        {threads.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            No conversations yet. New client messages will appear here.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function RecommendedProjects({ recommendations }: { recommendations: RecommendationItem[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" id="saved-clients">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Recommended projects</h2>
      <div className="space-y-3">
        {recommendations.map((item, index) => (
          <AnimatedCard key={item.project.id} delay={0.06 + index * 0.05}>
            <article className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.project.title}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{formatPrice(item.project)} · {item.project.category.replace(/_/g, " ")}</p>
                </div>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {item.match}% match
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.matchedSkills.slice(0, 4).map((skill) => (
                  <span key={skill} className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">
                    {skill}
                  </span>
                ))}
                {item.matchedSkills.length === 0 ? (
                  <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">
                    Match by project popularity
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Link href={`/projects/${item.project.slug}`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                  View project
                </Link>
                <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600">
                  {item.project.likeCount} likes
                </span>
              </div>
            </article>
          </AnimatedCard>
        ))}
        {recommendations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            No recommended projects yet. Add more skills to improve matching.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function AiMatchWidget({
  recommendations,
  completeness,
}: {
  recommendations: RecommendationItem[];
  completeness: ProfileCompleteness;
}) {
  const topMatch = recommendations[0]?.match ?? 0;
  const suggestion = completeness.nextAction ?? "Keep your portfolio updated for stronger matching signals.";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" id="ai-match">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-slate-900">AI Match</h2>
      </div>
      <p className="text-sm text-slate-600">
        Based on your portfolio and profile skills, we found <span className="font-semibold text-slate-900">{recommendations.length}</span> relevant projects.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Match score</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{topMatch}/100</p>
          <p className="mt-1 text-xs text-slate-500">Top recommendation score from current project feed</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Suggested action</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{suggestion}</p>
          <p className="mt-1 text-xs text-slate-500">Profile completeness: {completeness.percentage}%</p>
        </article>
      </div>
    </section>
  );
}

function AnalyticsCard({
  label,
  value,
  change,
  progress,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  change: string;
  progress: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "blue" | "rose" | "violet" | "amber" | "indigo" | "emerald";
}) {
  const toneStyles: Record<"blue" | "rose" | "violet" | "amber" | "indigo" | "emerald", string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  const barStyles: Record<"blue" | "rose" | "violet" | "amber" | "indigo" | "emerald", string> = {
    blue: "bg-blue-500/70",
    rose: "bg-rose-500/70",
    violet: "bg-violet-500/70",
    amber: "bg-amber-500/70",
    indigo: "bg-indigo-500/70",
    emerald: "bg-emerald-500/70",
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{change}</p>
        </div>
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${toneStyles[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${barStyles[tone]}`} style={{ width: `${Math.max(8, progress)}%` }} />
      </div>
    </article>
  );
}

function AnalyticsSection({
  totalProjectViews,
  totalProjectLikes,
  threadCount,
  unreadMessages,
  unreadNotifications,
  publishedProjectCount,
}: {
  totalProjectViews: number;
  totalProjectLikes: number;
  threadCount: number;
  unreadMessages: number;
  unreadNotifications: number;
  publishedProjectCount: number;
}) {
  const maxValue = Math.max(
    totalProjectViews,
    totalProjectLikes,
    threadCount,
    unreadMessages,
    unreadNotifications,
    publishedProjectCount,
    1,
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" id="analytics">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Analytics</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <AnalyticsCard
          label="Project views"
          value={formatCompactNumber(totalProjectViews)}
          change="Across all your projects"
          progress={(totalProjectViews / maxValue) * 100}
          icon={Eye}
          tone="blue"
        />
        <AnalyticsCard
          label="Project likes"
          value={formatCompactNumber(totalProjectLikes)}
          change="Total engagement signals"
          progress={(totalProjectLikes / maxValue) * 100}
          icon={Heart}
          tone="rose"
        />
        <AnalyticsCard
          label="Threads"
          value={String(threadCount)}
          change="Active client conversations"
          progress={(threadCount / maxValue) * 100}
          icon={MessageSquare}
          tone="violet"
        />
        <AnalyticsCard
          label="Unread messages"
          value={String(unreadMessages)}
          change="Needs response"
          progress={(unreadMessages / maxValue) * 100}
          icon={MessageSquare}
          tone="amber"
        />
        <AnalyticsCard
          label="Unread notifications"
          value={String(unreadNotifications)}
          change="Recent platform updates"
          progress={(unreadNotifications / maxValue) * 100}
          icon={Bell}
          tone="indigo"
        />
        <AnalyticsCard
          label="Published projects"
          value={String(publishedProjectCount)}
          change="Visible to clients"
          progress={(publishedProjectCount / maxValue) * 100}
          icon={FolderKanban}
          tone="emerald"
        />
      </div>
    </section>
  );
}

export default function DeveloperDashboardPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | undefined>(undefined);
  const [pendingLogout, setPendingLogout] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [savedProjectsCount, setSavedProjectsCount] = useState(0);
  const [myProjects, setMyProjects] = useState<MyProjectListItem[]>([]);
  const [recommendedProjects, setRecommendedProjects] = useState<ProjectListItem[]>([]);
  const [completeness, setCompleteness] = useState<ProfileCompleteness>({
    percentage: 0,
    completedFields: 0,
    totalFields: 0,
    missingFields: [],
    nextAction: null
  });

  useEffect(() => {
    queueMicrotask(() => {
      void getAuthSession()
        .then(() => setHasSession(true))
        .catch(() => {
          setHasSession(false);
          router.replace("/login");
        });
    });
  }, [router]);

  useEffect(() => {
    if (!hasSession) {
      return;
    }

    async function loadDashboardData() {
      try {
        const [profileData, threadData, notificationData, savedData, myProjectData, completenessData, recommendedData] = await Promise.all([
          getCurrentUserProfile(),
          getMessageThreads(),
          getNotifications(20),
          getSavedProjects(),
          getMyProjects(),
          getProfileCompleteness(),
          listProjectsPaginated({ sortBy: "popular", limit: 8 })
        ]);
        setProfile(profileData);
        setThreads(threadData);
        setNotifications(notificationData);
        setSavedProjectsCount(savedData.length);
        setMyProjects(myProjectData);
        setCompleteness(completenessData);
        setRecommendedProjects(recommendedData.items);
      } catch {
        setProfile(null);
        setThreads([]);
        setNotifications([]);
        setMyProjects([]);
        setRecommendedProjects([]);
        setCompleteness({
          percentage: 0,
          completedFields: 0,
          totalFields: 0,
          missingFields: [],
          nextAction: null
        });
      }
    }

    void loadDashboardData();
  }, [hasSession]);

  async function onLogout() {
    setPendingLogout(true);
    await logout();
    router.replace("/login");
  }

  async function onLogoutEverywhere() {
    setPendingLogout(true);
    await logoutEverywhere();
    router.replace("/login");
  }

  const unreadMessages = useMemo(
    () => threads.reduce((sum, thread) => sum + thread.unreadCount, 0),
    [threads],
  );

  const messageActivityCount = useMemo(
    () => (unreadMessages > 0 ? unreadMessages : threads.length),
    [threads.length, unreadMessages],
  );

  const messageActivitySubtitle = unreadMessages > 0 ? "Unread now" : "Conversations";

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  const totalProjectViews = useMemo(
    () => myProjects.reduce((sum, project) => sum + project.viewCount, 0),
    [myProjects],
  );

  const totalProjectLikes = useMemo(
    () => myProjects.reduce((sum, project) => sum + project.likeCount, 0),
    [myProjects],
  );

  const publishedProjectCount = useMemo(
    () => myProjects.filter((project) => project.status === "PUBLISHED").length,
    [myProjects],
  );

  const draftProjectCount = useMemo(
    () => myProjects.filter((project) => project.status === "DRAFT").length,
    [myProjects],
  );

  const recommendationItems = useMemo<RecommendationItem[]>(() => {
    const profileSkills = new Set((profile?.skills ?? []).map((skill) => skill.toLowerCase()));

    return recommendedProjects
      .map((project) => {
        const matchedSkills = project.techStack.filter((skill) => profileSkills.has(skill.toLowerCase()));
        const skillMatchScore = profileSkills.size > 0 ? Math.round((matchedSkills.length / profileSkills.size) * 70) : 40;
        const engagementScore = Math.min(30, Math.round((project.likeCount + project.viewCount / 10) / 5));

        return {
          project,
          matchedSkills,
          match: Math.max(35, Math.min(99, skillMatchScore + engagementScore)),
        };
      })
      .sort((left, right) => right.match - left.match)
      .slice(0, 4);
  }, [profile?.skills, recommendedProjects]);

  const activities: ActivityItem[] = useMemo(() => {
    const fromThreads = threads.slice(0, 3).map((thread) => ({
      id: `thread-${thread.id}`,
      title: "Client message",
      detail: thread.messages[0]?.content ?? "New thread activity",
      time: formatTime(thread.updatedAt),
      unread: thread.unreadCount > 0,
    }));

    const fromNotifications = notifications.slice(0, 3).map((notification) => ({
      id: `notification-${notification.id}`,
      title: notification.type.replace(/_/g, " "),
      detail: "Notification from your account activity",
      time: formatTime(notification.createdAt),
      unread: !notification.isRead,
    }));

    return [...fromThreads, ...fromNotifications].slice(0, 6);
  }, [notifications, threads]);

  if (!hasSession) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar
          open={mobileSidebarOpen}
          collapsed={desktopSidebarCollapsed}
          onClose={() => setMobileSidebarOpen(false)}
          onToggleCollapsed={() => setDesktopSidebarCollapsed((current) => !current)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <DeveloperDashboardNavbar
            onOpenSidebar={() => setMobileSidebarOpen(true)}
            unreadMessages={unreadMessages}
            unreadNotifications={unreadNotifications}
            onSignOut={() => {
              void onLogout();
            }}
            onSignOutEverywhere={() => {
              void onLogoutEverywhere();
            }}
            pendingSignOut={pendingLogout}
          />

          <main className="space-y-6 p-4 sm:p-6">
            <Hero
              name={profile?.fullName ?? "Developer"}
              unread={unreadNotifications}
              profileViews={totalProjectViews}
              messages={messageActivityCount}
              completeness={completeness}
            />

            <section className="flex gap-2 overflow-x-auto pb-1">
              <StatCard title="Project views" value={String(totalProjectViews)} trend="Live" subtitle="Across your portfolio" delay={0.05} />
              <StatCard title="Messages" value={String(messageActivityCount)} trend="Live" subtitle={messageActivitySubtitle} delay={0.09} />
              <StatCard title="Saved projects" value={String(savedProjectsCount)} trend="Live" subtitle="In your shortlist" delay={0.13} />
              <StatCard title="Published" value={String(publishedProjectCount)} trend="Live" subtitle="Visible to clients" delay={0.17} />
              <StatCard title="Drafts" value={String(draftProjectCount)} trend="Live" subtitle="Not yet published" delay={0.21} />
              <StatCard title="Project likes" value={String(totalProjectLikes)} trend="Live" subtitle="Engagement signal" delay={0.25} />
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <PortfolioGrid projects={myProjects} />
              <MessagesPreview threads={threads} />
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <ActivityFeed activities={activities} />
              </div>
              <AiMatchWidget recommendations={recommendationItems} completeness={completeness} />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <RecommendedProjects recommendations={recommendationItems} />
              <AnalyticsSection
                totalProjectViews={totalProjectViews}
                totalProjectLikes={totalProjectLikes}
                threadCount={threads.length}
                unreadMessages={unreadMessages}
                unreadNotifications={unreadNotifications}
                publishedProjectCount={publishedProjectCount}
              />
            </div>

          </main>
        </div>
      </div>
    </div>
  );
}
