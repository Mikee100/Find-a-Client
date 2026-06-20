"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FolderKanban, Plus } from "lucide-react";
import { getAuthSession, getMyProjects, logout, logoutEverywhere, MyProjectListItem } from "@/lib/api";
import DeveloperDashboardNavbar from "@/features/developer/developer-dashboard-navbar";

function formatProjectStatus(status: "DRAFT" | "PUBLISHED" | "ARCHIVED"): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function statusTone(status: "DRAFT" | "PUBLISHED" | "ARCHIVED"): string {
  if (status === "PUBLISHED") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }
  if (status === "ARCHIVED") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }
  return "border-slate-300 bg-slate-50 text-slate-700";
}

export default function DeveloperPortfolioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pendingSignOut, setPendingSignOut] = useState(false);
  const [projects, setProjects] = useState<MyProjectListItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await getAuthSession();
        const data = await getMyProjects();
        if (!cancelled) {
          setProjects(data);
        }
      } catch {
        if (!cancelled) {
          router.replace("/login");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const publishedCount = useMemo(
    () => projects.filter((project) => project.status === "PUBLISHED").length,
    [projects],
  );

  async function onSignOut() {
    setPendingSignOut(true);
    await logout();
    router.replace("/login");
  }

  async function onSignOutEverywhere() {
    setPendingSignOut(true);
    await logoutEverywhere();
    router.replace("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <DeveloperDashboardNavbar
        onSignOut={() => {
          void onSignOut();
        }}
        onSignOutEverywhere={() => {
          void onSignOutEverywhere();
        }}
        pendingSignOut={pendingSignOut}
      />
      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <header className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Developer Space</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">My Portfolio</h1>
              <p className="mt-1 text-sm text-slate-600">
                Manage all your portfolio projects here. Keep published work polished and drafts ready.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Total</p>
                <p className="text-sm font-semibold text-slate-900">{projects.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Published</p>
                <p className="text-sm font-semibold text-slate-900">{publishedCount}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href="/developer/projects/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-black"
            >
              <Plus className="h-4 w-4" />
              New Project
            </Link>
            <Link
              href="/developer/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              <FolderKanban className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Loading portfolio...</div>
        ) : null}

        {!loading && projects.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">No projects yet. Create your first portfolio project.</p>
            <Link
              href="/developer/projects/new"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              New Project
            </Link>
          </div>
        ) : null}

        {!loading && projects.length > 0 ? (
          <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <article key={project.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {project.thumbnailUrl || project.backgroundUrl ? (
                  <div className="relative h-36 w-full border-b border-slate-200">
                    <Image
                      src={project.thumbnailUrl ?? project.backgroundUrl ?? ""}
                      alt={project.title}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-36 items-center justify-center border-b border-slate-200 bg-slate-100 text-xs text-slate-500">
                    No preview image
                  </div>
                )}

                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="line-clamp-1 text-base font-semibold text-slate-900">{project.title}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusTone(project.status)}`}>
                      {formatProjectStatus(project.status)}
                    </span>
                  </div>

                  <p className="line-clamp-2 text-sm text-slate-600">{project.shortDescription}</p>

                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                    <span>{project.viewCount} views</span>
                    <span>{project.likeCount} likes</span>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <Link href={`/projects/${project.slug}`} className="text-sm font-semibold text-slate-700 hover:text-slate-900">
                      Open
                    </Link>
                    <Link href={`/projects/${project.slug}?edit=1`} className="text-sm font-semibold text-slate-600 hover:text-slate-900">
                      Edit
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </section>
    </main>
  );
}
