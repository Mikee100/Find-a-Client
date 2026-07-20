"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  getDeveloperDashboardData,
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

type SavedItem = {
  id: string;
  project: {
    id: string;
    slug: string;
    title: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  };
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
  { label: "Analytics", icon: Zap, href: "/developer/analytics" },
  { label: "AI Match", icon: Sparkles, href: "/developer/ai-match" },
  { label: "Saved Projects", icon: Users, href: "/developer/saved-projects" },
  { label: "Notifications", icon: Bell, href: "/developer/notifications" },
  { label: "Settings", icon: Settings, href: "/developers/settings" },
  { label: "Help", icon: CircleHelp, href: "/developer/help" },
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatNotificationTitle(type: string): string {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type NotificationPayload = {
  threadId?: string;
  projectId?: string;
  projectTitle?: string;
  senderId?: string;
  senderName?: string;
  preview?: string;
};

function isNotificationPayload(value: unknown): value is NotificationPayload {
  return typeof value === "object" && value !== null;
}

function getThreadPartnerName(thread: ThreadSummary, currentUserId?: string): string {
  const participantA = thread.participantA;
  const participantB = thread.participantB;

  if (currentUserId && participantA?.id === currentUserId) {
    return participantB?.fullName || participantB?.username || "Client";
  }

  if (currentUserId && participantB?.id === currentUserId) {
    return participantA?.fullName || participantA?.username || "Client";
  }

  if (participantA?.fullName || participantA?.username) {
    return participantA.fullName || participantA.username;
  }

  if (participantB?.fullName || participantB?.username) {
    return participantB.fullName || participantB.username;
  }

  return "Client";
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

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[1fr_210px]">
          <div className="space-y-3">
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="h-9 w-64" />
            <SkeletonBlock className="h-4 w-full max-w-2xl" />
            <SkeletonBlock className="h-4 w-5/6" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <SkeletonBlock className="h-3 w-28" />
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <SkeletonBlock className="h-4 w-28" />
                <SkeletonBlock className="h-4 w-10" />
              </div>
              <SkeletonBlock className="h-1.5 w-full rounded-full" />
              <SkeletonBlock className="h-3 w-4/5" />
            </div>
          </div>
        </div>
      </section>

      <section className="flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 6 }).map((_, index) => (
          <article key={index} className="min-w-42.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <SkeletonBlock className="mb-2 h-3 w-24" />
            <SkeletonBlock className="h-6 w-14" />
            <SkeletonBlock className="mt-2 h-3 w-28" />
          </article>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SkeletonBlock className="mb-4 h-5 w-28" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <article key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <SkeletonBlock className="h-32 w-full rounded-none" />
                <div className="space-y-2 p-4">
                  <SkeletonBlock className="h-4 w-3/4" />
                  <SkeletonBlock className="h-3 w-full" />
                  <SkeletonBlock className="h-3 w-2/3" />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SkeletonBlock className="mb-4 h-5 w-36" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <article key={index} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <SkeletonBlock className="h-4 w-2/3" />
                <SkeletonBlock className="mt-2 h-3 w-full" />
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SkeletonBlock className="mb-4 h-5 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-16 w-full" />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SkeletonBlock className="mb-3 h-5 w-20" />
          <SkeletonBlock className="h-4 w-5/6" />
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-24 w-full" />
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SkeletonBlock className="mb-4 h-5 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-16 w-full" />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SkeletonBlock className="mb-4 h-5 w-24" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-28 w-full" />
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <SkeletonBlock className="mb-4 h-5 w-44" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-20 w-full" />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <SkeletonBlock className="mb-2 h-5 w-16" />
        <SkeletonBlock className="h-4 w-3/5" />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-12 w-full" />
          ))}
        </div>
      </section>
    </>
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
  const sidebarWidth = collapsed ? 80 : 224;

  return (
    <>
      <motion.aside
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={`relative hidden overflow-visible lg:sticky lg:top-0 lg:z-30 lg:flex lg:h-screen lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white lg:py-5 ${
          collapsed ? "lg:px-2" : "lg:px-3"
        }`}
      >
        <div className={`mb-5 ${collapsed ? "flex justify-center" : "px-2"}`}>
          <AnimatePresence mode="wait" initial={false}>
            {collapsed ? (
              <motion.div
                key="collapsed-brand"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.18 }}
              >
                <Link href="/" className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white" aria-label="Go to home">
                  FC
                </Link>
              </motion.div>
            ) : (
              <motion.div
                key="expanded-brand"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.2 }}
              >
                <DashboardBrand />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={onToggleCollapsed}
          className="absolute right-0 top-14 z-40 flex h-8 w-8 translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <motion.span
            key={collapsed ? "expand" : "collapse"}
            initial={{ rotate: collapsed ? -45 : 45, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </motion.span>
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
              <AnimatePresence initial={false}>
                {!collapsed ? (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.18 }}
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </Link>
          ))}
        </nav>
      </motion.aside>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              aria-label="Close sidebar overlay"
              className="absolute inset-0 bg-slate-950/40"
              onClick={onClose}
            />
            <motion.aside
              className="relative h-full w-64 border-r border-slate-200 bg-white px-4 py-5"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
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
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
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
      <article className="group min-w-42.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
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
          <div className="mt-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-800">{completionSummary}</p>
              <span className="font-mono text-xs text-slate-700">{completion}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-slate-900" style={{ width: `${completion}%` }} />
            </div>
            <div>
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
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
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
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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

