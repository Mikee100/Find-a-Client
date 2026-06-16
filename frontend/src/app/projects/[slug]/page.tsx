"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import MarketplaceNavbar from "@/features/shared/marketplace-navbar";
import { getProjectBySlug, ProjectDetail } from "@/lib/api";

function formatMoney(price: number | string | null, currency: string, pricingType: ProjectDetail["pricingType"]): string {
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

function friendlyLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function parseIntakeDetails(longDescription: string): {
  narrative: string;
  details: Array<{ label: string; value: string }>;
} {
  const marker = "Project Intake Details";
  const markerIndex = longDescription.indexOf(marker);

  if (markerIndex < 0) {
    return {
      narrative: longDescription.trim(),
      details: []
    };
  }

  const narrative = longDescription.slice(0, markerIndex).trim();
  const detailBlock = longDescription.slice(markerIndex + marker.length).trim();

  const details = detailBlock
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(":");
      if (separator < 0) {
        return null;
      }

      const label = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim();

      if (!label || !value) {
        return null;
      }

      return { label, value };
    })
    .filter((entry): entry is { label: string; value: string } => entry !== null);

  return { narrative, details };
}

export default function ProjectDetailPage() {
  const params = useParams<{ slug: string }>();
  const [slug, setSlug] = useState<string>("");
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSlug(params.slug ?? "");
  }, [params]);

  useEffect(() => {
    if (!slug) {
      return;
    }

    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const item = await getProjectBySlug(slug);
        setProject(item);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Failed to load project.";
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const parsed = useMemo(() => parseIntakeDetails(project?.longDescription ?? ""), [project?.longDescription]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#cffafe_0%,#f8fafc_35%,#f1f5f9_100%)]">
      <MarketplaceNavbar />

      <section className="mx-auto w-full max-w-7xl p-4 md:p-6">
        {loading ? <p className="text-sm text-neutral-600">Loading project...</p> : null}
        {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

        {project ? (
          <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
            <article className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)] md:p-6">
              <div className="overflow-hidden rounded-2xl border border-cyan-100 bg-linear-to-r from-slate-900 via-cyan-900 to-teal-700 p-4 text-white md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-cyan-100">Project brief</p>
                    <h1 className="mt-1 text-2xl font-semibold md:text-3xl">{project.title}</h1>
                    <p className="mt-2 max-w-3xl text-sm text-cyan-50">{project.shortDescription}</p>
                  </div>
                  <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-sm font-semibold text-cyan-50">
                    {formatMoney(project.price, project.currency, project.pricingType)}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1">{friendlyLabel(project.category)}</span>
                  <span className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1">Status: {friendlyLabel(project.status)}</span>
                  <span className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1">Likes: {project.likeCount}</span>
                  <span className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1">Views: {project.viewCount}</span>
                </div>
              </div>

              <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">Overview</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-800">{parsed.narrative}</p>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">Tech Stack</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {project.techStack.map((item) => (
                      <span key={item} className="rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">Industries</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {project.industries.map((item) => (
                      <span key={item} className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </section>

              {parsed.details.length > 0 ? (
                <section className="rounded-xl border border-neutral-200 bg-white p-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">Detailed Requirements</h2>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {parsed.details.map((item) => (
                      <div key={`${item.label}-${item.value}`} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{item.label}</p>
                        <p className="mt-1 text-sm leading-6 text-neutral-800">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </article>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">Project Links</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {project.demoUrl ? (
                    <li>
                      <a href={project.demoUrl} className="font-semibold text-teal-700 hover:text-teal-600" target="_blank" rel="noreferrer">
                        Open Demo
                      </a>
                    </li>
                  ) : null}
                  {project.videoUrl ? (
                    <li>
                      <a href={project.videoUrl} className="font-semibold text-teal-700 hover:text-teal-600" target="_blank" rel="noreferrer">
                        Watch Video
                      </a>
                    </li>
                  ) : null}
                  {project.thumbnailUrl ? (
                    <li>
                      <a href={project.thumbnailUrl} className="font-semibold text-teal-700 hover:text-teal-600" target="_blank" rel="noreferrer">
                        View Thumbnail
                      </a>
                    </li>
                  ) : null}
                  {!project.demoUrl && !project.videoUrl && !project.thumbnailUrl ? (
                    <li className="text-neutral-600">No external links attached.</li>
                  ) : null}
                </ul>
              </section>

              <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">Timeline & Activity</h2>
                <div className="mt-3 grid gap-2 text-sm text-neutral-700">
                  <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                    <span>Created</span>
                    <span className="font-medium">{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                    <span>Updated</span>
                    <span className="font-medium">{new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                    <span>Status</span>
                    <span className="font-medium">{friendlyLabel(project.status)}</span>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">Client Intent Snapshot</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-700">
                  This project uses a structured intake template to improve quote quality, reduce ambiguity, and speed up developer onboarding.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-neutral-300 bg-neutral-50 px-2.5 py-1">Detailed Scope</span>
                  <span className="rounded-full border border-neutral-300 bg-neutral-50 px-2.5 py-1">Clear Deliverables</span>
                  <span className="rounded-full border border-neutral-300 bg-neutral-50 px-2.5 py-1">Collaboration Preferences</span>
                </div>
              </section>
            </aside>
          </div>
        ) : null}
      </section>
    </main>
  );
}
