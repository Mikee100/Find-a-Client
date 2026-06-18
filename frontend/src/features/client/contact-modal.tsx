"use client";

import { FormEvent, useState } from "react";
import { createMessageThread, ProjectSummary } from "@/lib/api";

type ContactMode = "message" | "hire";

interface ContactModalProps {
  mode: ContactMode;
  project: ProjectSummary;
  developerName?: string;
  onClose: () => void;
}

export default function ContactModal({ mode, project, developerName, onClose }: ContactModalProps) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setNotice(null);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const projectTitle = String(formData.get("projectTitle") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const budget = String(formData.get("budget") ?? "").trim();
    const timeline = String(formData.get("timeline") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();

    if (mode === "hire") {
      setPending(false);
      setNotice("Hire request endpoints are not available yet. Your request was not sent to the backend.");
      return;
    }

    try {
      const initialMessage = [
        projectTitle ? `Project: ${projectTitle}` : "",
        description ? `Brief: ${description}` : "",
        budget ? `Budget: ${budget}` : "",
        timeline ? `Timeline: ${timeline}` : "",
        message
      ]
        .filter(Boolean)
        .join("\n\n");

      await createMessageThread({
        recipientId: project.authorId,
        projectId: project.id,
        initialMessage
      });
      setNotice("Message thread created. You can continue the conversation from your messages workspace.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Message could not be sent.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-neutral-950/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl border border-neutral-200 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              {mode === "hire" ? "Hire request" : "Message developer"}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-neutral-950">{developerName ?? project.title}</h2>
            <p className="mt-1 text-sm text-neutral-600">{project.title}</p>
          </div>
          <button onClick={onClose} className="rounded-md border border-neutral-300 px-2 py-1 text-sm text-neutral-700">
            Close
          </button>
        </div>

        {notice ? <p className="mt-4 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">{notice}</p> : null}
        {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <form onSubmit={onSubmit} className="mt-4 grid gap-3">
          <div className="grid gap-1.5">
            <label htmlFor="projectTitle" className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Project title
            </label>
            <input
              id="projectTitle"
              name="projectTitle"
              defaultValue={project.title}
              required
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="description" className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Brief description
            </label>
            <textarea
              id="description"
              name="description"
              required
              className="min-h-24 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              defaultValue={project.shortDescription}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="budget" className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Budget range
              </label>
              <input
                id="budget"
                name="budget"
                placeholder="$2,000 - $5,000"
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="timeline" className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Timeline
              </label>
              <input
                id="timeline"
                name="timeline"
                placeholder="4-6 weeks"
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="message" className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Message to developer
            </label>
            <textarea
              id="message"
              name="message"
              required
              className="min-h-24 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-teal-700 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
          >
            {pending ? "Submitting..." : mode === "hire" ? "Prepare hire request" : "Send message"}
          </button>
        </form>
      </div>
    </div>
  );
}
