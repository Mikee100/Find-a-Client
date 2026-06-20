"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ClientDashboardNavbar from "@/features/client/client-dashboard-navbar";
import { HireRequestResponse, listHireRequests, updateHireRequestStatus } from "@/lib/api";

function formatStatus(status: HireRequestResponse["status"]): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusClass(status: HireRequestResponse["status"]): string {
  if (status === "ACCEPTED") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }
  if (status === "REJECTED" || status === "CANCELLED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === "PROPOSAL_SENT" || status === "NEGOTIATING") {
    return "border-slate-300 bg-slate-50 text-slate-700";
  }
  return "border-slate-300 bg-slate-50 text-slate-700";
}

export default function ClientHireRequestsPage() {
  const [items, setItems] = useState<HireRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await listHireRequests({ scope: "sent", limit: 100 });
    setItems(data);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        await refresh();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load hire requests.");
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const grouped = useMemo(() => {
    const active = items.filter((item) => !["ACCEPTED", "REJECTED", "CANCELLED"].includes(item.status));
    const closed = items.filter((item) => ["ACCEPTED", "REJECTED", "CANCELLED"].includes(item.status));
    return { active, closed };
  }, [items]);

  async function mutateStatus(id: string, status: HireRequestResponse["status"]) {
    try {
      setActionId(`${id}:${status}`);
      setError(null);
      await updateHireRequestStatus(id, status);
      await refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update status.");
    } finally {
      setActionId(null);
    }
  }

  function renderCard(item: HireRequestResponse) {
    return (
      <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">
            {item.project?.title ?? "Project Offer"}
          </p>
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass(item.status)}`}>
            {formatStatus(item.status)}
          </span>
        </div>

        <p className="mt-2 text-sm text-slate-700">{item.brief}</p>

        <div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
          <p>Developer: {item.developer?.fullName || item.developer?.username || item.developerId}</p>
          <p>Created: {new Date(item.createdAt).toLocaleString()}</p>
          <p>Budget: {item.budgetAmount ? `${item.budgetAmount} ${item.budgetCurrency ?? ""}`.trim() : "Not specified"}</p>
          <p>Timeline: {item.timelineDays ? `${item.timelineDays} days` : "Not specified"}</p>
        </div>

        {item.proposalMessage ? (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-800">Developer proposal</p>
            <p className="mt-1 text-slate-700">{item.proposalMessage}</p>
            <p className="mt-1 text-xs text-slate-600">
              {item.proposalAmount ? `Amount: ${item.proposalAmount} ${item.proposalCurrency ?? ""}` : "Amount: Not specified"}
              {" · "}
              {item.proposalTimelineDays ? `Timeline: ${item.proposalTimelineDays} days` : "Timeline: Not specified"}
            </p>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {item.threadId ? (
            <Link href={`/client/messages?thread=${encodeURIComponent(item.threadId)}`} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-slate-900 hover:text-slate-900">
              Open thread
            </Link>
          ) : null}

          {item.status === "PROPOSAL_SENT" || item.status === "NEGOTIATING" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  void mutateStatus(item.id, "ACCEPTED");
                }}
                disabled={actionId === `${item.id}:ACCEPTED`}
                className="rounded-md border border-slate-200 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-black disabled:opacity-60"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => {
                  void mutateStatus(item.id, "NEGOTIATING");
                }}
                disabled={actionId === `${item.id}:NEGOTIATING`}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-slate-900 hover:text-slate-900 disabled:opacity-60"
              >
                Negotiate
              </button>
              <button
                type="button"
                onClick={() => {
                  void mutateStatus(item.id, "REJECTED");
                }}
                disabled={actionId === `${item.id}:REJECTED`}
                className="rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              >
                Reject
              </button>
            </>
          ) : null}

          {(item.status === "PENDING" || item.status === "REVIEWING") ? (
            <button
              type="button"
              onClick={() => {
                void mutateStatus(item.id, "CANCELLED");
              }}
              disabled={actionId === `${item.id}:CANCELLED`}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-slate-900 hover:text-slate-900 disabled:opacity-60"
            >
              Cancel request
            </button>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <ClientDashboardNavbar />

      <section className="mx-auto w-full max-w-6xl px-4 py-5 md:px-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Client Workspace</p>
            <h1 className="text-2xl font-semibold tracking-tight">Hire Requests</h1>
          </div>
          <Link href="/client/feed" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-900 hover:text-slate-900">
            Back to feed
          </Link>
        </div>

        {error ? <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {loading ? <p className="text-sm text-slate-600">Loading hire requests...</p> : null}

        {!loading ? (
          <div className="space-y-4">
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">Active</h2>
              <div className="space-y-3">
                {grouped.active.map((item) => renderCard(item))}
                {grouped.active.length === 0 ? <p className="text-sm text-slate-500">No active hire requests.</p> : null}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">Closed</h2>
              <div className="space-y-3">
                {grouped.closed.map((item) => renderCard(item))}
                {grouped.closed.length === 0 ? <p className="text-sm text-slate-500">No closed hire requests.</p> : null}
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}
