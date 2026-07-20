"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MarketplaceNavbar from "@/features/shared/marketplace-navbar";
import FullPageLoader from "@/components/ui/full-page-loader";
import {
  createHireRequest,
  createMessageThread,
  getAuthSession,
  getDeveloperPublicProfile,
  PublicDeveloperProfile,
  trackProjectInquiry
} from "@/lib/api";

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function PublicDeveloperProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params?.username;

  const [profile, setProfile] = useState<PublicDeveloperProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPendingKey, setActionPendingKey] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getDeveloperPublicProfile(username);
        setProfile(data);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Failed to load developer profile.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [username]);

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-50">
        <MarketplaceNavbar />
        <FullPageLoader label="Loading developer profile" fullScreen={false} />
      </main>
    );
  }

  if (!profile || error) {
    return (
      <main className="min-h-screen bg-neutral-50">
        <MarketplaceNavbar />
        <section className="mx-auto max-w-4xl px-4 py-6">
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error ?? "Developer not found."}</p>
          <Link href="/developers" className="mt-3 inline-flex rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700">
            Back to developers
          </Link>
        </section>
      </main>
    );
  }

  async function onContact(project: PublicDeveloperProfile["projects"][number], mode: "ASK_QUESTION" | "OFFER_PROJECT") {
    if (!profile) {
      setActionFeedback("Developer profile is not available yet.");
      return;
    }

    const actionKey = `${project.id}:${mode}`;
    setActionPendingKey(actionKey);
    setActionFeedback(null);

    try {
      const session = await getAuthSession();

      if (session.sub === profile.id) {
        setActionFeedback("You cannot contact yourself on your own public profile.");
        return;
      }

      const defaultMessage =
        mode === "ASK_QUESTION"
          ? `Hi ${profile.fullName}, I have a question about your project \"${project.title}\".`
          : `Hi ${profile.fullName}, I would like to discuss hiring you for a project similar to \"${project.title}\".`;

      const customMessage = window.prompt(
        mode === "ASK_QUESTION" ? "Type your question message:" : "Type your project offer message:",
        defaultMessage
      );

      if (customMessage === null) {
        return;
      }

      const trimmedMessage = customMessage.trim();
      if (!trimmedMessage) {
        setActionFeedback("Message cannot be empty.");
        return;
      }

      await trackProjectInquiry(project.slug, {
        type: mode,
        message: trimmedMessage
      });

      const thread = await createMessageThread({
        recipientId: profile.id,
        projectId: project.id,
        initialMessage: trimmedMessage
      });

      let hireRequestId: string | null = null;
      if (mode === "OFFER_PROJECT") {
        const hireRequest = await createHireRequest({
          developerId: profile.id,
          projectId: project.id,
          threadId: thread.id,
          brief: trimmedMessage
        });

        hireRequestId = hireRequest.id;
      }

      setActionFeedback(
        mode === "ASK_QUESTION"
          ? `Question sent. Conversation thread created (${thread.id.slice(0, 8)}).`
          : `Project offer sent. Hire request ${hireRequestId ? `(${hireRequestId.slice(0, 8)})` : ""} created with thread ${thread.id.slice(0, 8)}.`
      );
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to send request.";
      if (message.toLowerCase().includes("401")) {
        setActionFeedback("Please login to contact this developer.");
      } else {
        setActionFeedback(message);
      }
    } finally {
      setActionPendingKey(null);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <MarketplaceNavbar />

      <section className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">Developer</p>
              <h1 className="text-2xl font-semibold tracking-tight">{profile.fullName}</h1>
              <p className="text-sm text-neutral-600">{profile.title || profile.primaryStack || "Developer"}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded border border-neutral-200 bg-neutral-100 px-2 py-1">{toTitleCase(profile.experienceLevel)}</span>
              <span className="rounded border border-neutral-200 bg-neutral-100 px-2 py-1">{toTitleCase(profile.availabilityStatus)}</span>
              <span className="rounded border border-neutral-200 bg-neutral-100 px-2 py-1">{profile.location || "Remote"}</span>
            </div>
          </div>

          <p className="mt-3 text-sm text-neutral-700">{profile.bio || "No bio provided."}</p>

          <div className="mt-3 flex flex-wrap gap-1">
            {profile.skills.map((skill) => (
              <span key={skill} className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-700">
                {skill}
              </span>
            ))}
          </div>

          <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
            <p>GitHub: {profile.githubUrl ? <a href={profile.githubUrl} className="text-blue-700 underline">{profile.githubUrl}</a> : "Not set"}</p>
            <p>LinkedIn: {profile.linkedinUrl ? <a href={profile.linkedinUrl} className="text-blue-700 underline">{profile.linkedinUrl}</a> : "Not set"}</p>
            <p>Website: {profile.websiteUrl ? <a href={profile.websiteUrl} className="text-blue-700 underline">{profile.websiteUrl}</a> : "Not set"}</p>
            <p>Contact: {profile.contactEmail || "Private"}</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">Projects</h2>
            <span className="text-xs text-neutral-500">{profile.projects.length} published</span>
          </div>

          {actionFeedback ? (
            <p className="mb-3 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-800">{actionFeedback}</p>
          ) : null}

          {profile.projects.length === 0 ? (
            <p className="text-sm text-neutral-600">No published projects yet.</p>
          ) : (
            <ul className="space-y-2">
              {profile.projects.map((project) => (
                <li key={project.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/projects/${project.slug}`} className="text-sm font-semibold text-neutral-900 hover:underline">
                      {project.title}
                    </Link>
                    <span className="text-xs text-neutral-500">{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">{project.shortDescription}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-neutral-600">
                    <span>{project.likeCount} likes</span>
                    <span>{project.viewCount} views</span>
                    <span>{project.inquiryCount} inquiries</span>
                    <span>{project.techStack.slice(0, 3).join(" · ")}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void onContact(project, "ASK_QUESTION");
                      }}
                      disabled={actionPendingKey === `${project.id}:ASK_QUESTION`}
                      className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
                    >
                      {actionPendingKey === `${project.id}:ASK_QUESTION` ? "Sending..." : "Ask question"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void onContact(project, "OFFER_PROJECT");
                      }}
                      disabled={actionPendingKey === `${project.id}:OFFER_PROJECT`}
                      className="rounded-md border border-cyan-300 bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-100 disabled:opacity-60"
                    >
                      {actionPendingKey === `${project.id}:OFFER_PROJECT` ? "Sending..." : "Offer project"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
