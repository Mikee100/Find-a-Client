"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MarketplaceNavbar from "@/features/shared/marketplace-navbar";
import { ProjectListItem, listProjects } from "@/lib/api";
import FullPageLoader from "@/components/ui/full-page-loader";

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

  const clearFilters = (): void => {
    setQuery("");
    setCategoryFilter(ALL_FILTER);
    setPricingFilter(ALL_FILTER);
    setSortBy("newest");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-50 text-neutral-900">
        <MarketplaceNavbar />
        <FullPageLoader label="Loading projects" fullScreen={false} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <MarketplaceNavbar />

      <section className="mx-auto w-full max-w-7xl px-3 py-4 md:px-5 md:py-6">
        <div className="mb-3 flex items-end justify-between border-b border-neutral-200 pb-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="mt-0.5 text-xs text-neutral-500">Minimal workspace for browsing and filtering.</p>
          </div>
          <p className="text-xs font-medium text-neutral-500">
            Showing {visibleProjects.length} of {projects.length}
          </p>
        </div>

        <div className="sticky top-14 z-20 border border-neutral-200 bg-white px-2 py-2 shadow-[0_1px_0_rgba(0,0,0,0.02)] md:top-16 md:px-3">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="text-[11px] font-medium text-neutral-500">
              Search
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Title or description"
                className="mt-1 block h-9 w-full border border-neutral-300 bg-white px-2.5 text-sm outline-none transition focus:border-neutral-900"
              />
            </label>

            <label className="text-[11px] font-medium text-neutral-500">
              Category
              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value as ProjectListItem["category"] | typeof ALL_FILTER)
                }
                className="mt-1 block h-9 w-full border border-neutral-300 bg-white px-2.5 text-sm outline-none transition focus:border-neutral-900"
              >
                <option value={ALL_FILTER}>All Categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {formatCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-[11px] font-medium text-neutral-500">
              Pricing
              <select
                value={pricingFilter}
                onChange={(event) =>
                  setPricingFilter(event.target.value as ProjectListItem["pricingType"] | typeof ALL_FILTER)
                }
                className="mt-1 block h-9 w-full border border-neutral-300 bg-white px-2.5 text-sm outline-none transition focus:border-neutral-900"
              >
                <option value={ALL_FILTER}>All Pricing</option>
                <option value="FIXED">Fixed</option>
                <option value="NEGOTIABLE">Negotiable</option>
                <option value="FREE">Free</option>
                <option value="CONTACT">Contact</option>
              </select>
            </label>

            <label className="text-[11px] font-medium text-neutral-500">
              Sort By
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="mt-1 block h-9 w-full border border-neutral-300 bg-white px-2.5 text-sm outline-none transition focus:border-neutral-900"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="mostLiked">Most Liked</option>
                <option value="mostViewed">Most Viewed</option>
                <option value="priceAsc">Price: Low to High</option>
                <option value="priceDesc">Price: High to Low</option>
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="h-9 w-full border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mt-2 flex min-h-6 items-center gap-2 text-xs text-neutral-500">
            <span>{hasActiveFilters ? "Filters active" : "No filters"}</span>
            {query.trim() ? <span className="border border-neutral-200 px-1.5 py-0.5">Query</span> : null}
            {categoryFilter !== ALL_FILTER ? <span className="border border-neutral-200 px-1.5 py-0.5">Category</span> : null}
            {pricingFilter !== ALL_FILTER ? <span className="border border-neutral-200 px-1.5 py-0.5">Pricing</span> : null}
          </div>
        </div>

        {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}

        {!loading && !error && projects.length === 0 ? (
          <div className="mt-3 border border-neutral-300 bg-white p-3 text-sm text-neutral-700">
            No published projects yet. If you just created one, publish it first or open it from the success redirect link.
          </div>
        ) : null}

        {!loading && !error && projects.length > 0 ? (
          <div className="mt-3 overflow-x-auto border border-neutral-200 bg-white">
            <table className="min-w-full table-fixed border-collapse text-sm">
              <thead className="sticky top-0 bg-neutral-100 text-left text-[11px] text-neutral-600">
                <tr>
                  <th className="w-[36%] px-3 py-2 font-medium">Project</th>
                  <th className="w-[16%] px-3 py-2 font-medium">Category</th>
                  <th className="w-[14%] px-3 py-2 font-medium">Price</th>
                  <th className="w-[16%] px-3 py-2 font-medium">Signals</th>
                  <th className="w-[18%] px-3 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {visibleProjects.map((project) => (
                  <tr key={project.id} className="border-t border-neutral-100 align-top transition hover:bg-neutral-50">
                    <td className="px-3 py-2.5">
                      <Link href={`/projects/${project.slug}`} className="text-sm font-semibold text-neutral-900 hover:text-neutral-700">
                        {project.title}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-600">{project.shortDescription}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-neutral-700">
                      {formatCategoryLabel(project.category)}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-medium text-neutral-900">
                      {formatMoney(project.price, project.currency, project.pricingType)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-neutral-700">
                      <div>L {project.likeCount}</div>
                      <div className="mt-0.5">V {project.viewCount}</div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-neutral-700">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && !error && projects.length > 0 && visibleProjects.length === 0 ? (
          <div className="mt-3 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            No projects match your current filters. Try resetting filters or broadening your search.
          </div>
        ) : null}
      </section>
    </main>
  );
}
