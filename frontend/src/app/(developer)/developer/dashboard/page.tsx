"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Briefcase,
  ChevronRight,
  CircleHelp,
  FolderKanban,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  UserCircle2,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  getAuthSession,
  getProfileCompleteness,
  getMyProjects,
  getMessageThreads,
  getNotifications,
  getSavedProjects,
  logout,
  logoutEverywhere,
  MyProjectListItem,
  NotificationItem,
  ProfileCompleteness,
  ThreadSummary,
} from "@/lib/api";

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  unread?: boolean;
};

type RecommendationItem = {
  id: string;
  title: string;
  budget: string;
  timeline: string;
  skills: string[];
  match: number;
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
  { label: "Portfolio", icon: FolderKanban, href: "/developer/projects/new" },
  { label: "Projects", icon: Briefcase, href: "/projects" },
  { label: "Messages", icon: MessageSquare, href: "/developer/messages" },
  { label: "Analytics", icon: Zap, href: "/developer/dashboard#analytics" },
  { label: "AI Match", icon: Sparkles, href: "/developer/dashboard#ai-match" },
  { label: "Saved Clients", icon: Users, href: "/developer/dashboard#saved-clients" },
  { label: "Notifications", icon: Bell, href: "/developer/dashboard#notifications" },
  { label: "Settings", icon: Settings, href: "/developers/settings" },
  { label: "Help", icon: CircleHelp, href: "/developer/dashboard#help" },
];

const recommendationItems: RecommendationItem[] = [
  {
    id: "r1",
    title: "B2B SaaS Billing Portal",
    budget: "$8k - $12k",
    timeline: "4 - 6 weeks",
    skills: ["React", "Node", "Stripe"],
    match: 93,
  },
  {
    id: "r2",
    title: "Healthcare Scheduling Revamp",
    budget: "$5k - $9k",
    timeline: "3 - 5 weeks",
    skills: ["TypeScript", "PostgreSQL", "UX"],
    match: 88,
  },
  {
    id: "r3",
    title: "Marketplace Messaging Layer",
    budget: "$6k - $10k",
    timeline: "5 - 7 weeks",
    skills: ["WebSockets", "Redis", "Backend"],
    match: 85,
  },
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
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white lg:px-4 lg:py-5">
        <div className="mb-5 px-2">
          <DashboardBrand />
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
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

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close sidebar overlay"
            className="absolute inset-0 bg-slate-950/40"
            onClick={onClose}
          />
          <aside className="relative h-full w-72 border-r border-slate-200 bg-white px-4 py-5">
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

function Topbar({
  onOpenSidebar,
  unreadMessages,
  unreadNotifications,
}: {
  onOpenSidebar: () => void;
  unreadMessages: number;
  unreadNotifications: number;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          onClick={onOpenSidebar}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="hidden min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            aria-label="Search"
            placeholder="Search developers, projects, companies, messages..."
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
          <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-500">⌘K</span>
        </div>

        <button className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">AI Search</span>
        </button>

        <button className="relative rounded-lg border border-slate-200 p-2 text-slate-600">
          <MessageSquare className="h-4 w-4" />
          {unreadMessages > 0 ? (
            <span className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white">
              {unreadMessages}
            </span>
          ) : null}
        </button>

        <button className="relative rounded-lg border border-slate-200 p-2 text-slate-600">
          <Bell className="h-4 w-4" />
          {unreadNotifications > 0 ? (
            <span className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white">
              {unreadNotifications}
            </span>
          ) : null}
        </button>

        <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm">
          <div className="h-7 w-7 rounded-full bg-slate-200" />
          <span className="hidden text-slate-700 sm:inline">Michael</span>
        </button>
      </div>
    </header>
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
      <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{trend}</span>
        </div>
        <p className="text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        <div className="mt-4 h-10 overflow-hidden rounded-md bg-slate-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "76%" }}
            transition={{ duration: 0.7, delay: delay + 0.1 }}
            className="h-full bg-blue-500/20"
          />
        </div>
      </article>
    </AnimatedCard>
  );
}

function Hero({
  unread,
  profileViews,
  messages,
  completeness,
}: {
  unread: number;
  profileViews: number;
  messages: number;
  completeness: ProfileCompleteness;
}) {
  const completion = Math.max(0, Math.min(100, completeness.percentage));
  const dash = `${(completion / 100) * 87.96} ${87.96 - (completion / 100) * 87.96}`;
  const guidance = completeness.nextAction ?? "Your profile is fully optimized";

  return (
    <AnimatedCard className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" delay={0.05}>
      <div className="grid gap-6 lg:grid-cols-[1fr_210px]">
        <div>
          <p className="text-sm font-medium text-slate-500">Good Morning, Michael</p>
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
              <p className="text-sm font-medium text-slate-800">
                {completion >= 90 ? "Strong profile" : "Profile can improve"}
              </p>
              <p className="text-xs text-slate-500">{guidance}</p>
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

function RecommendedProjects() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" id="saved-clients">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Recommended projects</h2>
      <div className="space-y-3">
        {recommendationItems.map((item, index) => (
          <AnimatedCard key={item.id} delay={0.06 + index * 0.05}>
            <article className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {item.budget} · {item.timeline}
                  </p>
                </div>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {item.match}% match
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.skills.map((skill) => (
                  <span key={skill} className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">
                    {skill}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Apply</button>
                <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white">Bookmark</button>
              </div>
            </article>
          </AnimatedCard>
        ))}
      </div>
    </section>
  );
}

function AiMatchWidget() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" id="ai-match">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-slate-900">AI Match</h2>
      </div>
      <p className="text-sm text-slate-600">
        Based on your portfolio, we found <span className="font-semibold text-slate-900">18 businesses</span> looking for React + Node developers.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Match score</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">91/100</p>
          <p className="mt-1 text-xs text-slate-500">Excellent fit in SaaS and healthcare projects</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Suggested action</p>
          <p className="mt-1 text-sm font-medium text-slate-900">Publish one more case study this week</p>
          <p className="mt-1 text-xs text-slate-500">This can improve project match confidence by up to 11%</p>
        </article>
      </div>
    </section>
  );
}

