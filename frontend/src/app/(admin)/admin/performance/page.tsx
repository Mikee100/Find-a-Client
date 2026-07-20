"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/features/admins/admin-shell";
import {
  AdminPerformanceRouteMetric,
  AdminPerformanceSummary,
  getAdminPerformanceRoutes,
  getAdminPerformanceSummary
} from "@/lib/api";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

function methodClass(method: string): string {
  if (method === "GET") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (method === "POST") {
    return "bg-blue-100 text-blue-700";
  }
  if (method === "PATCH" || method === "PUT") {
    return "bg-amber-100 text-amber-700";
  }
  if (method === "DELETE") {
    return "bg-red-100 text-red-700";
  }
  return "bg-slate-100 text-slate-700";
}

export default function AdminPerformancePage() {
  const [summary, setSummary] = useState<AdminPerformanceSummary | null>(null);
  const [routes, setRoutes] = useState<AdminPerformanceRouteMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [selectedStatusClass, setSelectedStatusClass] = useState("all");
  const [showAllRoutes, setShowAllRoutes] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPerformance() {
      setLoading(true);
      setError(null);

      try {
        const [summaryResult, routesResult] = await Promise.all([
          getAdminPerformanceSummary(),
          getAdminPerformanceRoutes()
        ]);

        if (!cancelled) {
          setSummary(summaryResult);
          setRoutes(routesResult);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Failed to load performance data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPerformance();

    return () => {
      cancelled = true;
    };
  }, []);

  const docsBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7000").replace(/\/+$/, "");

  const categories = useMemo(() => {
    const discovered = new Set<string>();

    for (const route of routes) {
      const segment = route.path.split("/").filter(Boolean)[0] ?? "other";
      discovered.add(segment);
    }

    if (summary) {
      for (const item of summary.recentRequests) {
        const segment = item.path.split("/").filter(Boolean)[0] ?? "other";
        discovered.add(segment);
      }
    }

    return ["all", ...Array.from(discovered).sort((a, b) => a.localeCompare(b))];
  }, [routes, summary]);

  const methods = useMemo(() => {
    const discovered = new Set<string>();
    for (const route of routes) {
      discovered.add(route.method);
    }
    if (summary) {
      for (const item of summary.recentRequests) {
        discovered.add(item.method);
      }
    }
    return ["all", ...Array.from(discovered).sort((a, b) => a.localeCompare(b))];
  }, [routes, summary]);

  const filteredRoutes = useMemo(() => {
    return routes.filter((route) => {
      const category = route.path.split("/").filter(Boolean)[0] ?? "other";
      const byCategory = selectedCategory === "all" || category === selectedCategory;
      const byMethod = selectedMethod === "all" || route.method === selectedMethod;
      const byStatusClass = selectedStatusClass === "all"
        || (selectedStatusClass === "2xx" && route.lastStatusCode >= 200 && route.lastStatusCode < 300)
        || (selectedStatusClass === "4xx+" && route.lastStatusCode >= 400);

      return byCategory && byMethod && byStatusClass;
    });
  }, [routes, selectedCategory, selectedMethod, selectedStatusClass]);

  const displayedRoutes = useMemo(() => {
    if (showAllRoutes) {
      return filteredRoutes;
    }

    return filteredRoutes.slice(0, 20);
  }, [filteredRoutes, showAllRoutes]);

  const filteredRecentRequests = useMemo(() => {
    if (!summary) {
      return [];
    }

    return summary.recentRequests.filter((item) => {
      const category = item.path.split("/").filter(Boolean)[0] ?? "other";
      const byCategory = selectedCategory === "all" || category === selectedCategory;
      const byMethod = selectedMethod === "all" || item.method === selectedMethod;
      const byStatusClass = selectedStatusClass === "all"
        || (selectedStatusClass === "2xx" && item.statusCode >= 200 && item.statusCode < 300)
        || (selectedStatusClass === "4xx+" && item.statusCode >= 400);

      return byCategory && byMethod && byStatusClass;
    });
  }, [summary, selectedCategory, selectedMethod, selectedStatusClass]);

  return (
    <AdminShell title="Performance" subtitle="Observe platform speed, stability, and reliability.">
      <section className="grid gap-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">API Documentation</h2>
          <p className="mt-1 text-sm text-slate-600">
            Use Swagger UI and OpenAPI JSON to inspect contracts and endpoint behavior.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`${docsBaseUrl}/api/docs`}
              target="_blank"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Open Swagger UI
            </Link>
            <Link
              href={`${docsBaseUrl}/api/docs-json`}
              target="_blank"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              OpenAPI JSON
            </Link>
          </div>
        </section>

        {loading ? <p className="text-sm text-slate-500">Loading API performance...</p> : null}
        {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        {!loading && !error && summary ? (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  API Category
                  <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    className="h-10 rounded-md border border-slate-300 px-2 text-sm font-medium normal-case text-slate-700"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category === "all" ? "All categories" : category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Method
                  <select
                    value={selectedMethod}
                    onChange={(event) => setSelectedMethod(event.target.value)}
                    className="h-10 rounded-md border border-slate-300 px-2 text-sm font-medium normal-case text-slate-700"
                  >
                    {methods.map((method) => (
                      <option key={method} value={method}>
                        {method === "all" ? "All methods" : method}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status Class
                  <select
                    value={selectedStatusClass}
                    onChange={(event) => setSelectedStatusClass(event.target.value)}
                    className="h-10 rounded-md border border-slate-300 px-2 text-sm font-medium normal-case text-slate-700"
                  >
                    <option value="all">All statuses</option>
                    <option value="2xx">2xx</option>
                    <option value="4xx+">4xx/5xx</option>
                  </select>
                </label>

                <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Route Rows
                  <button
                    type="button"
                    onClick={() => setShowAllRoutes((current) => !current)}
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm font-medium normal-case text-slate-700 hover:bg-slate-50"
                  >
                    {showAllRoutes ? "Showing all routes" : "Showing top 20 routes"}
                  </button>
                </label>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Routes</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.routeCount}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total requests</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.totalRequests}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Errors</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.totalErrors}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Error rate</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.errorRate}%</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Avg latency</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.averageLatencyMs} ms</p>
              </article>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Routes by average latency</h3>
              <p className="mt-1 text-xs text-slate-500">{filteredRoutes.length} route(s) match current filters.</p>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-2">Method</th>
                      <th className="px-2 py-2">Path</th>
                      <th className="px-2 py-2">Calls</th>
                      <th className="px-2 py-2">Errors</th>
                      <th className="px-2 py-2">Avg ms</th>
                      <th className="px-2 py-2">P95 ms</th>
                      <th className="px-2 py-2">Max ms</th>
                      <th className="px-2 py-2">Last call</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRoutes.map((route) => (
                      <tr key={`${route.method}-${route.path}`} className="border-b border-slate-100 text-slate-700">
                        <td className="px-2 py-2">
                          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${methodClass(route.method)}`}>
                            {route.method}
                          </span>
                        </td>
                        <td className="px-2 py-2 font-medium text-slate-900">{route.path}</td>
                        <td className="px-2 py-2">{route.count}</td>
                        <td className="px-2 py-2">{route.errorCount}</td>
                        <td className="px-2 py-2">{route.averageLatencyMs}</td>
                        <td className="px-2 py-2">{route.p95LatencyMs}</td>
                        <td className="px-2 py-2">{route.maxLatencyMs}</td>
                        <td className="px-2 py-2">{formatDateTime(route.lastCalledAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {displayedRoutes.length === 0 ? (
                  <p className="py-3 text-sm text-slate-500">No routes match the selected filters yet.</p>
                ) : null}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Recent API calls</h3>
              <p className="mt-1 text-xs text-slate-500">{filteredRecentRequests.length} request(s) match current filters.</p>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-2">Method</th>
                      <th className="px-2 py-2">Path</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Latency ms</th>
                      <th className="px-2 py-2">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecentRequests.map((item, index) => (
                      <tr key={`${item.happenedAt}-${item.path}-${index}`} className="border-b border-slate-100 text-slate-700">
                        <td className="px-2 py-2">
                          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${methodClass(item.method)}`}>
                            {item.method}
                          </span>
                        </td>
                        <td className="px-2 py-2 font-medium text-slate-900">{item.path}</td>
                        <td className="px-2 py-2">{item.statusCode}</td>
                        <td className="px-2 py-2">{item.durationMs}</td>
                        <td className="px-2 py-2">{formatDateTime(item.happenedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredRecentRequests.length === 0 ? (
                  <p className="py-3 text-sm text-slate-500">No recent requests match the selected filters yet.</p>
                ) : null}
              </div>
            </section>
          </>
        ) : null}
      </section>
    </AdminShell>
  );
}
