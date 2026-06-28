"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Ellipsis,
  Eye,
  Heart,
  MapPin,
  Search,
  Share2,
  SlidersHorizontal,
  X
} from "lucide-react";
import ClientDashboardNavbar from "@/features/client/client-dashboard-navbar";
import {
  getLikedProjects,
  getProjectBySlug,
  listProjectsPaginated,
  PricingType,
  ProjectCategory,
  ProjectDetail,
  ProjectListItem,
  toggleProjectLike
} from "@/lib/api";
import ClientSidebar from "@/features/shared/client-sidebar";

type JobsListMode = "BEST_MATCHES" | "MOST_RECENT" | "SAVED";
type FeedSortBy = "best_matches" | "newest" | "popular" | "price_asc" | "price_desc";

type FeedFilters = {
  category: "ALL" | ProjectCategory;
  pricingType: "ALL" | PricingType;
  sortBy: FeedSortBy;
  minPrice: string;
  maxPrice: string;
  techStack: string;
  industries: string;
};

const DEFAULT_FEED_FILTERS: FeedFilters = {
  category: "ALL",
  pricingType: "ALL",
  sortBy: "best_matches",
  minPrice: "",
  maxPrice: "",
  techStack: "",
  industries: ""
};

const FEED_PAGE_SIZE = 20;

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

function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function estimateDeliveryWeeks(project: ProjectListItem, detail: ProjectDetail | null | undefined): number {
  const text = `${detail?.longDescription ?? ""} ${project.shortDescription}`;
  const match = text.match(/(\d+(?:\.\d+)?)\s*(week|weeks|month|months|day|days)/i);
  if (match) {
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (unit.startsWith("month")) {
      return Math.max(1, amount * 4);
    }
    if (unit.startsWith("day")) {
      return Math.max(1, amount / 7);
    }
    return Math.max(1, amount);
  }

  const defaults: Record<ProjectCategory, number> = {
    WEB_APP: 6,
    MOBILE_APP: 8,
    API: 5,
    DESKTOP: 7,
    AI_ML: 10,
    ECOMMERCE: 8,
    MANAGEMENT_SYSTEM: 9,
    OTHER: 7
  };

  return defaults[project.category] ?? 7;
}

