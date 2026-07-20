"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import ClientDashboardNavbar from "@/features/client/client-dashboard-navbar";
import {
  CurrentUserProfile,
  getCurrentUserProfile,
  updateProfile
} from "@/lib/api";
import FullPageLoader from "@/components/ui/full-page-loader";
import BackButton from "@/components/ui/back-button";

function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export default function ClientSettingsPage() {
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [location, setLocation] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const me = await getCurrentUserProfile();
        setProfile(me);
        setFullName(me.fullName ?? "");
        setBio(me.bio ?? "");
        setSkillsInput((me.skills ?? []).join(", "));
        setLocation(me.location ?? "");
        setWebsiteUrl(me.websiteUrl ?? "");
        setGithubUrl(me.githubUrl ?? "");
        setLinkedinUrl(me.linkedinUrl ?? "");
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Failed to load account settings.";
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  let initials = "AC";
  if (fullName.trim()) {
    const parts = fullName.trim().split(" ").filter(Boolean);
    if (parts.length >= 2) {
      initials = `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    } else {
      initials = parts[0].slice(0, 2).toUpperCase();
    }
  } else if (profile?.email) {
    initials = profile.email.slice(0, 2).toUpperCase();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      await updateProfile({
        fullName: fullName.trim() || undefined,
        bio: bio.trim() || undefined,
        skills: parseCommaList(skillsInput),
        location: location.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined
      });

      setSuccess("Account settings updated.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to save settings.";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 md:p-5">
        <ClientDashboardNavbar />
        <FullPageLoader label="Loading account settings" fullScreen={false} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <ClientDashboardNavbar />
      <section className="mx-auto w-full max-w-5xl p-3 md:p-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Client Settings</h1>
              <p className="mt-1 text-sm text-slate-500">Manage your account details used across your hiring workspace.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/account/change-password"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
              >
                Change password
              </Link>
              <BackButton fallbackHref="/client/feed" label="Back to feed" />
            </div>
          </div>

          <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
              {initials}
            </span>
            <div>
              <p className="font-semibold text-slate-900">{profile?.email}</p>
              <p className="text-xs text-slate-500">@{profile?.username} - {profile?.role}</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-800">Full name</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-800">Location</span>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
                />
              </label>
            </div>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-800">Bio</span>
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-800">Skills / Focus Areas (comma-separated)</span>
              <input
                value={skillsInput}
                onChange={(event) => setSkillsInput(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
                placeholder="Product strategy, Recruiting, SaaS"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-800">Website</span>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-800">GitHub</span>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(event) => setGithubUrl(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-800">LinkedIn</span>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(event) => setLinkedinUrl(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
                />
              </label>
            </div>

            {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
            {success ? <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">{success}</p> : null}

            <div className="flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
              >
                {pending ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
