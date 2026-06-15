"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  NotificationItem,
  ProjectCategory,
  PricingType,
  createProject,
  getMessageThreads,
  getNotifications,
  getSavedProjects,
  logout,
  publishProject,
  refreshSession,
  updateProfile
} from "@/lib/api";
import { readTokens } from "@/lib/auth";
import DashboardNavbar from "@/features/shared/dashboard-navbar";

const projectCategories: ProjectCategory[] = [
  "WEB_APP",
  "MOBILE_APP",
  "API",
  "DESKTOP",
  "AI_ML",
  "ECOMMERCE",
  "MANAGEMENT_SYSTEM",
  "OTHER"
];

const pricingTypes: PricingType[] = ["FIXED", "NEGOTIABLE", "FREE", "CONTACT"];

function splitCsv(input: string): string[] {
  return input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export default function DeveloperDashboardPage() {
  const router = useRouter();
  const initialTokens = useMemo(() => readTokens(), []);
  const [tokensPreview, setTokensPreview] = useState<string>(
    initialTokens ? JSON.stringify(initialTokens, null, 2) : ""
  );
  const [pendingLogout, setPendingLogout] = useState(false);
  const [refreshState, setRefreshState] = useState<string>("");
  const [profileState, setProfileState] = useState<string>("");
  const [projectState, setProjectState] = useState<string>("");
  const [savedState, setSavedState] = useState<string>("");
  const [analyticsState, setAnalyticsState] = useState<string>("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [threadCount, setThreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [dealInterestCount, setDealInterestCount] = useState(0);
  const [inquiryThreads, setInquiryThreads] = useState<Array<{ id: string; unreadCount: number; updatedAt: string; preview: string }>>([]);
  const [proposalThreads, setProposalThreads] = useState<Array<{ id: string; unreadCount: number; updatedAt: string; preview: string }>>([]);
  const [contractNotifications, setContractNotifications] = useState<NotificationItem[]>([]);
  const [savedProjects, setSavedProjects] = useState<Array<{ id: string; project: { slug: string; title: string } }>>([]);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    bio: "",
    skills: "",
    location: "",
    websiteUrl: "",
    githubUrl: "",
    linkedinUrl: ""
  });
  const [projectForm, setProjectForm] = useState({
    title: "",
    shortDescription: "",
    longDescription: "",
    category: "WEB_APP" as ProjectCategory,
    techStack: "",
    industries: "",
    pricingType: "NEGOTIABLE" as PricingType,
    price: "",
    demoUrl: "",
    publishNow: true
  });

  useEffect(() => {
    if (!initialTokens) {
      router.replace("/login");
    }
  }, [initialTokens, router]);

  useEffect(() => {
    if (!initialTokens) {
      return;
    }

    async function loadSaved() {
      try {
        setSavedState("Loading saved projects...");
        const items = await getSavedProjects();
        setSavedProjects(items.map((item) => ({ id: item.id, project: item.project })));
        setSavedState(items.length ? "Saved projects loaded." : "No saved projects yet.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load saved projects.";
        setSavedState(message);
      }
    }

    async function loadAnalytics() {
      try {
        setAnalyticsState("Loading analytics...");
        const [threads, notifications] = await Promise.all([getMessageThreads(), getNotifications(30)]);

        const inquiry = threads
          .filter((thread) => thread.unreadCount > 0)
          .map((thread) => ({
            id: thread.id,
            unreadCount: thread.unreadCount,
            updatedAt: thread.updatedAt,
            preview: thread.messages[0]?.content ?? "No messages yet"
          }));

        const proposal = threads
          .filter((thread) => thread.unreadCount === 0)
          .map((thread) => ({
            id: thread.id,
            unreadCount: thread.unreadCount,
            updatedAt: thread.updatedAt,
            preview: thread.messages[0]?.content ?? "No messages yet"
          }));

        const contracts = notifications.filter((item) => item.type === "DEAL_INTEREST");

        setThreadCount(threads.length);
        setUnreadMessageCount(threads.reduce((sum, thread) => sum + thread.unreadCount, 0));
        setUnreadNotificationCount(notifications.filter((item) => !item.isRead).length);
        setDealInterestCount(contracts.length);
        setInquiryThreads(inquiry);
        setProposalThreads(proposal);
        setContractNotifications(contracts);
        setAnalyticsState("Analytics loaded.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load analytics.";
        setAnalyticsState(message);
      }
    }

    loadSaved();
    loadAnalytics();
  }, [initialTokens]);

  async function onRefresh() {
    setRefreshState("Refreshing session...");
    const next = await refreshSession();

    if (!next) {
      setRefreshState("Session expired. Please sign in again.");
      router.replace("/login");
      return;
    }

    setTokensPreview(JSON.stringify(next, null, 2));
    setRefreshState("Session refreshed.");
  }

  async function onLogout() {
    setPendingLogout(true);
    await logout();
    router.replace("/login");
  }

  async function onSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileState("");

    try {
      await updateProfile({
        fullName: profileForm.fullName || undefined,
        bio: profileForm.bio || undefined,
        skills: splitCsv(profileForm.skills),
        location: profileForm.location || undefined,
        websiteUrl: profileForm.websiteUrl || undefined,
        githubUrl: profileForm.githubUrl || undefined,
        linkedinUrl: profileForm.linkedinUrl || undefined
      });
      setProfileState("Profile updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Profile update failed.";
      setProfileState(message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function onCreateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProject(true);
    setProjectState("");

    try {
      const created = await createProject({
        title: projectForm.title,
        shortDescription: projectForm.shortDescription,
        longDescription: projectForm.longDescription,
        category: projectForm.category,
        techStack: splitCsv(projectForm.techStack),
        industries: splitCsv(projectForm.industries),
        pricingType: projectForm.pricingType,
        price: projectForm.price ? Number(projectForm.price) : undefined,
        demoUrl: projectForm.demoUrl || undefined
      });

      if (projectForm.publishNow) {
        await publishProject(created.slug);
        setProjectState(`Project created and published: ${created.slug}`);
      } else {
        setProjectState(`Draft created: ${created.slug}`);
      }

      setProjectForm((prev) => ({
        ...prev,
        title: "",
        shortDescription: "",
        longDescription: "",
        techStack: "",
        industries: "",
        price: "",
        demoUrl: ""
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Project creation failed.";
      setProjectState(message);
    } finally {
      setSavingProject(false);
    }
  }

  if (!initialTokens) {
    return null;
  }

  const profileFieldValues = [
    profileForm.fullName,
    profileForm.bio,
    profileForm.skills,
    profileForm.location,
    profileForm.websiteUrl,
    profileForm.githubUrl,
    profileForm.linkedinUrl
  ];
  const completedFields = profileFieldValues.filter((value) => value.trim().length > 0).length;
  const profileProgress = Math.round((completedFields / profileFieldValues.length) * 100);

  return (
    <main className="min-h-screen bg-neutral-50">
      <DashboardNavbar roleLabel="Developer" onSignOut={onLogout} pendingSignOut={pendingLogout} />

      <section className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
          <h1 className="text-2xl font-semibold text-neutral-900">Developer Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-600">Role path: /developer/dashboard</p>
          <p className="mt-2 text-sm text-neutral-600">
            Other role sections: <Link href="/client/dashboard" className="font-semibold text-teal-700">Client</Link> |{" "}
            <Link href="/admin/dashboard" className="font-semibold text-teal-700">Admin</Link>
          </p>
          <button className="mt-3 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm" onClick={onRefresh}>
            Refresh session token
          </button>
          {refreshState ? <p className="mt-2 text-sm text-neutral-600">{refreshState}</p> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-lg border border-neutral-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Profile completion</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">{profileProgress}%</p>
            <p className="text-sm text-neutral-600">{completedFields} of {profileFieldValues.length} fields completed</p>
          </article>
          <article className="rounded-lg border border-neutral-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Active inquiries</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">{unreadMessageCount}</p>
            <p className="text-sm text-neutral-600">Unread messages across {threadCount} threads</p>
          </article>
          <article className="rounded-lg border border-neutral-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Contract signals</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">{dealInterestCount}</p>
            <p className="text-sm text-neutral-600">Deal-interest notifications from clients</p>
          </article>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-lg border border-neutral-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Saved projects</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">{savedProjects.length}</p>
            <p className="text-sm text-neutral-600">Bookmarks available in your workspace</p>
          </article>
          <article className="rounded-lg border border-neutral-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Unread notifications</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">{unreadNotificationCount}</p>
            <p className="text-sm text-neutral-600">System alerts pending review</p>
          </article>
          <article className="rounded-lg border border-neutral-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Session</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">Active</p>
            <p className="text-sm text-neutral-600">Use refresh token control to keep signed in</p>
          </article>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Inquiry pipeline</h2>
            <p className="text-sm text-neutral-600">Inquiry {"->"} Proposal {"->"} Contract</p>
          </div>
          {analyticsState ? <p className="mt-1 text-sm text-neutral-600">{analyticsState}</p> : null}

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <section className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <h3 className="text-sm font-semibold text-amber-900">Inquiry ({inquiryThreads.length})</h3>
              <ul className="mt-2 space-y-2 text-xs text-amber-900">
                {inquiryThreads.length === 0 ? <li>No active inquiries.</li> : null}
                {inquiryThreads.slice(0, 4).map((thread) => (
                  <li key={thread.id} className="rounded border border-amber-200 bg-white p-2">
                    <p className="font-semibold">Thread {thread.id.slice(0, 8)}</p>
                    <p className="line-clamp-2">{thread.preview}</p>
                    <p className="text-[11px]">Unread: {thread.unreadCount}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-md border border-sky-200 bg-sky-50 p-3">
              <h3 className="text-sm font-semibold text-sky-900">Proposal ({proposalThreads.length})</h3>
              <ul className="mt-2 space-y-2 text-xs text-sky-900">
                {proposalThreads.length === 0 ? <li>No proposal-stage threads yet.</li> : null}
                {proposalThreads.slice(0, 4).map((thread) => (
                  <li key={thread.id} className="rounded border border-sky-200 bg-white p-2">
                    <p className="font-semibold">Thread {thread.id.slice(0, 8)}</p>
                    <p className="line-clamp-2">{thread.preview}</p>
                    <p className="text-[11px]">Updated: {new Date(thread.updatedAt).toLocaleDateString()}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <h3 className="text-sm font-semibold text-emerald-900">Contract ({contractNotifications.length})</h3>
              <ul className="mt-2 space-y-2 text-xs text-emerald-900">
                {contractNotifications.length === 0 ? <li>No contract-stage activity yet.</li> : null}
                {contractNotifications.slice(0, 4).map((item) => (
                  <li key={item.id} className="rounded border border-emerald-200 bg-white p-2">
                    <p className="font-semibold">Deal interest</p>
                    <p>{new Date(item.createdAt).toLocaleString()}</p>
                    <p className="text-[11px]">{item.isRead ? "Read" : "Unread"}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <form onSubmit={onSaveProfile} className="grid gap-2 rounded-lg border border-neutral-200 bg-white p-3">
            <h2 className="text-base font-semibold">Profile setup</h2>
            <input
              placeholder="Full name"
              value={profileForm.fullName}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1.5"
            />
            <textarea
              placeholder="Bio"
              value={profileForm.bio}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}
              className="min-h-20 rounded-md border border-neutral-300 bg-white px-2 py-1.5"
            />
            <input
              placeholder="Skills (comma separated)"
              value={profileForm.skills}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, skills: event.target.value }))}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1.5"
            />
            <input
              placeholder="Location"
              value={profileForm.location}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, location: event.target.value }))}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1.5"
            />
            <input
              placeholder="Website URL"
              value={profileForm.websiteUrl}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, websiteUrl: event.target.value }))}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1.5"
            />
            <input
              placeholder="GitHub URL"
              value={profileForm.githubUrl}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, githubUrl: event.target.value }))}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1.5"
            />
            <input
              placeholder="LinkedIn URL"
              value={profileForm.linkedinUrl}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, linkedinUrl: event.target.value }))}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1.5"
            />
            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-md bg-teal-700 px-3 py-2 font-semibold text-white disabled:opacity-70"
            >
              {savingProfile ? "Saving..." : "Save profile"}
            </button>
            {profileState ? <p className="text-sm text-neutral-600">{profileState}</p> : null}
          </form>

          <form onSubmit={onCreateProject} className="grid gap-2 rounded-lg border border-neutral-200 bg-white p-3">
            <h2 className="text-base font-semibold">Create project</h2>
            <input
              placeholder="Title"
              value={projectForm.title}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, title: event.target.value }))}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1.5"
              required
            />
            <input
              placeholder="Short description (max 160)"
              value={projectForm.shortDescription}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, shortDescription: event.target.value }))}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1.5"
              maxLength={160}
              required
            />
            <textarea
              placeholder="Long description"
              value={projectForm.longDescription}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, longDescription: event.target.value }))}
              className="min-h-20 rounded-md border border-neutral-300 bg-white px-2 py-1.5"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={projectForm.category}
                onChange={(event) =>
                  setProjectForm((prev) => ({ ...prev, category: event.target.value as ProjectCategory }))
                }
                className="rounded-md border border-neutral-300 bg-white px-2 py-1.5"
              >
                {projectCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <select
                value={projectForm.pricingType}
                onChange={(event) =>
                  setProjectForm((prev) => ({ ...prev, pricingType: event.target.value as PricingType }))
                }
                className="rounded-md border border-neutral-300 bg-white px-2 py-1.5"
              >
                {pricingTypes.map((pricingType) => (
                  <option key={pricingType} value={pricingType}>
                    {pricingType}
                  </option>
                ))}
              </select>
            </div>
            <input
              placeholder="Tech stack (comma separated)"
              value={projectForm.techStack}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, techStack: event.target.value }))}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1.5"
              required
            />
            <input
              placeholder="Industries (comma separated)"
              value={projectForm.industries}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, industries: event.target.value }))}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1.5"
              required
            />
            <input
              placeholder="Price (optional number)"
              value={projectForm.price}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, price: event.target.value }))}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1.5"
            />
            <input
              placeholder="Demo URL (optional)"
              value={projectForm.demoUrl}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, demoUrl: event.target.value }))}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1.5"
            />
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={projectForm.publishNow}
                onChange={(event) => setProjectForm((prev) => ({ ...prev, publishNow: event.target.checked }))}
              />
              Publish immediately
            </label>
            <button
              type="submit"
              disabled={savingProject}
              className="rounded-md bg-teal-700 px-3 py-2 font-semibold text-white disabled:opacity-70"
            >
              {savingProject ? "Saving..." : "Create project"}
            </button>
            {projectState ? <p className="text-sm text-neutral-600">{projectState}</p> : null}
          </form>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <h2 className="text-base font-semibold">Saved projects</h2>
          {savedState ? <p className="mt-1 text-sm text-neutral-600">{savedState}</p> : null}
          <ul className="mt-2 grid gap-1 text-sm text-neutral-700">
            {savedProjects.map((entry) => (
              <li key={entry.id}>
                <a href={`/projects/${entry.project.slug}`} className="font-semibold text-teal-700">
                  {entry.project.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <pre className="max-h-60 overflow-auto rounded-md border border-neutral-300 bg-white p-3 font-mono text-xs">
          {tokensPreview}
        </pre>
      </section>
    </main>
  );
}