function SavedClientsSection({ savedItems }: { savedItems: SavedItem[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" id="saved-clients">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Saved projects</h2>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          {savedItems.length}
        </span>
      </div>

      <div className="space-y-3">
        {savedItems.slice(0, 6).map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="line-clamp-1 text-sm font-semibold text-slate-900">{item.project.title}</p>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {formatProjectStatus(item.project.status)}
              </span>
            </div>
            <div className="mt-2">
              <Link href={`/projects/${item.project.slug}`} className="text-xs font-medium text-blue-700 hover:underline">
                Open project
              </Link>
            </div>
          </article>
        ))}

        {savedItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            You have no saved projects yet. Browse the marketplace and save opportunities to shortlist them here.
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

function HelpSection() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" id="help">
      <h2 className="mb-2 text-lg font-semibold text-slate-900">Help</h2>
      <p className="text-sm text-slate-600">
        Quick shortcuts to resolve common issues and keep your dashboard up to date.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Link href="/developer/messages" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100">
          Contact clients in Messages
        </Link>
        <Link href="/developers/settings" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100">
          Update profile and settings
        </Link>
        <Link href="/developer/projects" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100">
          Manage your portfolio projects
        </Link>
        <Link href="/projects" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100">
          Browse open client projects
        </Link>
      </div>
    </section>
  );
}

export default function DeveloperDashboardPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | undefined>(undefined);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [pendingLogout, setPendingLogout] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [savedProjects, setSavedProjects] = useState<SavedItem[]>([]);
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
    let cancelled = false;

    async function loadDashboardData() {
      setDashboardLoading(true);
      try {
        const startedAt = performance.now();
        const dashboardData = await getDeveloperDashboardData();

        if (cancelled) {
          return;
        }

        setHasSession(true);
        setProfile(dashboardData.profile);
        setThreads(dashboardData.threads);
        setNotifications(dashboardData.notifications);
        setSavedProjects(dashboardData.savedProjects);
        setMyProjects(dashboardData.myProjects);
        setCompleteness(dashboardData.completeness);
        setRecommendedProjects(dashboardData.recommendedProjects);

        if (process.env.NODE_ENV !== "production") {
          const elapsedMs = Math.round(performance.now() - startedAt);
          console.info(`[developer-dashboard] loaded in ${elapsedMs}ms`);
        }
      } catch {
        if (cancelled) {
          return;
        }

        setHasSession(false);
        router.replace("/login");
      } finally {
        if (!cancelled) {
          setDashboardLoading(false);
        }
      }
    }

    void loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [router]);

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
      title: `${getThreadPartnerName(thread, profile?.id)} message`,
      detail: thread.project?.title
        ? `About ${thread.project.title}: ${thread.messages[0]?.content ?? "New thread activity"}`
        : (thread.messages[0]?.content ?? "New thread activity"),
      time: formatTime(thread.updatedAt),
      unread: thread.unreadCount > 0,
    }));

    const fromNotifications = notifications.slice(0, 3).map((notification) => {
      const payload = isNotificationPayload(notification.payload) ? notification.payload : undefined;
      const linkedThread = payload?.threadId
        ? threads.find((thread) => thread.id === payload.threadId)
        : undefined;

      const senderName = typeof payload?.senderName === "string"
        ? payload.senderName
        : (linkedThread ? getThreadPartnerName(linkedThread, profile?.id) : "Client");

      const projectTitle =
        typeof payload?.projectTitle === "string"
          ? payload.projectTitle
          : (linkedThread?.project?.title ?? undefined);

      const preview = typeof payload?.preview === "string" ? payload.preview : "";

      let detail = "Notification from your account activity";
      if (notification.type === "NEW_MESSAGE") {
        if (projectTitle && preview) {
          detail = `${senderName} asked about ${projectTitle}: ${preview}`;
        } else if (projectTitle) {
          detail = `${senderName} asked about ${projectTitle}`;
        } else if (preview) {
          detail = `${senderName}: ${preview}`;
        } else {
          detail = `${senderName} sent you a new message`;
        }
      }

      return {
        id: `notification-${notification.id}`,
        title: formatNotificationTitle(notification.type),
        detail,
        time: formatTime(notification.createdAt),
        unread: !notification.isRead,
      };
    });

    return [...fromThreads, ...fromNotifications].slice(0, 6);
  }, [notifications, profile?.id, threads]);

  if (hasSession === false) {
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
            {dashboardLoading ? (
              <DashboardSkeleton />
            ) : (
              <>
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
                  <StatCard title="Saved projects" value={String(savedProjects.length)} trend="Live" subtitle="In your shortlist" delay={0.13} />
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
                  <SavedClientsSection savedItems={savedProjects} />
                  <AnalyticsSection
                    totalProjectViews={totalProjectViews}
                    totalProjectLikes={totalProjectLikes}
                    threadCount={threads.length}
                    unreadMessages={unreadMessages}
                    unreadNotifications={unreadNotifications}
                    publishedProjectCount={publishedProjectCount}
                  />
                </div>

                <RecommendedProjects recommendations={recommendationItems} />

                <HelpSection />
              </>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}
