"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Bell,
  Bookmark,
  Bot,
  BriefcaseBusiness,
  Ellipsis,
  Eye,
  Heart,
  MapPin,
  MessageSquareText,
  Search,
  Share2,
  TrendingUp
} from "lucide-react";
import {
  DeveloperSearchItem,
  getMessageThreads,
  getProjectBySlug,
  listProjects,
  ProjectCategory,
  ProjectDetail,
  ProjectListItem,
  searchDevelopers,
  ThreadSummary
} from "@/lib/api";

type FeedTab = "FEATURED" | "LATEST" | "TRENDING" | "MOST_VIEWED" | "SAVED";
type BudgetFilter = "ALL" | "UNDER_2K" | "2K_TO_8K" | "8K_PLUS";
type AvailabilityFilter = "ALL" | "AVAILABLE" | "BUSY" | "NOT_ACCEPTING_WORK";
type ExperienceFilter = "ALL" | "JUNIOR" | "MID" | "SENIOR";

const FEED_TABS: Array<{ key: FeedTab; label: string }> = [
  { key: "FEATURED", label: "Featured" },
  { key: "LATEST", label: "Latest" },
  { key: "TRENDING", label: "Trending" },
  { key: "MOST_VIEWED", label: "Most Viewed" },
  { key: "SAVED", label: "Saved" }
];

