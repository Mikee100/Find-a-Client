"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import MarketplaceNavbar from "@/features/shared/marketplace-navbar";
import { ProjectListItem, listProjectsPaginated } from "@/lib/api";
import FullPageLoader from "@/components/ui/full-page-loader";
import BackButton from "@/components/ui/back-button";

type SortOption = "newest" | "oldest" | "mostLiked" | "mostViewed" | "priceAsc" | "priceDesc";

const ALL_FILTER = "ALL";
const PAGE_SIZE = 20;

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

function toServerSort(sortBy: SortOption): "newest" | "oldest" | "popular" | "most_viewed" | "price_asc" | "price_desc" {
  if (sortBy === "mostLiked") {
    return "popular";
  }
  if (sortBy === "mostViewed") {
    return "most_viewed";
  }
  if (sortBy === "priceAsc") {
    return "price_asc";
  }
  if (sortBy === "priceDesc") {
    return "price_desc";
  }
  if (sortBy === "oldest") {
    return "oldest";
  }

  return "newest";
}

function formatCategoryLabel(category: ProjectListItem["category"]): string {
  return category
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCompactDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export default function ProjectsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasLoadedFirstPage, setHasLoadedFirstPage] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ProjectListItem["category"] | typeof ALL_FILTER>(ALL_FILTER);
  const [pricingFilter, setPricingFilter] = useState<ProjectListItem["pricingType"] | typeof ALL_FILTER>(ALL_FILTER);
  const [sortBy, setSortBy] = useState<SortOption>("newest");

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

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const page = await listProjectsPaginated({
          category: categoryFilter === ALL_FILTER ? undefined : categoryFilter,
          pricingType: pricingFilter === ALL_FILTER ? undefined : pricingFilter,
          sortBy: toServerSort(sortBy),
          search: query.trim() || undefined,
          page: currentPage,
          limit: PAGE_SIZE
        });

        if (cancelled) {
          return;
        }

        const resolvedTotalPages = page.meta.totalPages ?? 1;
        if (currentPage > resolvedTotalPages) {
          updatePageInUrl(resolvedTotalPages);
          return;
        }

        setProjects(page.items);
        setTotalPages(resolvedTotalPages);
        setTotalItems(page.meta.totalItems ?? page.items.length);
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        const message = loadError instanceof Error ? loadError.message : "Failed to load projects.";
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHasLoadedFirstPage(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [categoryFilter, currentPage, pricingFilter, query, sortBy, updatePageInUrl]);

  const categoryOptions = useMemo(() => {
    const unique = Array.from(new Set(projects.map((project) => project.category)));
    return unique.sort((left, right) => left.localeCompare(right));
  }, [projects]);

  const visibleProjects = useMemo(() => projects, [projects]);

  const hasActiveFilters = Boolean(query.trim()) || categoryFilter !== ALL_FILTER || pricingFilter !== ALL_FILTER;
  const totalLikes = useMemo(
    () => visibleProjects.reduce((sum, project) => sum + project.likeCount, 0),
    [visibleProjects]
  );
  const totalViews = useMemo(
    () => visibleProjects.reduce((sum, project) => sum + project.viewCount, 0),
    [visibleProjects]
  );

  const clearFilters = (): void => {
    setQuery("");
    setCategoryFilter(ALL_FILTER);
    setPricingFilter(ALL_FILTER);
    setSortBy("newest");
    updatePageInUrl(1);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

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

  if (loading) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] text-neutral-900">
        <MarketplaceNavbar />
        <FullPageLoader label="Loading projects" fullScreen={false} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] text-neutral-900">
      <MarketplaceNavbar />

      <section className="mx-auto w-full max-w-375 px-4 py-5 md:px-6 md:py-8">
        <div className="mb-5 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <BackButton fallbackHref="/" label="Back" className="mb-2" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Marketplace</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Discover Projects</h1>
              <p className="mt-1 text-sm text-slate-600">Clean vertical project feed with dedicated side panels.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-right">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Showing</p>
                <p className="text-sm font-semibold text-slate-900">{visibleProjects.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Likes</p>
                <p className="text-sm font-semibold text-slate-900">{totalLikes}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Views</p>
                <p className="text-sm font-semibold text-slate-900">{totalViews}</p>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
        ) : null}

        {!loading && !error && hasLoadedFirstPage && projects.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-300 bg-white p-5 text-sm text-slate-700">
            No published projects yet. If you just created one, publish it first or open it from the success redirect link.
          </div>
        ) : null}

        {!loading && !error && projects.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,780px)_260px] xl:grid-cols-[280px_minmax(0,820px)_280px]">
            <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] lg:sticky lg:top-24 lg:h-fit">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Filters</p>

              <div className="mt-3 space-y-3">
                <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Search
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      updatePageInUrl(1);
                    }}
                    placeholder="Title or description"
                    className="mt-1 block h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-900"
                  />
                </label>

                <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Category
                  <select
                    value={categoryFilter}
                    onChange={(event) => {
                      setCategoryFilter(event.target.value as ProjectListItem["category"] | typeof ALL_FILTER);
                      updatePageInUrl(1);
                    }}
                    className="mt-1 block h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-900"
                  >
                    <option value={ALL_FILTER}>All Categories</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {formatCategoryLabel(category)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Pricing
                  <select
                    value={pricingFilter}
                    onChange={(event) => {
                      setPricingFilter(event.target.value as ProjectListItem["pricingType"] | typeof ALL_FILTER);
                      updatePageInUrl(1);
                    }}
                    className="mt-1 block h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-900"
                  >
                    <option value={ALL_FILTER}>All Pricing</option>
                    <option value="FIXED">Fixed</option>
                    <option value="NEGOTIABLE">Negotiable</option>
                    <option value="FREE">Free</option>
                    <option value="CONTACT">Contact</option>
                  </select>
                </label>

                <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Sort By
                  <select
                    value={sortBy}
                    onChange={(event) => {
                      setSortBy(event.target.value as SortOption);
                      updatePageInUrl(1);
                    }}
                    className="mt-1 block h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-900"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="mostLiked">Most Liked</option>
                    <option value="mostViewed">Most Viewed</option>
                    <option value="priceAsc">Price: Low to High</option>
                    <option value="priceDesc">Price: High to Low</option>
                  </select>
                </label>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
                >
                  Reset
                </button>
              </div>

              <div className="mt-4 flex min-h-6 flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{hasActiveFilters ? "Filters active" : "No filters"}</span>
                {query.trim() ? <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5">Query</span> : null}
                {categoryFilter !== ALL_FILTER ? <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5">Category</span> : null}
                {pricingFilter !== ALL_FILTER ? <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5">Pricing</span> : null}
              </div>
            </aside>

            <div className="space-y-3 lg:mx-auto lg:w-full">
              {visibleProjects.map((project) => (
                <article
                  key={project.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
                >
                  {project.thumbnailUrl || project.backgroundUrl ? (
                    <Link href={`/projects/${project.slug}`} className="mb-3 block overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      <div className="relative aspect-video w-full">
                        <Image
                          src={project.thumbnailUrl ?? project.backgroundUrl ?? ""}
                          alt={`${project.title} preview`}
                          fill
                          unoptimized
                          className="object-cover transition duration-300 group-hover:scale-[1.02]"
                        />
                      </div>
                    </Link>
                  ) : null}

                  <div className="mb-3 flex items-center justify-between gap-2 text-[11px]">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium uppercase tracking-wide text-slate-600">
                      {formatCategoryLabel(project.category)}
                    </span>
                    <span className="text-slate-500">{formatCompactDate(project.createdAt)}</span>
                  </div>

                  <Link
                    href={`/projects/${project.slug}`}
                    className="line-clamp-2 text-lg font-semibold leading-snug text-slate-900 transition group-hover:text-slate-700"
                  >
                    {project.title}
                  </Link>

                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{project.shortDescription}</p>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <div>
                      <p className="text-xs text-slate-500">Price</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatMoney(project.price, project.currency, project.pricingType)}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-600">
                      <p>Likes {project.likeCount}</p>
                      <p>Views {project.viewCount}</p>
                    </div>
                  </div>
                </article>
              ))}

              {visibleProjects.length > 0 && totalPages > 1 ? (
                <div className="flex justify-center pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => updatePageInUrl(Math.max(1, currentPage - 1))}
                      className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Prev
                    </button>

                    {pageNumbers.map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => updatePageInUrl(pageNumber)}
                        className={`h-9 min-w-9 rounded-lg border px-3 text-xs font-semibold transition ${
                          currentPage === pageNumber
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:border-slate-500 hover:text-slate-900"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => updatePageInUrl(Math.min(totalPages, currentPage + 1))}
                      className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] lg:sticky lg:top-24 lg:h-fit">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Insights</p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Visible</p>
                  <p className="text-sm font-semibold text-slate-900">{visibleProjects.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Total</p>
                  <p className="text-sm font-semibold text-slate-900">{totalItems || projects.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Likes</p>
                  <p className="text-sm font-semibold text-slate-900">{totalLikes}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Views</p>
                  <p className="text-sm font-semibold text-slate-900">{totalViews}</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Popular Categories</p>
                <div className="mt-2 space-y-1.5">
                  {categoryOptions.slice(0, 5).map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setCategoryFilter(category);
                        updatePageInUrl(1);
                      }}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs text-slate-700 transition hover:border-slate-400"
                    >
                      <span>{formatCategoryLabel(category)}</span>
                      <span className="text-slate-500">Set</span>
                    </button>
                  ))}
                  {categoryOptions.length === 0 ? <p className="text-xs text-slate-500">No categories available.</p> : null}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Feed mode</p>
                <p className="mt-1">Projects are now centered and stacked vertically for faster scanning.</p>
              </div>
            </aside>
          </div>
        ) : null}

        {!loading && !error && projects.length > 0 && visibleProjects.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="font-semibold">No projects match your current filters.</p>
            <p className="mt-1">Try resetting filters or broadening your search.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 rounded-xl border border-amber-500 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-900 transition hover:bg-amber-100"
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
