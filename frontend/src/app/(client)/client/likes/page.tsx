"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Heart } from "lucide-react";
import MarketplaceNavbar from "@/features/shared/marketplace-navbar";
import ClientSidebar from "@/features/shared/client-sidebar";
import { getLikedProjects, LikedProjectEntry, toggleProjectLike } from "@/lib/api";

function formatMoney(price: number | string | null, currency: string, pricingType: LikedProjectEntry["project"]["pricingType"]): string {
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
    return `Fixed (${currency})`;
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

export default function ClientLikedProjectsPage() {
  const [entries, setEntries] = useState<LikedProjectEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const liked = await getLikedProjects();
        if (!active) {
          return;
        }

        setEntries(liked);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(caughtError instanceof Error ? caughtError.message : "Failed to load liked projects.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function onToggleLike(entry: LikedProjectEntry) {
    try {
      setPendingProjectId(entry.projectId);
      await toggleProjectLike(entry.project.slug);
      setEntries((previous) => previous.filter((item) => item.projectId !== entry.projectId));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to update project like.");
    } finally {
      setPendingProjectId(null);
    }
  }

  const content = useMemo(() => {
    if (loading) {
      return <p className="text-sm text-neutral-600">Loading liked projects...</p>;
    }

    if (error) {
      return <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>;
    }

    if (entries.length === 0) {
      return (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-700">
          <p className="font-semibold text-neutral-900">No liked projects yet.</p>
          <p className="mt-1">When you like projects from feed or project detail pages, they will show up here.</p>
          <Link href="/client/feed" className="mt-4 inline-flex rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50">
            Browse projects
          </Link>
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {entries.map((entry) => {
          const project = entry.project;
          const heroUrl = project.thumbnailUrl || project.backgroundUrl;

          return (
            <article key={entry.projectId} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="relative aspect-video w-full bg-neutral-100">
                {heroUrl ? (
                  <Image src={heroUrl} alt={project.title} fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-xs text-neutral-500">
                    No project image uploaded yet
                  </div>
                )}
              </div>

              <div className="space-y-3 p-4">
                <div>
                  <Link href={`/projects/${project.slug}`} className="text-base font-semibold text-neutral-900 hover:underline">
                    {project.title}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{project.shortDescription}</p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-neutral-600">
                  <span>{project.category.replace(/_/g, " ")}</span>
                  <span>•</span>
                  <span>{project.likeCount} likes</span>
                  <span>•</span>
                  <span>{project.viewCount} views</span>
                </div>

                <p className="text-sm font-semibold text-neutral-800">
                  Budget: {formatMoney(project.price, project.currency, project.pricingType)}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/projects/${project.slug}`} className="inline-flex rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black">
                    View Project
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      void onToggleLike(entry);
                    }}
                    disabled={pendingProjectId === entry.projectId}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    <Heart className="h-3.5 w-3.5" aria-hidden />
                    {pendingProjectId === entry.projectId ? "Updating..." : "Unlike"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    );
  }, [entries, error, loading, pendingProjectId]);

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <MarketplaceNavbar />
      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-22 lg:self-start">
            <ClientSidebar />
          </aside>

          <div>
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold">Liked Projects</h1>
                <p className="mt-1 text-sm text-neutral-600">Projects you have liked as engagement signals.</p>
              </div>
              <Link href="/client/feed" className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-white">
                Back to feed
              </Link>
            </div>

            {content}
          </div>
        </div>
      </section>
    </main>
  );
}
