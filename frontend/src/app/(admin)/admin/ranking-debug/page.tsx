"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/features/admins/admin-shell";
import { AdminRankedProjectListItem, getAdminRankedProjects } from "@/lib/api";

type RankingSortBy = "best_matches" | "newest" | "popular";

function scoreClass(value: number): string {
  if (value >= 80) {
    return "text-emerald-700";
  }
  if (value >= 60) {
    return "text-amber-700";
  }
  return "text-rose-700";
}

export default function AdminRankingDebugPage() {
  const [items, setItems] = useState<AdminRankedProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<RankingSortBy>("best_matches");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    let cancelled = false;

    async function loadRankedProjects() {
      setLoading(true);
      setError(null);

      try {
        const response = await getAdminRankedProjects({
          sortBy,
          search: search.trim() || undefined,
          limit
        });

        if (!cancelled) {
          setItems(response.items);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load ranking debug data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRankedProjects();

    return () => {
      cancelled = true;
    };
  }, [sortBy, search, limit]);

  const rows = useMemo(() => items.slice(0, limit), [items, limit]);

  return (
    <AdminShell title="Ranking Debug" subtitle="Inspect project ranking scores and signal breakdown for tuning.">
      <section className="grid gap-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sort source
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as RankingSortBy)}
                className="h-10 rounded-md border border-slate-300 px-2 text-sm font-medium normal-case text-slate-700"
              >
                <option value="best_matches">Best matches</option>
                <option value="newest">Newest</option>
                <option value="popular">Popular</option>
              </select>
            </label>

            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Search filter
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Title, stack, author"
                className="h-10 rounded-md border border-slate-300 px-3 text-sm font-medium normal-case text-slate-700"
              />
            </label>

            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Rows
              <select
                value={String(limit)}
                onChange={(event) => setLimit(Number(event.target.value))}
                className="h-10 rounded-md border border-slate-300 px-2 text-sm font-medium normal-case text-slate-700"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </label>
          </div>
        </section>

        {loading ? <p className="text-sm text-slate-500">Loading ranking diagnostics...</p> : null}
        {error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        {!loading && !error ? (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Project</th>
                    <th className="px-3 py-2 text-right">Score</th>
                    <th className="px-3 py-2 text-right">Freshness</th>
                    <th className="px-3 py-2 text-right">Quality</th>
                    <th className="px-3 py-2 text-right">Complete</th>
                    <th className="px-3 py-2 text-right">Activity</th>
                    <th className="px-3 py-2 text-right">Weighted</th>
                    <th className="px-3 py-2 text-right">Inquiries</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((project) => (
                    <tr key={project.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-900">{project.title}</p>
                        <p className="text-xs text-slate-500">/{project.slug}</p>
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold ${scoreClass(project.score)}`}>{project.score}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{project.scoreBreakdown.freshness}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{project.scoreBreakdown.quality}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{project.scoreBreakdown.completeness}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{project.scoreBreakdown.activity}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{project.scoreBreakdown.weightedSignals}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{project.inquiryCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </section>
    </AdminShell>
  );
}