function AnalyticsCard({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{change}</p>
    </article>
  );
}

function AnalyticsSection() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" id="analytics">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Analytics</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <AnalyticsCard label="Profile views" value="2,480" change="+14% this month" />
        <AnalyticsCard label="Portfolio visits" value="1,940" change="+11% this month" />
        <AnalyticsCard label="Messages" value="312" change="+9% this month" />
        <AnalyticsCard label="Applications" value="76" change="+6% this month" />
        <AnalyticsCard label="Client saves" value="124" change="+18% this month" />
        <AnalyticsCard label="Referral sources" value="Top: Search" change="57% of traffic" />
      </div>
    </section>
  );
}

function UtilityActions({
  pending,
  onLogout,
  onLogoutEverywhere,
}: {
  pending: boolean;
  onLogout: () => Promise<void>;
  onLogoutEverywhere: () => Promise<void>;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" id="help">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick actions</h2>
      <div className="flex flex-wrap gap-2">
        <Link href="/developers/settings" className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Edit profile
        </Link>
        <Link href="/projects" className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Browse projects
        </Link>
        <button
          disabled={pending}
          onClick={() => {
            void onLogout();
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {pending ? "Signing out..." : "Sign out"}
        </button>
        <button
          disabled={pending}
          onClick={() => {
            void onLogoutEverywhere();
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Sign out all devices
        </button>
      </div>
    </section>
  );
}

export default function DeveloperDashboardPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | undefined>(undefined);
  const [pendingLogout, setPendingLogout] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [savedProjectsCount, setSavedProjectsCount] = useState(0);
  const [myProjects, setMyProjects] = useState<MyProjectListItem[]>([]);
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
        const [threadData, notificationData, savedData, myProjectData, completenessData] = await Promise.all([
          getMessageThreads(),
          getNotifications(20),
          getSavedProjects(),
          getMyProjects(),
          getProfileCompleteness()
        ]);
        setThreads(threadData);
        setNotifications(notificationData);
        setSavedProjectsCount(savedData.length);
        setMyProjects(myProjectData);
        setCompleteness(completenessData);
      } catch {
        setThreads([]);
        setNotifications([]);
        setMyProjects([]);
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

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  const activities: ActivityItem[] = useMemo(() => {
    if (threads.length > 0) {
      return threads.slice(0, 5).map((thread) => ({
        id: thread.id,
        title: "Client sent a message",
        detail: thread.messages[0]?.content ?? "New thread activity",
        time: formatTime(thread.updatedAt),
        unread: thread.unreadCount > 0,
      }));
    }

    return [
      { id: "a1", title: "John viewed your profile", detail: "Your profile was viewed from a FinTech company", time: "5m ago", unread: true },
      { id: "a2", title: "Sarah bookmarked your portfolio", detail: "Project card got bookmarked", time: "22m ago" },
      { id: "a3", title: "New AI recommendation", detail: "You matched with 3 new projects", time: "1h ago" },
      { id: "a4", title: "Proposal accepted", detail: "Client approved your proposal terms", time: "Yesterday" },
    ];
  }, [threads]);

  if (!hasSession) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar open={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            onOpenSidebar={() => setMobileSidebarOpen(true)}
            unreadMessages={unreadMessages}
            unreadNotifications={unreadNotifications}
          />

          <main className="space-y-6 p-4 sm:p-6">
            <Hero unread={Math.max(unreadMessages, 4)} profileViews={12} messages={3} completeness={completeness} />

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <StatCard title="Profile views" value="2,480" trend="+14%" subtitle="Last 30 days" delay={0.05} />
              <StatCard title="Messages" value={String(unreadMessages)} trend="+9%" subtitle="Unread now" delay={0.09} />
              <StatCard title="Saved by clients" value={String(savedProjectsCount)} trend="+6%" subtitle="This week" delay={0.13} />
              <StatCard title="Projects" value={String(myProjects.length)} trend="Live" subtitle="Your portfolio" delay={0.17} />
              <StatCard title="Applications" value="76" trend="+5%" subtitle="Conversion" delay={0.21} />
              <StatCard title="Revenue" value="$12.4k" trend="future" subtitle="Planning metric" delay={0.25} />
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <PortfolioGrid projects={myProjects} />
              <MessagesPreview threads={threads} />
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <ActivityFeed activities={activities} />
              </div>
              <AiMatchWidget />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <RecommendedProjects />
              <AnalyticsSection />
            </div>

            <UtilityActions
              pending={pendingLogout}
              onLogout={onLogout}
              onLogoutEverywhere={onLogoutEverywhere}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
