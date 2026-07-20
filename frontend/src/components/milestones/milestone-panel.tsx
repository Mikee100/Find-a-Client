"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  createMilestone,
  disputeMilestone,
  HireRequestResponse,
  listMilestoneEvents,
  listMilestonesForHireRequest,
  MilestoneEventResponse,
  MilestoneResponse,
  releaseMilestone,
  submitMilestone
} from "@/lib/api";
import FundMilestoneModal from "@/components/milestones/fund-milestone-modal";
import MilestoneStatusBadge from "@/components/milestones/milestone-status-badge";

const MILESTONE_ELIGIBLE_HIRE_REQUEST_STATUSES: HireRequestResponse["status"][] = [
  "ACCEPTED",
  "PROPOSAL_SENT",
  "NEGOTIATING"
];

interface MilestonePanelProps {
  hireRequest: HireRequestResponse;
  viewerRole: "CLIENT" | "DEVELOPER";
}

function formatEventType(eventType: string): string {
  return eventType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function MilestonePanel({ hireRequest, viewerRole }: MilestonePanelProps) {
  const isClient = viewerRole === "CLIENT";
  const isDeveloper = viewerRole === "DEVELOPER";

  const [milestone, setMilestone] = useState<MilestoneResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [fundModalOpen, setFundModalOpen] = useState(false);

  const [createTitle, setCreateTitle] = useState("");
  const [createAmount, setCreateAmount] = useState("");
  const [createCurrency, setCreateCurrency] = useState(
    hireRequest.proposalCurrency ?? hireRequest.budgetCurrency ?? "USD"
  );
  const [createDueDate, setCreateDueDate] = useState("");

  const [submitNote, setSubmitNote] = useState("");
  const [submitArtifacts, setSubmitArtifacts] = useState("");

  const [disputeReason, setDisputeReason] = useState("");
  const [disputeOpen, setDisputeOpen] = useState(false);

  const [eventsOpen, setEventsOpen] = useState(false);
  const [events, setEvents] = useState<MilestoneEventResponse[] | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);

  const refresh = useCallback(async () => {
    const items = await listMilestonesForHireRequest(hireRequest.id);
    setMilestone(items[0] ?? null);
  }, [hireRequest.id]);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        await refresh();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load milestone.");
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  async function toggleEvents() {
    const next = !eventsOpen;
    setEventsOpen(next);
    if (next && !events && milestone) {
      try {
        setEventsLoading(true);
        const items = await listMilestoneEvents(milestone.id);
        setEvents(items);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load activity.");
      } finally {
        setEventsLoading(false);
      }
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const amount = Number(createAmount);
    if (!createTitle.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Enter a title and a valid amount.");
      return;
    }

    try {
      setActionBusy(true);
      setError(null);
      await createMilestone(hireRequest.id, {
        title: createTitle.trim(),
        amount,
        currency: createCurrency.trim() || undefined,
        dueDate: createDueDate ? new Date(createDueDate).toISOString() : undefined
      });
      await refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create milestone.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSubmitDelivery(event: FormEvent) {
    event.preventDefault();
    if (!milestone) {
      return;
    }

    try {
      setActionBusy(true);
      setError(null);
      const artifacts = submitArtifacts
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      await submitMilestone(milestone.id, {
        deliveryNote: submitNote.trim() || undefined,
        artifacts: artifacts.length > 0 ? artifacts : undefined
      });
      await refresh();
      setSubmitNote("");
      setSubmitArtifacts("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to submit delivery.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleRelease() {
    if (!milestone) {
      return;
    }

    if (!window.confirm(`Release ${milestone.amount} ${milestone.currency} to the developer? This cannot be undone.`)) {
      return;
    }

    try {
      setActionBusy(true);
      setError(null);
      await releaseMilestone(milestone.id, {}, crypto.randomUUID());
      await refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to release funds.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDispute(event: FormEvent) {
    event.preventDefault();
    if (!milestone || !disputeReason.trim()) {
      setError("Describe the reason for the dispute.");
      return;
    }

    try {
      setActionBusy(true);
      setError(null);
      await disputeMilestone(milestone.id, { reason: disputeReason.trim() });
      await refresh();
      setDisputeReason("");
      setDisputeOpen(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to raise dispute.");
    } finally {
      setActionBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Loading milestone...</p>;
  }

  const canCreate =
    isClient && !milestone && MILESTONE_ELIGIBLE_HIRE_REQUEST_STATUSES.includes(hireRequest.status);
  const canDispute = milestone && milestone.status !== "RELEASED" && milestone.status !== "REFUNDED";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Milestone & Payment</h2>
        {milestone ? <MilestoneStatusBadge status={milestone.status} /> : null}
      </div>

      {error ? (
        <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      {!milestone ? (
        canCreate ? (
          <form onSubmit={(event) => void handleCreate(event)} className="space-y-2">
            <p className="text-sm text-slate-600">No milestone yet. Create one to start funding this work.</p>
            <input
              type="text"
              value={createTitle}
              onChange={(event) => setCreateTitle(event.target.value)}
              placeholder="Milestone title"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={createAmount}
                onChange={(event) => setCreateAmount(event.target.value)}
                placeholder="Amount"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={createCurrency}
                onChange={(event) => setCreateCurrency(event.target.value.toUpperCase())}
                placeholder="USD"
                maxLength={3}
                className="w-24 rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <input
              type="date"
              value={createDueDate}
              onChange={(event) => setCreateDueDate(event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={actionBusy}
              className="rounded-md border border-slate-200 bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
            >
              Create milestone
            </button>
          </form>
        ) : (
          <p className="text-sm text-slate-500">No milestone has been created for this hire request yet.</p>
        )
      ) : (
        <div className="space-y-3">
          <div className="grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
            <p className="font-semibold text-slate-900">{milestone.title}</p>
            <p>
              {milestone.amount} {milestone.currency}
            </p>
            {milestone.dueDate ? <p>Due: {new Date(milestone.dueDate).toLocaleDateString()}</p> : null}
          </div>

          {milestone.status === "PENDING" && isClient ? (
            <button
              type="button"
              onClick={() => setFundModalOpen(true)}
              className="rounded-md border border-slate-200 bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              Fund milestone
            </button>
          ) : null}

          {(milestone.status === "FUNDED" || milestone.status === "IN_PROGRESS") && isDeveloper ? (
            <form onSubmit={(event) => void handleSubmitDelivery(event)} className="space-y-2 border-t border-slate-100 pt-3">
              <p className="text-sm font-semibold text-slate-800">Submit delivery</p>
              <textarea
                value={submitNote}
                onChange={(event) => setSubmitNote(event.target.value)}
                placeholder="Delivery note"
                rows={2}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
              <textarea
                value={submitArtifacts}
                onChange={(event) => setSubmitArtifacts(event.target.value)}
                placeholder="Links to deliverables, one per line"
                rows={2}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={actionBusy}
                className="rounded-md border border-slate-200 bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
              >
                Mark as delivered
              </button>
            </form>
          ) : null}

          {milestone.status === "SUBMITTED" && isClient ? (
            <div className="border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => void handleRelease()}
                disabled={actionBusy}
                className="rounded-md border border-emerald-300 bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                Release funds
              </button>
            </div>
          ) : null}

          {canDispute ? (
            <div className="border-t border-slate-100 pt-3">
              {!disputeOpen ? (
                <button
                  type="button"
                  onClick={() => setDisputeOpen(true)}
                  className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Raise a dispute
                </button>
              ) : (
                <form onSubmit={(event) => void handleDispute(event)} className="space-y-2">
                  <textarea
                    value={disputeReason}
                    onChange={(event) => setDisputeReason(event.target.value)}
                    placeholder="Explain the issue"
                    rows={2}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={actionBusy}
                      className="rounded-md border border-rose-300 bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                    >
                      Submit dispute
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisputeOpen(false)}
                      className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-900"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : null}

          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => void toggleEvents()}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              {eventsOpen ? "Hide activity" : "Show activity"}
            </button>
            {eventsOpen ? (
              <div className="mt-2 space-y-1">
                {eventsLoading ? <p className="text-xs text-slate-500">Loading...</p> : null}
                {events?.map((eventItem) => (
                  <p key={eventItem.id} className="text-xs text-slate-600">
                    {new Date(eventItem.createdAt).toLocaleString()} — {formatEventType(eventItem.eventType)}
                  </p>
                ))}
                {events && events.length === 0 ? <p className="text-xs text-slate-500">No activity yet.</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {fundModalOpen && milestone ? (
        <FundMilestoneModal
          onClose={() => setFundModalOpen(false)}
          milestone={milestone}
          onFunded={() => void refresh()}
        />
      ) : null}
    </div>
  );
}
