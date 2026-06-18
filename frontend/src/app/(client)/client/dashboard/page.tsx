"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import DashboardNavbar from "@/features/shared/dashboard-navbar";
import { getMessageThreads, getSavedProjects, logout, ProjectSummary, ThreadSummary } from "@/lib/api";
import { readTokens } from "@/lib/auth";

const recommendedCards = [
  {
    title: "Full-stack marketplace build",
    description: "React, NestJS, payments, dashboards, and profile workflows.",
    tags: ["React", "NestJS", "PostgreSQL"],
    rate: "$3k+ fixed"
  },
  {
    title: "AI workflow automation",
    description: "Internal tools, document flows, and custom model integrations.",
    tags: ["Python", "OpenAI", "APIs"],
    rate: "Contact"
  },
  {
    title: "Mobile MVP sprint",
    description: "Fast mobile product delivery with clean release-ready UI.",
    tags: ["React Native", "Firebase", "Stripe"],
    rate: "$45/hr"
  }
];

function latestMessage(thread: ThreadSummary): string {
  return thread.messages[0]?.content ?? "No messages yet.";
}

function projectPrice(project: ProjectSummary): string {
  if (project.pricingType === "FREE") {
    return "Free";
  }

  if (project.pricingType === "CONTACT" || project.price === null || project.price === undefined) {
    return "Contact";
  }

  return `${project.currency ?? "USD"} ${project.price}`;
}

export default function ClientDashboardPage() {
  const router = useRouter();
  const initialTokens = useMemo(() => readTokens(), []);
  const [pendingLogout, setPendingLogout] = useState(false);
  const [savedProjects, setSavedProjects] = useState<ProjectSummary[]>([]);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [savedState, setSavedState] = useState("Loading saved work...");
  const [messageState, setMessageState] = useState("Loading messages...");

  useEffect(() => {
    if (!initialTokens) {
      router.replace("/login");
    }
  }, [initialTokens, router]);

  useEffect(() => {
    if (!initialTokens) {
      return;
    }

    async function loadWorkspace() {
      try {
        const saved = await getSavedProjects();
        setSavedProjects(saved.map((item) => item.project));
        setSavedState(saved.length ? "Saved projects loaded." : "No saved projects yet.");
      } catch (error) {
        setSavedState(error instanceof Error ? error.message : "Saved projects could not be loaded.");
      }

      try {
        const messageThreads = await getMessageThreads();
        setThreads(messageThreads);
        setMessageState(messageThreads.length ? "Recent conversations loaded." : "No messages yet.");
      } catch (error) {
        setMessageState(error instanceof Error ? error.message : "Messages could not be loaded.");
      }
    }

    loadWorkspace();
  }, [initialTokens]);

  async function onLogout() {
    setPendingLogout(true);
    await logout();
    router.replace("/login");
  }

  if (!initialTokens) {
    return null;
  }

  const unreadCount = threads.reduce((sum, thread) => sum + thread.unreadCount, 0);

  return (
    <main className="min-h-screen bg-neutral-50">
      <DashboardNavbar roleLabel="Client" onSignOut={onLogout} pendingSignOut={pendingLogout} />

      <section className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Client workspace</p>
              <h1 className="mt-2 text-2xl font-semibold text-neutral-900 md:text-3xl">Find the right developer for your next build</h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                Browse published work, save promising projects, and start focused conversations from one place.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
              <Link href="/client/discover" className="rounded-md bg-teal-700 px-4 py-2 text-center text-sm font-semibold text-white">
                Search developers and projects
              </Link>
              <Link href="/client/discover?sort=popular" className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-center text-sm font-semibold text-neutral-800">
                Browse recommendations
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Saved</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">{savedProjects.length}</p>
            <p className="text-sm text-neutral-600">Projects ready for review</p>
          </article>
          <article className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Unread</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">{unreadCount}</p>
            <p className="text-sm text-neutral-600">Messages awaiting a reply</p>
          </article>
          <article className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Hiring tracker</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">0</p>
            <p className="text-sm text-neutral-600">Request tracking placeholder</p>
          </article>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">Saved projects and developers</h2>
                <p className="mt-1 text-sm text-neutral-600">{savedState}</p>
              </div>
              <Link href="/client/discover" className="text-sm font-semibold text-teal-700">
                Discover more
              </Link>
            </div>

            <div className="mt-4 grid gap-3">
              {savedProjects.length === 0 ? (
                <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-4">
                  <p className="text-sm font-semibold text-neutral-800">No saved projects yet</p>
                  <p className="mt-1 text-sm text-neutral-600">Use discovery to shortlist developers and demos before starting a conversation.</p>
                </div>
              ) : null}

              {savedProjects.slice(0, 4).map((project) => (
                <article key={project.id} className="rounded-md border border-neutral-200 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Link href={`/client/discover/${project.slug}`} className="font-semibold text-neutral-900 hover:text-teal-700">
                        {project.title}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{project.shortDescription}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">
                      {projectPrice(project)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="text-base font-semibold text-neutral-900">Recent messages</h2>
            <p className="mt-1 text-sm text-neutral-600">{messageState}</p>
            <div className="mt-4 grid gap-3">
              {threads.length === 0 ? (
                <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-4">
                  <p className="text-sm font-semibold text-neutral-800">No conversations yet</p>
                  <p className="mt-1 text-sm text-neutral-600">Message a developer from discovery when you find a strong fit.</p>
                </div>
              ) : null}
              {threads.slice(0, 4).map((thread) => (
                <article key={thread.id} className="rounded-md border border-neutral-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-neutral-900">Thread {thread.id.slice(0, 8)}</p>
                    {thread.unreadCount ? (
                      <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">{thread.unreadCount} unread</span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{latestMessage(thread)}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Hiring request tracker</h2>
              <p className="mt-1 text-sm text-neutral-600">Request workflow UI is ready; backend hire request endpoints are not present yet.</p>
            </div>
            <Link href="/client/discover" className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-center text-sm font-semibold text-neutral-800">
              Start from discovery
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {["Draft request", "Developer reply", "Ready to hire"].map((stage) => (
              <div key={stage} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-sm font-semibold text-neutral-900">{stage}</p>
                <p className="mt-1 text-sm text-neutral-600">No items yet.</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-base font-semibold text-neutral-900">Recommended starting points</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {recommendedCards.map((card) => (
              <article key={card.title} className="rounded-md border border-neutral-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-neutral-900">{card.title}</h3>
                  <span className="shrink-0 text-xs font-semibold text-teal-700">{card.rate}</span>
                </div>
                <p className="mt-2 text-sm text-neutral-600">{card.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {card.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
