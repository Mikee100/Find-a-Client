"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MarketplaceNavbar from "@/features/shared/marketplace-navbar";
import { ProjectListItem, listProjects } from "@/lib/api";

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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="min-h-screen bg-neutral-50">
      <MarketplaceNavbar />

      <section className="mx-auto w-full max-w-6xl p-4 md:p-6">
        <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4">
          <h1 className="text-2xl font-semibold text-neutral-900">Projects</h1>
          <p className="mt-1 text-sm text-neutral-600">Browse published projects from the marketplace.</p>
        </div>

        {loading ? <p className="text-sm text-neutral-600">Loading projects...</p> : null}
        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

        {!loading && !error && projects.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
            No published projects yet. If you just created one, publish it first or open it from the success redirect link.
          </div>
        ) : null}

        <div className="grid gap-3">
          {projects.map((project) => (
            <article key={project.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-neutral-900">
                  <Link href={`/projects/${project.slug}`} className="hover:text-teal-700">
                    {project.title}
                  </Link>
                </h2>
                <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">
                  {formatMoney(project.price, project.currency, project.pricingType)}
                </span>
              </div>

              <p className="mt-2 text-sm text-neutral-700">{project.shortDescription}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                <span className="rounded bg-neutral-100 px-2 py-1">{project.category}</span>
                <span>Likes: {project.likeCount}</span>
                <span>Views: {project.viewCount}</span>
                <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
