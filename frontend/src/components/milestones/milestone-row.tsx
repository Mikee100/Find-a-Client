"use client";

import { FormEvent, useState } from "react";
import {
  disputeMilestone,
  listMilestoneEvents,
  MilestoneEventResponse,
  MilestoneResponse,
  releaseMilestone,
  submitMilestone
} from "@/lib/api";
import FundMilestoneModal from "@/components/milestones/fund-milestone-modal";
import MilestoneStatusBadge from "@/components/milestones/milestone-status-badge";

interface MilestoneRowProps {
  milestone: MilestoneResponse;
  viewerRole: "CLIENT" | "DEVELOPER";
  onChanged: () => void;
}

function formatEventType(eventType: string): string {
  return eventType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function MilestoneRow({ milestone, viewerRole, onChanged }: MilestoneRowProps) {
  const isClient = viewerRole === "CLIENT";
  const isDeveloper = viewerRole === "DEVELOPER";

  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [fundModalOpen, setFundModalOpen] = useState(false);

  const [submitNote, setSubmitNote] = useState("");
  const [submitArtifacts, setSubmitArtifacts] = useState("");

  const [disputeReason, setDisputeReason] = useState("");
  const [disputeOpen, setDisputeOpen] = useState(false);

  const [eventsOpen, setEventsOpen] = useState(false);
  const [events, setEvents] = useState<MilestoneEventResponse[] | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);

  async function toggleEvents() {
    const next = !eventsOpen;
    setEventsOpen(next);
    if (next && !events) {
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

  async function handleSubmitDelivery(event: FormEvent) {
    event.preventDefault();

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
      onChanged();
      setSubmitNote("");
      setSubmitArtifacts("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to submit delivery.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleRelease() {
    if (!window.confirm(`Release ${milestone.amount} ${milestone.currency} to the developer? This cannot be undone.`)) {
      return;
    }

    try {
      setActionBusy(true);
      setError(null);
      await releaseMilestone(milestone.id, {}, crypto.randomUUID());
      onChanged();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to release funds.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDispute(event: FormEvent) {
    event.preventDefault();
    if (!disputeReason.trim()) {
      setError("Describe the reason for the dispute.");
      return;
    }

    try {
      setActionBusy(true);
      setError(null);
      await disputeMilestone(milestone.id, { reason: disputeReason.trim() });
      onChanged();
      setDisputeReason("");
      setDisputeOpen(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to raise dispute.");
    } finally {
      setActionBusy(false);
    }
  }

  const canDispute = milestone.status !== "RELEASED" && milestone.status !== "REFUNDED";

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold text-slate-900">{milestone.title}</p>
        <MilestoneStatusBadge status={milestone.status} />
      </div>

      {error ? (
        <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      <div className="space-y-3">
        <div className="grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
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

      {fundModalOpen ? (
        <FundMilestoneModal
          onClose={() => setFundModalOpen(false)}
          milestone={milestone}
          onFunded={() => onChanged()}
        />
      ) : null}
    </div>
  );
}
