"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DeveloperDashboardNavbar from "@/features/developer/developer-dashboard-navbar";
import {
  HireRequestResponse,
  listHireRequests,
  logout,
  logoutEverywhere,
  submitHireRequestProposal,
  updateHireRequestStatus
} from "@/lib/api";

const CURRENCY_OPTIONS: Array<{ code: string; label: string }> = [
  { code: "KES", label: "Kenyan Shilling (KSh)" },
  { code: "USD", label: "US Dollar (USD)" },
  { code: "UGX", label: "Ugandan Shilling (USh)" },
  { code: "TZS", label: "Tanzanian Shilling (TSh)" },
  { code: "SOS", label: "Somali Shilling (Sh)" },
  { code: "RWF", label: "Rwandan Franc (RF)" },
  { code: "BIF", label: "Burundian Franc (FBu)" },
  { code: "SSP", label: "South Sudanese Pound (SSP)" },
  { code: "CDF", label: "Congolese Franc (CDF)" }
];

function formatStatus(status: HireRequestResponse["status"]): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusClass(status: HireRequestResponse["status"]): string {
  if (status === "ACCEPTED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "REJECTED" || status === "CANCELLED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === "PROPOSAL_SENT" || status === "NEGOTIATING") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function DeveloperHireRequestsPage() {
  const router = useRouter();
  const [items, setItems] = useState<HireRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [proposalFormId, setProposalFormId] = useState<string | null>(null);
  const [proposalMessage, setProposalMessage] = useState("");
  const [proposalAmount, setProposalAmount] = useState("");
  const [proposalCurrency, setProposalCurrency] = useState("KES");
  const [proposalTimelineDays, setProposalTimelineDays] = useState("");
  const [pendingSignOut, setPendingSignOut] = useState(false);

  async function onSignOut() {
    try {
      setPendingSignOut(true);
      await logout();
      router.replace("/login");
    } finally {
      setPendingSignOut(false);
    }
  }

  async function onSignOutEverywhere() {
    try {
      setPendingSignOut(true);
      await logoutEverywhere();
      router.replace("/login");
    } finally {
      setPendingSignOut(false);
    }
  }

  const refresh = useCallback(async () => {
    const data = await listHireRequests({ scope: "received", limit: 100 });
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

  async function onSubmitProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!proposalFormId || !proposalMessage.trim()) {
      return;
    }

    try {
      setActionId(`${proposalFormId}:PROPOSAL`);
      setError(null);
      await submitHireRequestProposal(proposalFormId, {
        proposalMessage: proposalMessage.trim(),
        proposalAmount: proposalAmount.trim() ? Number(proposalAmount) : undefined,
        proposalCurrency: proposalCurrency.trim() || undefined,
        proposalTimelineDays: proposalTimelineDays.trim() ? Number(proposalTimelineDays) : undefined
      });
      setProposalFormId(null);
      setProposalMessage("");
      setProposalAmount("");
      setProposalTimelineDays("");
      setProposalCurrency("KES");
      await refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to submit proposal.");
    } finally {
      setActionId(null);
    }
  }

  function renderCard(item: HireRequestResponse) {
    const isProposalOpen = proposalFormId === item.id;

    return (
      <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">{item.project?.title ?? "Project Offer"}</p>
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass(item.status)}`}>
            {formatStatus(item.status)}
          </span>
        </div>

        <p className="mt-2 text-sm text-slate-700">{item.brief}</p>

        <div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
          <p>Client: {item.client?.fullName || item.client?.username || item.clientId}</p>
          <p>Created: {new Date(item.createdAt).toLocaleString()}</p>
          <p>Budget: {item.budgetAmount ? `${item.budgetAmount} ${item.budgetCurrency ?? ""}`.trim() : "Not specified"}</p>
          <p>Timeline: {item.timelineDays ? `${item.timelineDays} days` : "Not specified"}</p>
        </div>

        {item.proposalMessage ? (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
            <p className="font-semibold text-blue-800">Last proposal</p>
            <p className="mt-1 text-blue-900">{item.proposalMessage}</p>
            <p className="mt-1 text-xs text-blue-700">
              {item.proposalAmount ? `Amount: ${item.proposalAmount} ${item.proposalCurrency ?? ""}` : "Amount: Not specified"}
              {" · "}
              {item.proposalTimelineDays ? `Timeline: ${item.proposalTimelineDays} days` : "Timeline: Not specified"}
            </p>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {item.threadId ? (
            <Link href={`/developer/messages?thread=${encodeURIComponent(item.threadId)}`} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
              Open thread
            </Link>
          ) : null}

          {item.status === "ACCEPTED" ? (
            <Link href={`/developer/hire-requests/${item.id}`} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
              Manage milestone
            </Link>
          ) : null}

          {item.status === "PENDING" ? (
            <button
              type="button"
              onClick={() => {
                void mutateStatus(item.id, "REVIEWING");
              }}
              disabled={actionId === `${item.id}:REVIEWING`}
              className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
            >
              Mark reviewing
            </button>
          ) : null}

          {(item.status === "PENDING" || item.status === "REVIEWING" || item.status === "NEGOTIATING") ? (
            <button
              type="button"
              onClick={() => {
                setProposalFormId(isProposalOpen ? null : item.id);
                if (!isProposalOpen) {
                  setProposalMessage(item.proposalMessage ?? "");
                  setProposalAmount(item.proposalAmount ?? "");
                  setProposalCurrency(item.proposalCurrency ?? "KES");
                  setProposalTimelineDays(item.proposalTimelineDays ? String(item.proposalTimelineDays) : "");
                }
              }}
              className="rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              {isProposalOpen ? "Close proposal" : "Send proposal"}
            </button>
          ) : null}

          {(item.status === "PENDING" || item.status === "REVIEWING" || item.status === "PROPOSAL_SENT" || item.status === "NEGOTIATING") ? (
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
          ) : null}
        </div>

        {isProposalOpen ? (
          <form onSubmit={onSubmitProposal} className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">Proposal message</label>
            <textarea
              value={proposalMessage}
              onChange={(event) => setProposalMessage(event.target.value)}
              rows={4}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none"
              placeholder="Outline your approach, delivery milestones, and clarifying points"
            />
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <input
                value={proposalAmount}
                onChange={(event) => setProposalAmount(event.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none"
                placeholder="Amount"
              />
              <select
                value={proposalCurrency}
                onChange={(event) => setProposalCurrency(event.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none"
              >
                {CURRENCY_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={proposalTimelineDays}
                onChange={(event) => setProposalTimelineDays(event.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none"
                placeholder="Timeline days"
              />
            </div>
            <button
              type="submit"
              disabled={actionId === `${item.id}:PROPOSAL` || !proposalMessage.trim()}
              className="mt-2 rounded-md border border-blue-300 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {actionId === `${item.id}:PROPOSAL` ? "Sending..." : "Submit proposal"}
            </button>
          </form>
        ) : null}
      </article>
    );
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

      <section className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Developer Workspace</p>
            <h1 className="text-2xl font-semibold tracking-tight">Hire Requests</h1>
          </div>
          <Link href="/developer/dashboard" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Back to dashboard
          </Link>
        </div>

        {error ? <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {loading ? <p className="text-sm text-slate-600">Loading hire requests...</p> : null}

        {!loading ? (
          <div className="space-y-6">
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