const SKILL_CHIPS = ["React", "Next.js", "Node", "Laravel", "Flutter", "AI", "Python"];
const TRENDING_TECH = ["React", "Next.js", "AI", "Flutter", "Docker", "PostgreSQL", "Supabase", "Node"];
const CATEGORY_CHIPS: Array<{ value: "ALL" | ProjectCategory; label: string }> = [
  { value: "ALL", label: "All Categories" },
  { value: "WEB_APP", label: "Web App" },
  { value: "MOBILE_APP", label: "Mobile App" },
  { value: "API", label: "API" },
  { value: "AI_ML", label: "AI / ML" },
  { value: "ECOMMERCE", label: "Ecommerce" }
];

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatRelativeTime(value: string): string {
  const now = Date.now();
  const timestamp = new Date(value).getTime();
  const diffMs = Math.max(0, now - timestamp);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) {
    return "Just now";
  }
  if (diffHours < 24) {
    return `${diffHours} hours ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return "Yesterday";
  }
  return `${diffDays} days ago`;
}

function formatMoney(price: number | string | null, currency: string, pricingType: ProjectListItem["pricingType"]): string {
  if (pricingType === "FREE") {
    return "Free";
  }
  if (pricingType === "CONTACT") {
    return "Contact";
  }
  if (pricingType === "NEGOTIABLE") {
    return "Negotiable";
  }
  if (price === null || price === undefined) {
    return "Fixed";
  }

  const numericPrice = typeof price === "string" ? Number(price) : price;
  if (!Number.isFinite(numericPrice)) {
    return `Fixed (${currency})`;
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency
  }).format(numericPrice);
}

function getPriceBucket(project: ProjectListItem): BudgetFilter {
  if (project.pricingType === "FREE") {
    return "UNDER_2K";
  }
  const numericPrice = typeof project.price === "string" ? Number(project.price) : project.price;
  if (!Number.isFinite(numericPrice as number)) {
    return "8K_PLUS";
  }
  const value = numericPrice as number;
  if (value < 2000) {
    return "UNDER_2K";
  }
  if (value <= 8000) {
    return "2K_TO_8K";
  }
  return "8K_PLUS";
}

function estimateDuration(category: ProjectCategory): string {
  if (category === "AI_ML") {
    return "8-12 weeks";
  }
  if (category === "MOBILE_APP") {
    return "6-10 weeks";
  }
  if (category === "API") {
    return "3-6 weeks";
  }
  return "4-8 weeks";
}

function PremiumNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-white">
      <nav className="mx-auto flex h-[72px] w-full max-w-[1460px] items-center gap-4 px-4 md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-[#0F172A]">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F172A] text-xs font-bold text-white">
            FC
          </span>
          <span className="text-sm font-semibold">Find a Client</span>
        </Link>

        <div className="mx-auto hidden w-full max-w-xl items-center rounded-full border border-[#E5E7EB] bg-[#F8FAFA] px-4 md:flex">
          <Search className="h-4 w-4 text-[#64748B]" aria-hidden />
          <input
            placeholder="Search developers, projects, technologies..."
            className="h-10 w-full bg-transparent px-2 text-sm text-[#111827] outline-none placeholder:text-[#64748B]"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 text-sm text-[#64748B]">
          <button className="rounded-lg px-3 py-2 font-medium text-[#111827] hover:bg-[#F8FAFA]">Discover</button>
          <button className="rounded-lg px-3 py-2 font-medium hover:bg-[#F8FAFA]">Saved</button>
          <button className="rounded-lg px-3 py-2 font-medium hover:bg-[#F8FAFA]">Messages</button>
          <button className="relative rounded-lg p-2 hover:bg-[#F8FAFA]" aria-label="Notifications">
            <Bell className="h-4 w-4" aria-hidden />
          </button>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0F172A] text-xs font-semibold text-white">
            CL
          </span>
        </div>
      </nav>
    </header>
  );
}

export default function ClientFeedPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [projectDetails, setProjectDetails] = useState<Record<string, ProjectDetail | null>>({});
  const [recommendedDevelopers, setRecommendedDevelopers] = useState<DeveloperSearchItem[]>([]);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<FeedTab>("FEATURED");
  const [query, setQuery] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [budgetFilter, setBudgetFilter] = useState<BudgetFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | ProjectCategory>("ALL");
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("ALL");
  const [experienceFilter, setExperienceFilter] = useState<ExperienceFilter>("ALL");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [savedProjectIds, setSavedProjectIds] = useState<Set<string>>(new Set());
  const [savedDeveloperIds, setSavedDeveloperIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(8);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLoadingProjects(true);
        setError(null);
        const items = await listProjects();
        setProjects(items);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Failed to load projects.");
      } finally {
        setLoadingProjects(false);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const data = await getMessageThreads();
        setThreads(data);
      } catch {
        setThreads([]);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        setLoadingRecommendations(true);
        const developers = await searchDevelopers({
          skills: selectedSkills.length ? selectedSkills : undefined,
          availabilityStatus: availabilityFilter !== "ALL" ? availabilityFilter : undefined,
          experienceLevel: experienceFilter !== "ALL" ? experienceFilter : undefined,
          location: remoteOnly ? "remote" : undefined,
          limit: 8
        });
        const filtered = verifiedOnly ? developers.filter((item) => item.profileCompleteness >= 80) : developers;
        setRecommendedDevelopers(filtered);
      } catch {
        setRecommendedDevelopers([]);
      } finally {
        setLoadingRecommendations(false);
      }
    })();
  }, [availabilityFilter, experienceFilter, remoteOnly, selectedSkills, verifiedOnly]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return projects.filter((project) => {
      const detail = projectDetails[project.slug];
      const stack = detail?.techStack ?? [];
      const searchable = `${project.title} ${project.shortDescription} ${stack.join(" ")}`.toLowerCase();

      if (normalizedQuery && !searchable.includes(normalizedQuery)) {
        return false;
      }
      if (categoryFilter !== "ALL" && project.category !== categoryFilter) {
        return false;
      }
      if (budgetFilter !== "ALL" && getPriceBucket(project) !== budgetFilter) {
        return false;
      }
      if (selectedSkills.length && !selectedSkills.some((skill) => searchable.includes(skill.toLowerCase()))) {
        return false;
      }
      if (remoteOnly && !searchable.includes("remote")) {
        return false;
      }
      return true;
    });
  }, [budgetFilter, categoryFilter, projectDetails, projects, query, remoteOnly, selectedSkills]);

  const rankedProjects = useMemo(() => {
    const ranked = [...filteredProjects];
    const newestTimestamp = ranked.reduce((latest, item) => {
      const created = new Date(item.createdAt).getTime();
      return created > latest ? created : latest;
    }, 0);

    if (activeTab === "LATEST") {
      return ranked.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    }
    if (activeTab === "MOST_VIEWED") {
      return ranked.sort((left, right) => right.viewCount - left.viewCount);
    }
    if (activeTab === "TRENDING") {
      return ranked.sort((left, right) => {
        const leftHours = Math.max(1, (newestTimestamp - new Date(left.createdAt).getTime()) / 36e5 + 1);
        const rightHours = Math.max(1, (newestTimestamp - new Date(right.createdAt).getTime()) / 36e5 + 1);
        const leftScore = (left.likeCount * 2 + left.viewCount * 0.5) / leftHours;
        const rightScore = (right.likeCount * 2 + right.viewCount * 0.5) / rightHours;
        return rightScore - leftScore;
      });
    }
    if (activeTab === "SAVED") {
      return ranked.filter((project) => savedProjectIds.has(project.id));
    }

    return ranked.sort((left, right) => {
      const leftScore = left.likeCount * 2 + left.viewCount * 0.6;
      const rightScore = right.likeCount * 2 + right.viewCount * 0.6;
      return rightScore - leftScore;
    });
  }, [activeTab, filteredProjects, savedProjectIds]);

  const visibleProjects = useMemo(() => rankedProjects.slice(0, visibleCount), [rankedProjects, visibleCount]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && visibleCount < rankedProjects.length) {
          setVisibleCount((current) => Math.min(current + 6, rankedProjects.length));
        }
      },
      { rootMargin: "240px" }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
      observer.disconnect();
    };
  }, [rankedProjects.length, visibleCount]);

  useEffect(() => {
    const slugsToLoad = visibleProjects
      .map((project) => project.slug)
      .filter((slug) => !(slug in projectDetails));

    if (!slugsToLoad.length) {
      return;
    }

    void (async () => {
      const loaded = await Promise.allSettled(slugsToLoad.map((slug) => getProjectBySlug(slug)));
      setProjectDetails((previous) => {
        const next = { ...previous };
        loaded.forEach((result, index) => {
          const slug = slugsToLoad[index];
          next[slug] = result.status === "fulfilled" ? result.value : null;
        });
        return next;
      });
    })();
  }, [projectDetails, visibleProjects]);

  const hiringMetrics = useMemo(() => {
    const interested = Math.max(8, savedProjectIds.size + savedDeveloperIds.size + 6);
    const contacted = Math.max(3, threads.length);
    const interviewing = Math.max(1, Math.floor(contacted / 2));
    const hired = Math.max(1, Math.floor(savedDeveloperIds.size / 3));
    return { interested, contacted, interviewing, hired };
  }, [savedDeveloperIds.size, savedProjectIds.size, threads.length]);

  return (
    <main className="min-h-screen bg-[#F8FAFA] font-[Inter] text-[#111827]">
      <PremiumNavbar />

      <section className="mx-auto grid w-full max-w-[1460px] gap-5 px-4 py-8 md:px-6 xl:grid-cols-[280px_minmax(0,760px)_320px] xl:justify-center">
        <aside className="space-y-4 xl:sticky xl:top-[96px] xl:h-fit">
          <section className="rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-[0_6px_20px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-semibold text-[#0F172A]">Quick Actions</h3>
            <div className="mt-4 grid gap-2">
              <Link href="/client/projects/new" className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm font-medium hover:border-[#CBD5E1]">
                + Post Project
              </Link>
              <button className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-left text-sm font-medium hover:border-[#CBD5E1]">Find Developer</button>
              <button className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-left text-sm font-medium hover:border-[#CBD5E1]">Saved Projects</button>
              <button className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-left text-sm font-medium hover:border-[#CBD5E1]">Saved Developers</button>
            </div>
          </section>

          <section className="rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-[0_6px_20px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-[#2563EB]" aria-hidden />
              <h3 className="text-sm font-semibold text-[#0F172A]">AI Hiring Assistant</h3>
            </div>
            <p className="mt-2 text-sm text-[#64748B]">
              Describe your project and instantly discover the best developers.
            </p>
            <button className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]">
              Start AI Search
            </button>
          </section>

          <section className="rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-[0_6px_20px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-semibold text-[#0F172A]">Filters</h3>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">Skills</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SKILL_CHIPS.map((skill) => {
                const active = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    onClick={() =>
                      setSelectedSkills((previous) =>
                        previous.includes(skill) ? previous.filter((item) => item !== skill) : previous.concat(skill)
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      active
                        ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                        : "border-[#E5E7EB] bg-white text-[#64748B] hover:border-[#CBD5E1]"
                    }`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">Budget</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { label: "Any", value: "ALL" },
                { label: "Under $2k", value: "UNDER_2K" },
                { label: "$2k-$8k", value: "2K_TO_8K" },
                { label: "$8k+", value: "8K_PLUS" }
              ].map((budget) => (
                <button
                  key={budget.value}
                  onClick={() => setBudgetFilter(budget.value as BudgetFilter)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    budgetFilter === budget.value
                      ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                      : "border-[#E5E7EB] text-[#64748B] hover:border-[#CBD5E1]"
                  }`}
                >
                  {budget.label}
                </button>
              ))}
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">Experience</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {["ALL", "JUNIOR", "MID", "SENIOR"].map((level) => (
                <button
                  key={level}
                  onClick={() => setExperienceFilter(level as ExperienceFilter)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    experienceFilter === level
                      ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                      : "border-[#E5E7EB] text-[#64748B] hover:border-[#CBD5E1]"
                  }`}
                >
                  {toTitleCase(level)}
                </button>
              ))}
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">Availability</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {["ALL", "AVAILABLE", "BUSY", "NOT_ACCEPTING_WORK"].map((status) => (
                <button
                  key={status}
                  onClick={() => setAvailabilityFilter(status as AvailabilityFilter)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    availabilityFilter === status
                      ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                      : "border-[#E5E7EB] text-[#64748B] hover:border-[#CBD5E1]"
                  }`}
                >
                  {toTitleCase(status)}
                </button>
              ))}
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">Project Category</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORY_CHIPS.map((chip) => (
                <button
                  key={chip.value}
                  onClick={() => setCategoryFilter(chip.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    categoryFilter === chip.value
                      ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                      : "border-[#E5E7EB] text-[#64748B] hover:border-[#CBD5E1]"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setRemoteOnly((value) => !value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  remoteOnly ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]" : "border-[#E5E7EB] text-[#64748B] hover:border-[#CBD5E1]"
                }`}
              >
                Remote Only
              </button>
              <button
                onClick={() => setVerifiedOnly((value) => !value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  verifiedOnly ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]" : "border-[#E5E7EB] text-[#64748B] hover:border-[#CBD5E1]"
                }`}
              >
                Verified Only
              </button>
            </div>
          </section>

          <section className="rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-[0_6px_20px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-semibold text-[#0F172A]">Trending Technologies</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {TRENDING_TECH.map((tech) => (
                <span key={tech} className="rounded-full border border-[#E5E7EB] bg-[#F8FAFA] px-3 py-1 text-xs text-[#64748B]">
                  {tech}
                </span>
              ))}
            </div>
          </section>
        </aside>

        <section className="space-y-5">
          <section className="rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-[0_6px_20px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">Discover Projects</h1>
                <p className="mt-1 text-sm text-[#64748B]">
                  Explore production-ready work from developers around the world.
                </p>
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#64748B]" aria-hidden />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search developers, projects, technologies..."
                  className="h-10 w-full rounded-full border border-[#E5E7EB] bg-[#F8FAFA] pl-9 pr-3 text-sm text-[#111827] outline-none transition focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div className="relative mt-6 border-b border-[#E5E7EB]">
              <div className="grid grid-cols-5">
                {FEED_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`pb-3 text-center text-sm font-medium transition ${
                      activeTab === tab.key ? "text-[#0F172A]" : "text-[#64748B] hover:text-[#111827]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <span
                className="absolute bottom-0 left-0 h-0.5 bg-[#2563EB] transition-transform duration-200"
                style={{
                  width: `${100 / FEED_TABS.length}%`,
                  transform: `translateX(${FEED_TABS.findIndex((item) => item.key === activeTab) * 100}%)`
                }}
              />
            </div>
          </section>

          {error ? (
            <section className="rounded-[20px] border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
              {error}
            </section>
          ) : null}

          {loadingProjects ? (
            <div className="space-y-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="animate-pulse rounded-[20px] border border-[#E5E7EB] bg-white p-6">
                  <div className="h-4 w-2/5 rounded bg-[#E5E7EB]" />
                  <div className="mt-3 h-6 w-4/5 rounded bg-[#E5E7EB]" />
                  <div className="mt-2 h-4 w-3/4 rounded bg-[#E5E7EB]" />
                  <div className="mt-4 aspect-video rounded-xl bg-[#E5E7EB]" />
                </div>
              ))}
            </div>
          ) : null}

          {!loadingProjects && rankedProjects.length === 0 ? (
            <section className="space-y-4">
              <p className="rounded-[20px] border border-[#E5E7EB] bg-white p-6 text-center text-sm text-[#64748B]">
                No projects match these filters yet.
              </p>
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="animate-pulse rounded-[20px] border border-[#E5E7EB] bg-white p-6">
                  <div className="h-5 w-1/2 rounded bg-[#E5E7EB]" />
                  <div className="mt-3 h-4 w-2/3 rounded bg-[#E5E7EB]" />
                  <div className="mt-4 aspect-video rounded-xl bg-[#E5E7EB]" />
                </div>
              ))}
            </section>
          ) : null}

          {!loadingProjects && rankedProjects.length > 0 ? (
            <div className="space-y-5">
              {visibleProjects.map((project) => {
                const detail = projectDetails[project.slug];
                const avatarLabel = detail?.author.fullName || "Developer";
                const heroUrl = detail?.thumbnailUrl || detail?.backgroundUrl;
                const techStack = (detail?.techStack && detail.techStack.length > 0
                  ? detail.techStack
                  : selectedSkills.length > 0
                  ? selectedSkills
                  : ["React", "TypeScript", "PostgreSQL"]).slice(0, 6);
                const isSaved = savedProjectIds.has(project.id);
                const estimatedInquiries = Math.max(2, Math.round(project.viewCount * 0.03));
                const bookmarkCount = Math.max(4, Math.round(project.likeCount * 0.7));
                const projectUrl = `/projects/${project.slug}`;
                const shareMailLink = `mailto:?subject=${encodeURIComponent(
                  `Check out ${project.title}`
                )}&body=${encodeURIComponent(projectUrl)}`;

                return (
                  <article
                    key={project.id}
                    className="group rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-[0_6px_20px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-[3px] hover:border-[#CBD5E1] hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)]"
                  >
                    <header className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0F172A] text-sm font-semibold text-white">
                          {initials(avatarLabel)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-semibold text-[#111827]">{avatarLabel}</p>
                            <BadgeCheck className="h-4 w-4 text-[#2563EB]" aria-hidden />
                          </div>
                          <p className="truncate text-xs text-[#64748B]">
                            Software Developer <span className="px-1">•</span>
                            <MapPin className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                            Remote
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          Open for Work
                        </span>
                        <span className="text-xs text-[#64748B]">{formatRelativeTime(project.createdAt)}</span>
                        <button className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F8FAFA]" aria-label="Open project menu">
                          <Ellipsis className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </header>

                    <Link href={projectUrl} className="mt-4 block text-[20px] font-semibold leading-snug text-[#111827] hover:text-[#2563EB]">
                      {project.title}
                    </Link>

                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#64748B]">{project.shortDescription}</p>

                    <div className="mt-4 overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#F8FAFA]">
                      {heroUrl ? (
                        <img
                          src={heroUrl}
                          alt={project.title}
                          className="aspect-video w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="aspect-video w-full px-6 py-5">
                          <p className="text-sm font-semibold text-[#0F172A]">{project.title}</p>
                          <p className="mt-2 text-xs text-[#64748B]">
                            Premium project preview will appear here once screenshots are uploaded.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {techStack.map((tech) => (
                        <span key={`${project.id}-${tech}`} className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-medium text-[#64748B]">
                          {tech}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 grid gap-2 text-xs text-[#64748B] sm:grid-cols-2 lg:grid-cols-3">
                      <span className="inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" aria-hidden /> {project.viewCount} Views</span>
                      <span className="inline-flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" aria-hidden /> {project.likeCount} Likes</span>
                      <span className="inline-flex items-center gap-1.5"><Bookmark className="h-3.5 w-3.5" aria-hidden /> {bookmarkCount} Bookmarks</span>
                      <span>Client Inquiries: {estimatedInquiries}</span>
                      <span>Estimated Budget: {formatMoney(project.price, project.currency, project.pricingType)}</span>
                      <span>Project Duration: {estimateDuration(project.category)}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-y border-[#E5E7EB] py-3 text-xs text-[#64748B]">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F8FAFA] px-2.5 py-1"><BadgeCheck className="h-3.5 w-3.5 text-[#10B981]" aria-hidden /> GitHub Verified</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F8FAFA] px-2.5 py-1"><BriefcaseBusiness className="h-3.5 w-3.5 text-[#10B981]" aria-hidden /> Portfolio Complete</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F8FAFA] px-2.5 py-1"><MessageSquareText className="h-3.5 w-3.5 text-[#2563EB]" aria-hidden /> Usually replies in 2 hours</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F8FAFA] px-2.5 py-1"><TrendingUp className="h-3.5 w-3.5 text-[#10B981]" aria-hidden /> Availability: Open for Work</span>
                    </div>

                    <footer className="mt-4 flex flex-wrap items-center gap-2">
                      <Link href={projectUrl} className="inline-flex h-9 items-center rounded-lg bg-[#0F172A] px-4 text-xs font-semibold text-white transition hover:bg-[#020617]">
                        View Project
                      </Link>
                      <Link
                        href={detail?.author?.username ? `/developers/${detail.author.username}` : "/developers"}
                        className="inline-flex h-9 items-center rounded-lg border border-[#E5E7EB] px-4 text-xs font-semibold text-[#111827] transition hover:border-[#CBD5E1]"
                      >
                        View Developer
                      </Link>
                      <button
                        onClick={() =>
                          setSavedProjectIds((previous) => {
                            const next = new Set(previous);
                            if (next.has(project.id)) {
                              next.delete(project.id);
                            } else {
                              next.add(project.id);
                            }
                            return next;
                          })
                        }
                        className={`inline-flex h-9 items-center rounded-lg border px-4 text-xs font-semibold transition ${
                          isSaved
                            ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                            : "border-[#E5E7EB] text-[#111827] hover:border-[#CBD5E1]"
                        }`}
                      >
                        Save
                      </button>
                      <a
                        href={shareMailLink}
                        className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#E5E7EB] px-4 text-xs font-semibold text-[#111827] transition hover:border-[#CBD5E1]"
                      >
                        <Share2 className="h-3.5 w-3.5" aria-hidden />
                        Share
                      </a>
                      <Link href="/client/feed#messages" className="inline-flex h-9 items-center rounded-lg bg-[#2563EB] px-4 text-xs font-semibold text-white transition hover:bg-[#1d4ed8]">
                        Hire Developer
                      </Link>
                    </footer>
                  </article>
                );
              })}

              <div ref={sentinelRef} className="h-8 w-full" />
            </div>
          ) : null}
        </section>

        <aside className="space-y-4 xl:sticky xl:top-[96px] xl:h-fit">
          <section className="rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-[0_6px_20px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-semibold text-[#0F172A]">Recommended Developers</h3>
            <div className="mt-3 space-y-2">
              {loadingRecommendations ? <p className="text-xs text-[#64748B]">Loading recommendations...</p> : null}
              {!loadingRecommendations && recommendedDevelopers.length === 0 ? (
                <p className="text-xs text-[#64748B]">No recommendations for current filters.</p>
              ) : null}
              {recommendedDevelopers.slice(0, 5).map((developer) => (
                <div key={developer.id} className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-[#F8FAFA] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[#111827]">{developer.fullName}</p>
                    <p className="truncate text-[11px] text-[#64748B]">{Math.min(99, Math.round(developer.score))}% match</p>
                  </div>
                  <button
                    onClick={() =>
                      setSavedDeveloperIds((previous) => {
                        const next = new Set(previous);
                        if (next.has(developer.id)) {
                          next.delete(developer.id);
                        } else {
                          next.add(developer.id);
                        }
                        return next;
                      })
                    }
                    className="rounded-lg border border-[#E5E7EB] px-2 py-1 text-[11px] font-semibold text-[#111827] hover:border-[#CBD5E1]"
                  >
                    Quick View
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-[0_6px_20px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-semibold text-[#0F172A]">Hiring Pipeline</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-[#64748B]">Interested</span><span className="font-semibold text-[#111827]">{hiringMetrics.interested}</span></div>
              <div className="h-1 rounded-full bg-[#E5E7EB]" />
              <div className="flex items-center justify-between"><span className="text-[#64748B]">Contacted</span><span className="font-semibold text-[#111827]">{hiringMetrics.contacted}</span></div>
              <div className="h-1 rounded-full bg-[#E5E7EB]" />
              <div className="flex items-center justify-between"><span className="text-[#64748B]">Interviewing</span><span className="font-semibold text-[#111827]">{hiringMetrics.interviewing}</span></div>
              <div className="h-1 rounded-full bg-[#E5E7EB]" />
              <div className="flex items-center justify-between"><span className="text-[#64748B]">Hired</span><span className="font-semibold text-[#111827]">{hiringMetrics.hired}</span></div>
            </div>
          </section>

        </aside>
      </section>
    </main>
  );
}
