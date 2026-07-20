"use client";

import { useEffect, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import Modal from "@/components/ui/modal";
import { getStripe } from "@/lib/stripe";
import { fundMilestone, getMilestoneById, MilestoneResponse } from "@/lib/api";

interface FundMilestoneModalProps {
  onClose: () => void;
  milestone: MilestoneResponse;
  onFunded: () => void;
}

function PaymentForm({
  milestone,
  onFunded,
  onClose
}: {
  milestone: MilestoneResponse;
  onFunded: () => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!stripe || !elements) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: "if_required"
      });

      if (result.error) {
        setError(result.error.message ?? "Payment failed. Please try a different payment method.");
        return;
      }

      setStatusMessage("Payment received - confirming with the server...");

      // The milestone only flips to FUNDED once our Stripe webhook processes the
      // event, which can land a moment after confirmPayment resolves.
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const updated = await getMilestoneById(milestone.id);
        if (updated.status !== "PENDING") {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      onFunded();
      onClose();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to confirm payment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <PaymentElement />
      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}
      {statusMessage ? <p className="text-sm text-slate-600">{statusMessage}</p> : null}
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!stripe || submitting}
        className="w-full rounded-md border border-slate-200 bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
      >
        {submitting ? "Processing..." : `Pay ${milestone.amount} ${milestone.currency}`}
      </button>
    </div>
  );
}

// Mounted only while the fund flow is active (parent conditionally renders this
// component), so each open gets a fresh instance and fresh state for free.
export default function FundMilestoneModal({ onClose, milestone, onFunded }: FundMilestoneModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const idempotencyKey = crypto.randomUUID();
        const result = await fundMilestone(milestone.id, { returnUrl: window.location.href }, idempotencyKey);
        if (cancelled) {
          return;
        }

        if (result.paymentIntentClientSecret) {
          setClientSecret(result.paymentIntentClientSecret);
        } else {
          // Already resolved (e.g. an idempotency replay against an already-funded milestone).
          onFunded();
          onClose();
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to start payment.");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestone.id]);

  return (
    <Modal open onClose={onClose} title="Fund milestone">
      {loading ? <p className="text-sm text-slate-600">Preparing payment...</p> : null}
      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}
      {clientSecret ? (
        <Elements options={{ clientSecret }} stripe={getStripe()}>
          <PaymentForm milestone={milestone} onFunded={onFunded} onClose={onClose} />
        </Elements>
      ) : null}
    </Modal>
  );
}
