"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MarketplaceNavbar from "@/features/shared/marketplace-navbar";
import { ProjectListItem, listProjects } from "@/lib/api";
import FullPageLoader from "@/components/ui/full-page-loader";
import BackButton from "@/components/ui/back-button";

type SortOption = "newest" | "oldest" | "mostLiked" | "mostViewed" | "priceAsc" | "priceDesc";

const ALL_FILTER = "ALL";

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

function toNumberPrice(price: number | string | null): number | null {
  if (price === null || price === undefined) {
    return null;
  }

  const numericPrice = typeof price === "string" ? Number(price) : price;
  return Number.isFinite(numericPrice) ? numericPrice : null;
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
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ProjectListItem["category"] | typeof ALL_FILTER>(ALL_FILTER);
  const [pricingFilter, setPricingFilter] = useState<ProjectListItem["pricingType"] | typeof ALL_FILTER>(ALL_FILTER);
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  useEffect(() => {
    void (async () => {
      try {
        const items = await listProjects();
        setProjects(items);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Failed to load projects.";
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categoryOptions = useMemo(() => {
    const unique = Array.from(new Set(projects.map((project) => project.category)));
    return unique.sort((left, right) => left.localeCompare(right));
  }, [projects]);

  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = projects.filter((project) => {
      if (categoryFilter !== ALL_FILTER && project.category !== categoryFilter) {
        return false;
      }

      if (pricingFilter !== ALL_FILTER && project.pricingType !== pricingFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        project.title.toLowerCase().includes(normalizedQuery) ||
        project.shortDescription.toLowerCase().includes(normalizedQuery)
      );
    });

    return filtered.sort((left, right) => {
      switch (sortBy) {
        case "oldest":
          return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
        case "mostLiked":
          return right.likeCount - left.likeCount;
        case "mostViewed":
          return right.viewCount - left.viewCount;
        case "priceAsc": {
          const leftPrice = toNumberPrice(left.price);
          const rightPrice = toNumberPrice(right.price);
          if (leftPrice === null && rightPrice === null) {
            return 0;
          }
          if (leftPrice === null) {
            return 1;
          }
          if (rightPrice === null) {
            return -1;
          }
          return leftPrice - rightPrice;
        }
        case "priceDesc": {
          const leftPrice = toNumberPrice(left.price);
          const rightPrice = toNumberPrice(right.price);
          if (leftPrice === null && rightPrice === null) {
            return 0;
          }
          if (leftPrice === null) {
            return 1;
          }
          if (rightPrice === null) {
            return -1;
          }
          return rightPrice - leftPrice;
        }
        case "newest":
        default:
          return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }
    });
  }, [categoryFilter, pricingFilter, projects, query, sortBy]);

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
  };

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

        {!loading && !error && projects.length === 0 ? (
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
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Title or description"
                    className="mt-1 block h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-900"
                  />
                </label>

                <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Category
                  <select
                    value={categoryFilter}
                    onChange={(event) =>
                      setCategoryFilter(event.target.value as ProjectListItem["category"] | typeof ALL_FILTER)
                    }
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
                    onChange={(event) =>
                      setPricingFilter(event.target.value as ProjectListItem["pricingType"] | typeof ALL_FILTER)
                    }
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
                    onChange={(event) => setSortBy(event.target.value as SortOption)}
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
                  <p className="text-sm font-semibold text-slate-900">{projects.length}</p>
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
                      onClick={() => setCategoryFilter(category)}
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