export default function ClientFeedPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = useMemo(() => searchParams.get("q")?.trim() ?? "", [searchParams]);
  const queryDebounceRef = useRef<number | null>(null);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [projectDetails, setProjectDetails] = useState<Record<string, ProjectDetail | null>>({});
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [jobsListMode, setJobsListMode] = useState<JobsListMode>("BEST_MATCHES");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<FeedFilters>(DEFAULT_FEED_FILTERS);
  const [draftFilters, setDraftFilters] = useState<FeedFilters>(DEFAULT_FEED_FILTERS);
  const [savedProjectIds, setSavedProjectIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") {
      return new Set();
    }

    const saved = window.localStorage.getItem("client-feed-saved-projects");
    if (!saved) {
      return new Set();
    }

    try {
      const ids = JSON.parse(saved) as string[];
      return Array.isArray(ids) ? new Set(ids) : new Set();
    } catch {
      return new Set();
    }
  });
  const [likedProjectIds, setLikedProjectIds] = useState<Set<string>>(new Set());
  const [likingProjectIds, setLikingProjectIds] = useState<Set<string>>(new Set());
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [hiringProjectId, setHiringProjectId] = useState<string | null>(null);
  const [openingDeveloperProjectId, setOpeningDeveloperProjectId] = useState<string | null>(null);
  const [fitBudget, setFitBudget] = useState("");
  const [fitDeadlineWeeks, setFitDeadlineWeeks] = useState("");
  const [fitRequiredStack, setFitRequiredStack] = useState("");

  const currentPage = useMemo(() => {
    const pageParam = Number(searchParams.get("page") ?? "1");
    if (!Number.isFinite(pageParam) || pageParam <= 0) {
      return 1;
    }
    return Math.floor(pageParam);
  }, [searchParams]);

  const updatePageInUrl = useCallback(
    (page: number) => {
      const normalized = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
      const params = new URLSearchParams(searchParams.toString());
      if (normalized > 1) {
        params.set("page", String(normalized));
      } else {
        params.delete("page");
      }
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const debouncedQuery = urlQuery;

  const updateQueryInUrl = useCallback(
    (nextQueryRaw: string) => {
      const nextQuery = nextQueryRaw.trim();
      const params = new URLSearchParams(searchParams.toString());
      if (nextQuery) {
        params.set("q", nextQuery);
      } else {
        params.delete("q");
      }
      params.delete("page");

      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const updateQueryInUrlDebounced = useCallback(
    (nextQueryRaw: string) => {
      if (queryDebounceRef.current !== null) {
        window.clearTimeout(queryDebounceRef.current);
      }

      queryDebounceRef.current = window.setTimeout(() => {
        updateQueryInUrl(nextQueryRaw);
      }, 250);
    },
    [updateQueryInUrl]
  );

  useEffect(() => {
    return () => {
      if (queryDebounceRef.current !== null) {
        window.clearTimeout(queryDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        setLoadingProjects(true);
        setError(null);
        const page = await listProjectsPaginated({
          category: appliedFilters.category === "ALL" ? undefined : appliedFilters.category,
          pricingType: appliedFilters.pricingType === "ALL" ? undefined : appliedFilters.pricingType,
          sortBy: appliedFilters.sortBy,
          search: debouncedQuery.trim() || undefined,
          minPrice: appliedFilters.minPrice.trim() || undefined,
          maxPrice: appliedFilters.maxPrice.trim() || undefined,
          techStack: parseCommaList(appliedFilters.techStack),
          industries: parseCommaList(appliedFilters.industries),
          page: currentPage,
          limit: FEED_PAGE_SIZE
        });

        const resolvedTotalPages = page.meta.totalPages ?? 1;
        if (currentPage > resolvedTotalPages) {
          updatePageInUrl(resolvedTotalPages);
          return;
        }

        setProjects(page.items);
        setTotalPages(resolvedTotalPages);
        setTotalItems(page.meta.totalItems ?? page.items.length);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Failed to load projects.");
      } finally {
        setLoadingProjects(false);
      }
    })();
  }, [appliedFilters, currentPage, debouncedQuery, updatePageInUrl]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  const filteredProjects = useMemo(() => {
    return projects;
  }, [projects]);

  const rankedProjects = useMemo(() => {
    if (jobsListMode === "SAVED") {
      return filteredProjects.filter((project) => savedProjectIds.has(project.id));
    }
    if (jobsListMode === "MOST_RECENT") {
      return [...filteredProjects].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    }

    return filteredProjects;
  }, [filteredProjects, jobsListMode, savedProjectIds]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("client-feed-saved-projects", JSON.stringify(Array.from(savedProjectIds)));
  }, [savedProjectIds]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const liked = await getLikedProjects();
        if (!active) {
          return;
        }

        setLikedProjectIds(new Set(liked.map((entry) => entry.projectId)));
      } catch {
        if (active) {
          setLikedProjectIds(new Set());
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isFilterModalOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFilterModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFilterModalOpen]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.category !== "ALL") count += 1;
    if (appliedFilters.pricingType !== "ALL") count += 1;
    if (appliedFilters.sortBy !== "best_matches") count += 1;
    if (appliedFilters.minPrice.trim()) count += 1;
    if (appliedFilters.maxPrice.trim()) count += 1;
    if (parseCommaList(appliedFilters.techStack).length) count += 1;
    if (parseCommaList(appliedFilters.industries).length) count += 1;
    return count;
  }, [appliedFilters]);

  const visibleProjects = useMemo(() => rankedProjects, [rankedProjects]);

  const fitRankedProjects = useMemo(() => {
    const requiredStack = parseCommaList(fitRequiredStack).map((item) => item.toLowerCase());
    const inputBudget = Number(fitBudget);
    const hasBudgetInput = Number.isFinite(inputBudget) && inputBudget > 0;
    const inputDeadline = Number(fitDeadlineWeeks);
    const hasDeadlineInput = Number.isFinite(inputDeadline) && inputDeadline > 0;

    return rankedProjects
      .map((project) => {
        const detail = projectDetails[project.slug];

        const projectStack = (detail?.techStack ?? project.techStack ?? []).map((item) => item.toLowerCase());
        const matchedStackCount = requiredStack.filter((item) => projectStack.includes(item)).length;
        const stackScore = requiredStack.length > 0 ? Math.round((matchedStackCount / requiredStack.length) * 100) : 70;

        const numericPrice = typeof project.price === "string" ? Number(project.price) : project.price;
        const hasFixedPrice = project.pricingType === "FIXED" && Number.isFinite(numericPrice) && (numericPrice ?? 0) > 0;

        let budgetScore = 70;
        if (hasBudgetInput && hasFixedPrice) {
          const ratio = inputBudget / Number(numericPrice);
          if (ratio >= 1) {
            budgetScore = 100;
          } else if (ratio >= 0.8) {
            budgetScore = 75;
          } else if (ratio >= 0.6) {
            budgetScore = 50;
          } else {
            budgetScore = 20;
          }
        } else if (hasBudgetInput && !hasFixedPrice) {
          budgetScore = 65;
        }

        const estimatedWeeks = estimateDeliveryWeeks(project, detail);
        let timelineScore = 70;
        if (hasDeadlineInput) {
          const ratio = inputDeadline / estimatedWeeks;
          if (ratio >= 1) {
            timelineScore = 100;
          } else if (ratio >= 0.8) {
            timelineScore = 70;
          } else if (ratio >= 0.6) {
            timelineScore = 40;
          } else {
            timelineScore = 15;
          }
        }

        const score = Math.round(budgetScore * 0.4 + timelineScore * 0.3 + stackScore * 0.3);

        return {
          project,
          score,
          budgetScore,
          timelineScore,
          stackScore,
          matchedStackCount,
          requiredStackCount: requiredStack.length,
          estimatedWeeks
        };
      })
      .sort((left, right) => right.score - left.score);
  }, [fitBudget, fitDeadlineWeeks, fitRequiredStack, projectDetails, rankedProjects]);

  const topFitMatches = useMemo(() => fitRankedProjects.slice(0, 2), [fitRankedProjects]);
  const topFit = topFitMatches[0] ?? null;
  const deadlineWeeksInput = useMemo(() => {
    const value = Number(fitDeadlineWeeks);
    return Number.isFinite(value) && value > 0 ? value : null;
  }, [fitDeadlineWeeks]);

  const buildRecommendationReasons = useCallback(
    (item: (typeof topFitMatches)[number]): string[] => {
      const reasons: string[] = [];

      if (item.requiredStackCount > 0) {
        if (item.matchedStackCount > 0) {
          reasons.push(`Similar stack match (${item.matchedStackCount}/${item.requiredStackCount} technologies aligned).`);
        } else {
          reasons.push("Relevant project category and build style for your stated stack needs.");
        }
      } else {
        reasons.push("Similar stack potential based on this project's implementation profile.");
      }

      if (deadlineWeeksInput !== null) {
        if (item.estimatedWeeks <= deadlineWeeksInput) {
          reasons.push(`Timeline compatibility: estimated ~${item.estimatedWeeks.toFixed(1)} weeks fits your target.`);
        } else {
          reasons.push(`Timeline compatibility needs discussion: estimated ~${item.estimatedWeeks.toFixed(1)} weeks.`);
        }
      } else {
        reasons.push(`Timeline compatibility estimate: ~${item.estimatedWeeks.toFixed(1)} weeks.`);
      }

      const engagementSignal = item.project.likeCount * 2 + item.project.inquiryCount * 3 + item.project.viewCount / 20;
      if (engagementSignal >= 25) {
        reasons.push("High response reliability indicated by strong portfolio engagement.");
      } else if (engagementSignal >= 10) {
        reasons.push("Solid response reliability indicated by active client engagement.");
      } else {
        reasons.push("Emerging response reliability with early engagement signals.");
      }

      reasons.push(`Relevant project category: ${item.project.category.replace(/_/g, " ").toLowerCase()}.`);

      return reasons;
    },
    [deadlineWeeksInput]
  );

  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) {
      return [] as number[];
    }

    const windowSize = 5;
    const start = Math.max(1, currentPage - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    const adjustedStart = Math.max(1, end - windowSize + 1);

    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  }, [currentPage, totalPages]);

  function toggleSavedProject(id: string) {
    setSavedProjectIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function onToggleLikeProject(project: ProjectListItem) {
    setLikingProjectIds((previous) => new Set(previous).add(project.id));

    try {
      const result = await toggleProjectLike(project.slug);

      setLikedProjectIds((previous) => {
        const next = new Set(previous);
        if (result.liked) {
          next.add(project.id);
        } else {
          next.delete(project.id);
        }
        return next;
      });

      setProjects((previous) =>
        previous.map((entry) => (entry.id === project.id ? { ...entry, likeCount: result.likeCount } : entry))
      );

      setProjectDetails((previous) => {
        const current = previous[project.slug];
        if (!current) {
          return previous;
        }

        return {
          ...previous,
          [project.slug]: {
            ...current,
            likeCount: result.likeCount
          }
        };
      });
    } catch (caughtError) {
      setActionMessage(caughtError instanceof Error ? caughtError.message : "Unable to update like right now.");
    } finally {
      setLikingProjectIds((previous) => {
        const next = new Set(previous);
        next.delete(project.id);
        return next;
      });
    }
  }

  async function onShareProject(project: ProjectListItem) {
    const absoluteUrl = typeof window !== "undefined" ? `${window.location.origin}/projects/${project.slug}` : `/projects/${project.slug}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: project.title, url: absoluteUrl });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(absoluteUrl);
        setActionMessage("Project link copied.");
        return;
      }
      window.open(
        `mailto:?subject=${encodeURIComponent(`Check out ${project.title}`)}&body=${encodeURIComponent(absoluteUrl)}`,
        "_self"
      );
    } catch (caughtError) {
      setActionMessage(caughtError instanceof Error ? caughtError.message : "Unable to share right now.");
    }
  }

  async function onViewDeveloper(project: ProjectListItem, detail: ProjectDetail | null | undefined) {
    try {
      setOpeningDeveloperProjectId(project.id);
      const cachedUsername = project.author?.username;
      if (cachedUsername) {
        router.push(`/developers/${cachedUsername}`);
        return;
      }

      let resolvedDetail = detail;
      if (!resolvedDetail) {
        resolvedDetail = await getProjectBySlug(project.slug, { trackView: false });
        setProjectDetails((previous) => ({
          ...previous,
          [project.slug]: resolvedDetail || null
        }));
      }

      const username = resolvedDetail?.author?.username;
      if (!username) {
        setActionMessage("Developer profile is unavailable for this project.");
        return;
      }

      router.push(`/developers/${username}`);
    } catch (caughtError) {
      setActionMessage(caughtError instanceof Error ? caughtError.message : "Unable to open developer profile.");
    } finally {
      setOpeningDeveloperProjectId(null);
    }
  }

  async function onHireDeveloper(project: ProjectListItem, detail: ProjectDetail | null | undefined) {
    try {
      setHiringProjectId(project.id);

      const cachedAuthorId = project.author?.id;
      const cachedAuthorUsername = project.author?.username;

      if (cachedAuthorId && cachedAuthorUsername) {
        const params = new URLSearchParams({
          projectId: project.id,
          projectSlug: project.slug,
          projectTitle: project.title
        });
        router.push(`/hire/${cachedAuthorUsername}?${params.toString()}`);
        return;
      }

      let resolvedDetail = detail;
      if (!resolvedDetail) {
        resolvedDetail = await getProjectBySlug(project.slug, { trackView: false });
        setProjectDetails((previous) => ({
          ...previous,
          [project.slug]: resolvedDetail || null
        }));
      }

      if (!resolvedDetail?.author?.id || !resolvedDetail.author.username) {
        setActionMessage("Developer profile is unavailable for this project.");
        return;
      }

      const params = new URLSearchParams({
        projectId: project.id,
        projectSlug: project.slug,
        projectTitle: project.title
      });
      router.push(`/hire/${resolvedDetail.author.username}?${params.toString()}`);
    } catch (caughtError) {
      setActionMessage(caughtError instanceof Error ? caughtError.message : "Unable to start hiring conversation.");
    } finally {
      setHiringProjectId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] font-sans text-slate-900">
      <ClientDashboardNavbar />

      <section className="mx-auto w-full max-w-340 px-4 pb-8 pt-4 md:px-6 md:pb-8 md:pt-3">
        <section className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Search for projects</p>
                <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-900">Projects you might like</h1>
                <p className="mt-0.5 text-xs text-slate-500">
                  Explore production-ready work from developers around the world.
                </p>
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" aria-hidden />
                <input
                  key={urlQuery}
                  defaultValue={urlQuery}
                  onChange={(event) => {
                    updateQueryInUrlDebounced(event.target.value);
                  }}
                  placeholder="Search developers, projects, technologies..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setDraftFilters(appliedFilters);
                  setIsFilterModalOpen(true);
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold uppercase tracking-wider text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                Filter
                {activeFilterCount > 0 ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[11px] font-semibold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            </div>

            <div className="mt-3.5 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setJobsListMode("BEST_MATCHES");
                }}
                className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition ${
                  jobsListMode === "BEST_MATCHES"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-900 hover:text-slate-900"
                }`}
              >
                Best Matches
              </button>
              <button
                onClick={() => {
                  setJobsListMode("MOST_RECENT");
                }}
                className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition ${
                  jobsListMode === "MOST_RECENT"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-900 hover:text-slate-900"
                }`}
              >
                Most Recent
              </button>
              <button
                onClick={() => {
                  setJobsListMode("SAVED");
                }}
                className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition ${
                  jobsListMode === "SAVED"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-900 hover:text-slate-900"
                }`}
              >
                Saved Projects ({savedProjectIds.size})
              </button>
            </div>
          </section>

          {actionMessage ? (
            <section className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              {actionMessage}
            </section>
          ) : null}

          {error ? (
            <section className="rounded-[20px] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </section>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[160px_minmax(0,1fr)_250px] xl:grid-cols-[180px_minmax(0,1fr)_270px]">
            <aside className="space-y-4 lg:sticky lg:top-22 lg:self-start">
              <ClientSidebar />
            </aside>

            <div className="space-y-4">
              {loadingProjects ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4">
                      <div className="h-4 w-2/5 rounded bg-slate-200" />
                      <div className="mt-3 h-6 w-4/5 rounded bg-slate-200" />
                      <div className="mt-2 h-4 w-3/4 rounded bg-slate-200" />
                      <div className="mt-4 aspect-video rounded-xl bg-slate-200" />
                    </div>
                  ))}
                </div>
              ) : null}

              {!loadingProjects && rankedProjects.length === 0 ? (
                <section className="space-y-4">
                  <p className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
                    No projects match these filters yet.
                  </p>
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4">
                      <div className="h-5 w-1/2 rounded bg-slate-200" />
                      <div className="mt-3 h-4 w-2/3 rounded bg-slate-200" />
                      <div className="mt-4 aspect-video rounded-xl bg-slate-200" />
                    </div>
                  ))}
                </section>
              ) : null}

              {!loadingProjects && rankedProjects.length > 0 ? (
                <div className="space-y-4">
                  {visibleProjects.map((project) => {
                    const detail = projectDetails[project.slug];
                    const avatarLabel = detail?.author.fullName || project.author?.fullName || "Developer";
                    const heroUrl = detail?.thumbnailUrl || detail?.backgroundUrl || project.thumbnailUrl || project.backgroundUrl;
                    const techStack = (detail?.techStack && detail.techStack.length > 0
                      ? detail.techStack
                      : project.techStack || []).slice(0, 6);
                    const isSaved = savedProjectIds.has(project.id);
                    const isLiked = likedProjectIds.has(project.id);
                    const isLiking = likingProjectIds.has(project.id);
                    const inquiryCount = detail?.inquiryCount ?? project.inquiryCount ?? 0;
                    const projectUrl = `/projects/${project.slug}`;

                    return (
                      <article
                        key={project.id}
                        className="group rounded-xl border border-slate-200 bg-white p-4 md:p-5 transition duration-200 hover:border-slate-900"
                      >
                    <header className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0F172A] text-sm font-semibold text-white">
                          {initials(avatarLabel)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-semibold text-slate-900">{avatarLabel}</p>
                            <BadgeCheck className="h-4 w-4 text-slate-900" aria-hidden />
                          </div>
                          <p className="truncate text-xs text-slate-500">
                            Software Developer <span className="px-1">•</span>
                            <MapPin className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                            Remote
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                          Open for Work
                        </span>
                        <span className="text-xs text-slate-500">{formatRelativeTime(project.createdAt)}</span>
                        <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50" aria-label="Open project menu">
                          <Ellipsis className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </header>

                    <Link href={projectUrl} className="mt-3 block line-clamp-2 text-lg font-semibold leading-snug text-slate-900 hover:text-slate-600">
                      {project.title}
                    </Link>

                    <p className="mt-2 line-clamp-3 text-sm leading-5 text-slate-500">{project.shortDescription}</p>

                    <div className="mt-4 overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#F8FAFA]">
                      {heroUrl ? (
                        <div className="relative aspect-video w-full">
                          <Image
                            src={heroUrl}
                            alt={project.title}
                            fill
                            unoptimized
                            className="object-cover transition duration-200 group-hover:scale-[1.03]"
                          />
                        </div>
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
                      {techStack.length > 0 ? techStack.map((tech) => (
                        <span key={`${project.id}-${tech}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                          {tech}
                        </span>
                      )) : (
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                          No tech stack provided
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-3">
                      <span className="inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" aria-hidden /> {project.viewCount} Views</span>
                      <span className="inline-flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" aria-hidden /> {project.likeCount} Likes</span>
                      <span>Client Inquiries: {inquiryCount}</span>
                      <span>Estimated Budget: {formatMoney(project.price, project.currency, project.pricingType)}</span>
                      <span>Category: {project.category.replace(/_/g, " ")}</span>
                    </div>

                    <footer className="mt-4 flex flex-wrap items-center gap-2">
                      <Link href={projectUrl} className="inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-black">
                        View Project
                      </Link>
                      <button
                        onClick={() => {
                          void onToggleLikeProject(project);
                        }}
                        disabled={isLiking}
                        className={`inline-flex h-10 items-center gap-1 rounded-lg border px-4 text-xs font-semibold transition disabled:opacity-60 ${
                          isLiked
                            ? "border-rose-300 bg-rose-50 text-rose-700"
                            : "border-slate-200 text-slate-700 hover:border-slate-900 hover:text-slate-900"
                        }`}
                      >
                        <Heart className="h-3.5 w-3.5" aria-hidden />
                        {isLiking ? "Updating..." : isLiked ? "Liked" : "Like"}
                      </button>
                      <button
                        onClick={() => {
                          void onViewDeveloper(project, detail);
                        }}
                        disabled={openingDeveloperProjectId === project.id}
                        className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900 disabled:opacity-60"
                      >
                        {openingDeveloperProjectId === project.id ? "Opening..." : "View Developer"}
                      </button>
                      <button
                        onClick={() => toggleSavedProject(project.id)}
                        className={`inline-flex h-10 items-center rounded-lg border px-4 text-xs font-semibold transition ${
                          isSaved
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 text-slate-700 hover:border-slate-900 hover:text-slate-900"
                        }`}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => onShareProject(project)}
                        className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                      >
                        <Share2 className="h-3.5 w-3.5" aria-hidden />
                        Share
                      </button>
                      <button
                        onClick={() => onHireDeveloper(project, detail)}
                        disabled={hiringProjectId === project.id}
                        className="inline-flex h-10 items-center rounded-lg border border-slate-900 bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-black disabled:opacity-60"
                      >
                        {hiringProjectId === project.id ? "Starting..." : "Hire Developer"}
                      </button>
                    </footer>
                      </article>
                    );
                  })}

                  {totalPages > 1 ? (
                    <div className="flex justify-center pt-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={currentPage <= 1}
                          onClick={() => updatePageInUrl(Math.max(1, currentPage - 1))}
                          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Prev
                        </button>

                        {pageNumbers.map((pageNumber) => (
                          <button
                            key={pageNumber}
                            type="button"
                            onClick={() => updatePageInUrl(pageNumber)}
                            className={`h-10 min-w-10 rounded-lg border px-3 text-xs font-semibold transition ${
                              currentPage === pageNumber
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-900 hover:text-slate-900"
                            }`}
                          >
                            {pageNumber}
                          </button>
                        ))}

                        <button
                          type="button"
                          disabled={currentPage >= totalPages}
                          onClick={() => updatePageInUrl(Math.min(totalPages, currentPage + 1))}
                          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {!loadingProjects && projects.length > 0 ? (
                <p className="text-center text-xs text-slate-500">Page {currentPage} of {Math.max(totalPages, 1)} • {totalItems} total projects</p>
              ) : null}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-22 lg:self-start">
              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">Recommendation Reasons</h2>
                </div>

                <p className="mt-1 text-[11px] text-slate-500">Why these projects match your needs.</p>

                <div className="mt-2.5 space-y-2">
                  <label className="block text-[11px] font-medium text-slate-500">
                    Budget (USD)
                    <input
                      type="number"
                      min={0}
                      step="100"
                      value={fitBudget}
                      onChange={(event) => setFitBudget(event.target.value)}
                      placeholder="e.g. 5000"
                      className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none focus:border-slate-900"
                    />
                  </label>

                  <label className="block text-[11px] font-medium text-slate-500">
                    Deadline (weeks)
                    <input
                      type="number"
                      min={1}
                      step="1"
                      value={fitDeadlineWeeks}
                      onChange={(event) => setFitDeadlineWeeks(event.target.value)}
                      placeholder="e.g. 6"
                      className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none focus:border-slate-900"
                    />
                  </label>

                  <label className="block text-[11px] font-medium text-slate-500">
                    Required stack
                    <input
                      value={fitRequiredStack}
                      onChange={(event) => setFitRequiredStack(event.target.value)}
                      placeholder="React, Node.js, PostgreSQL"
                      className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none focus:border-slate-900"
                    />
                  </label>
                </div>

                {topFit ? (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                    <p className="text-xs font-semibold text-slate-900">Top: {topFit.project.title}</p>
                    <div className="mt-1.5 space-y-1">
                      {buildRecommendationReasons(topFit).map((reason) => (
                        <p key={reason} className="text-[11px] text-slate-500">- {reason}</p>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Recommended projects</p>
                  {topFitMatches.length > 0 ? (
                    topFitMatches.map((item) => (
                      <Link
                        key={item.project.id}
                        href={`/projects/${item.project.slug}`}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 hover:border-slate-900"
                      >
                        <span className="line-clamp-1 pr-2">{item.project.title}</span>
                        <span className="font-semibold text-slate-700">{item.project.category.replace(/_/g, " ")}</span>
                      </Link>
                    ))
                  ) : (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-500">No recommendation reasons yet.</p>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </section>
      </section>

      {isFilterModalOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/35">
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-semibold text-slate-900">Project Filters</h2>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50"
                aria-label="Close filters"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="mt-4 grid gap-4">
              <label className="text-xs font-medium text-slate-500">
                Category
                <select
                  value={draftFilters.category}
                  onChange={(event) => setDraftFilters((prev) => ({ ...prev, category: event.target.value as FeedFilters["category"] }))}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                >
                  <option value="ALL">All</option>
                  <option value="WEB_APP">Web App</option>
                  <option value="MOBILE_APP">Mobile App</option>
                  <option value="API">API</option>
                  <option value="DESKTOP">Desktop</option>
                  <option value="AI_ML">AI / ML</option>
                  <option value="ECOMMERCE">Ecommerce</option>
                  <option value="MANAGEMENT_SYSTEM">Management System</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>

              <label className="text-xs font-medium text-slate-500">
                Pricing
                <select
                  value={draftFilters.pricingType}
                  onChange={(event) => setDraftFilters((prev) => ({ ...prev, pricingType: event.target.value as FeedFilters["pricingType"] }))}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                >
                  <option value="ALL">All</option>
                  <option value="FIXED">Fixed</option>
                  <option value="NEGOTIABLE">Negotiable</option>
                  <option value="FREE">Free</option>
                  <option value="CONTACT">Contact</option>
                </select>
              </label>

              <label className="text-xs font-medium text-slate-500">
                Sort by
                <select
                  value={draftFilters.sortBy}
                  onChange={(event) => setDraftFilters((prev) => ({ ...prev, sortBy: event.target.value as FeedSortBy }))}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                >
                  <option value="best_matches">Best Matches</option>
                  <option value="newest">Newest</option>
                  <option value="popular">Popular</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </label>

              <label className="text-xs font-medium text-slate-500">
                Tech Stack (comma-separated)
                <input
                  value={draftFilters.techStack}
                  onChange={(event) => setDraftFilters((prev) => ({ ...prev, techStack: event.target.value }))}
                  placeholder="React, Next.js, Node.js"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                />
              </label>

              <label className="text-xs font-medium text-slate-500">
                Industries (comma-separated)
                <input
                  value={draftFilters.industries}
                  onChange={(event) => setDraftFilters((prev) => ({ ...prev, industries: event.target.value }))}
                  placeholder="Fintech, Healthcare"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium text-slate-500">
                  Min Price
                  <input
                    value={draftFilters.minPrice}
                    onChange={(event) => setDraftFilters((prev) => ({ ...prev, minPrice: event.target.value }))}
                    inputMode="numeric"
                    placeholder="0"
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                  />
                </label>
                <label className="text-xs font-medium text-slate-500">
                  Max Price
                  <input
                    value={draftFilters.maxPrice}
                    onChange={(event) => setDraftFilters((prev) => ({ ...prev, maxPrice: event.target.value }))}
                    inputMode="numeric"
                    placeholder="10000"
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                  />
                </label>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  setDraftFilters(DEFAULT_FEED_FILTERS);
                  setAppliedFilters(DEFAULT_FEED_FILTERS);
                  updatePageInUrl(1);
                  setIsFilterModalOpen(false);
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:border-slate-900 hover:text-slate-900"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => {
                  setAppliedFilters(draftFilters);
                  updatePageInUrl(1);
                  setIsFilterModalOpen(false);
                }}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
