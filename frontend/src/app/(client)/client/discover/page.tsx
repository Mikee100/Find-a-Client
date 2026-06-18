"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import ContactModal from "@/features/client/contact-modal";
import DashboardNavbar from "@/features/shared/dashboard-navbar";
import { listProjects, logout, PricingType, ProjectCategory, ProjectSummary, searchProjects } from "@/lib/api";
import { readTokens } from "@/lib/auth";

const categories: Array<{ label: string; value: ProjectCategory | "" }> = [
  { label: "All categories", value: "" },
  { label: "Web app", value: "WEB_APP" },
  { label: "Mobile app", value: "MOBILE_APP" },
  { label: "API", value: "API" },
  { label: "AI / ML", value: "AI_ML" },
  { label: "Ecommerce", value: "ECOMMERCE" },
  { label: "Management system", value: "MANAGEMENT_SYSTEM" },
  { label: "Other", value: "OTHER" }
];

const budgetOptions = [
  { label: "Any budget", value: "" },
  { label: "Under $1k", value: "0-1000" },
  { label: "$1k - $5k", value: "1000-5000" },
  { label: "$5k+", value: "5000-" }
];

function formatCategory(category: string): string {
  return category.replace(/_/g, " ").toLowerCase();
}

function formatPrice(project: ProjectSummary): string {
  if (project.pricingType === "FREE") {
    return "Free";
  }

  if (project.pricingType === "NEGOTIABLE") {
    return project.price ? `${project.currency} ${project.price} negotiable` : "Negotiable";
  }

  if (project.pricingType === "CONTACT" || project.price === null || project.price === undefined) {
    return "Contact for pricing";
  }

  return `${project.currency} ${project.price}`;
}

function budgetToParams(value: string): { minPrice?: string; maxPrice?: string } {
  if (!value) {
    return {};
  }

  const [minPrice, maxPrice] = value.split("-");
  return {
    minPrice: minPrice || undefined,
    maxPrice: maxPrice || undefined
  };
}

export default function ClientDiscoverPage() {
  const router = useRouter();
  const initialTokens = useMemo(() => readTokens(), []);
  const [pendingLogout, setPendingLogout] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loadingState, setLoadingState] = useState("Loading marketplace projects...");
  const [activeModal, setActiveModal] = useState<{ mode: "message" | "hire"; project: ProjectSummary } | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    category: "" as ProjectCategory | "",
    skill: "",
    availability: "",
    budget: "",
    pricingType: "" as PricingType | ""
  });

  useEffect(() => {
    if (!initialTokens) {
      router.replace("/login");
    }
  }, [initialTokens, router]);

  useEffect(() => {
    const sort = new URLSearchParams(window.location.search).get("sort");
    if (sort === "popular") {
      loadProjects({ sortBy: "popular" });
      return;
    }

    loadProjects();
  }, []);

  async function loadProjects(params?: { sortBy?: "popular" }) {
    try {
      setLoadingState("Loading marketplace projects...");
      const items = await listProjects({ limit: "24", sortBy: params?.sortBy ?? "newest" });
      setProjects(items);
      setLoadingState(items.length ? "Showing published marketplace projects." : "No published projects found.");
    } catch (error) {
      setLoadingState(error instanceof Error ? error.message : "Marketplace projects could not be loaded.");
    }
  }

  async function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setLoadingState("Searching marketplace...");
      const budgetParams = budgetToParams(filters.budget);
      const items = filters.skill
        ? await searchProjects({
            q: filters.search || undefined,
            category: filters.category || undefined,
            tech: filters.skill || undefined
          })
        : await listProjects({
            search: filters.search || undefined,
            category: filters.category || undefined,
            pricingType: filters.pricingType || undefined,
            minPrice: budgetParams.minPrice,
            maxPrice: budgetParams.maxPrice,
            limit: "24"
          });

      setProjects(items);
      setLoadingState(items.length ? "Search results loaded." : "No matches for those filters.");
    } catch (error) {
      setLoadingState(error instanceof Error ? error.message : "Search could not be completed.");
    }
  }

  async function onLogout() {
    setPendingLogout(true);
    await logout();
    router.replace("/login");
  }

  if (!initialTokens) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <DashboardNavbar roleLabel="Client" onSignOut={onLogout} pendingSignOut={pendingLogout} />

      <section className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Client discovery</p>
              <h1 className="mt-2 text-2xl font-semibold text-neutral-950 md:text-3xl">Browse developers through their published work</h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                Search by project, category, skill, budget, or pricing model. Message developers from confirmed project records.
              </p>
            </div>
            <Link href="/client/dashboard" className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-center text-sm font-semibold text-neutral-800">
              Back to workspace
            </Link>
          </div>
        </div>

        <form onSubmit={onSearch} className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
            <input
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="Search projects, products, or outcomes"
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <select
              value={filters.category}
              onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value as ProjectCategory | "" }))}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
            >
              {categories.map((category) => (
                <option key={category.label} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            <input
              value={filters.skill}
              onChange={(event) => setFilters((prev) => ({ ...prev, skill: event.target.value.trim() }))}
              placeholder="Skill or tech"
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <select
              value={filters.budget}
              onChange={(event) => setFilters((prev) => ({ ...prev, budget: event.target.value }))}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
            >
              {budgetOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <select
              value={filters.availability}
              onChange={(event) => setFilters((prev) => ({ ...prev, availability: event.target.value }))}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Any availability</option>
              <option value="now">Available now</option>
              <option value="soon">Available soon</option>
            </select>
            <select
              value={filters.pricingType}
              onChange={(event) => setFilters((prev) => ({ ...prev, pricingType: event.target.value as PricingType | "" }))}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Any pricing</option>
              <option value="FIXED">Fixed</option>
              <option value="NEGOTIABLE">Negotiable</option>
              <option value="FREE">Free</option>
              <option value="CONTACT">Contact</option>
            </select>
            <button type="submit" className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
              Search
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-neutral-600">{loadingState}</p>
          <p className="text-sm font-semibold text-neutral-900">{projects.length} results</p>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-6">
            <p className="text-base font-semibold text-neutral-900">No developers or projects to show yet</p>
            <p className="mt-1 text-sm text-neutral-600">Try fewer filters, or check again after developers publish projects.</p>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          {projects.map((project) => (
            <article key={project.id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
                      {formatCategory(project.category)}
                    </span>
                    {project.isFeatured ? (
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Featured</span>
                    ) : null}
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-neutral-950">{project.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{project.shortDescription}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-neutral-900">{formatPrice(project)}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {project.techStack.slice(0, 6).map((tech) => (
                  <span key={tech} className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">
                    {tech}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <Link href={`/client/discover/${project.slug}`} className="rounded-md border border-neutral-300 px-3 py-2 text-center text-sm font-semibold text-neutral-800">
                  View Profile
                </Link>
                <button onClick={() => setActiveModal({ mode: "message", project })} className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800">
                  Message
                </button>
                <button onClick={() => setActiveModal({ mode: "hire", project })} className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white">
                  Send Hire Request
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {activeModal ? (
        <ContactModal
          mode={activeModal.mode}
          project={activeModal.project}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
    </main>
  );
}
