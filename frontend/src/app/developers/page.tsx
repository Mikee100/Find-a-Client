"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MarketplaceNavbar from "@/features/shared/marketplace-navbar";
import FullPageLoader from "@/components/ui/full-page-loader";
import {
  DeveloperSearchItem,
  searchDevelopers,
  SearchDevelopersParams
} from "@/lib/api";

const EXPERIENCE_OPTIONS = ["JUNIOR", "MID", "SENIOR"] as const;
const AVAILABILITY_OPTIONS = ["AVAILABLE", "BUSY", "NOT_ACCEPTING_WORK"] as const;

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function DevelopersPage() {
  const [items, setItems] = useState<DeveloperSearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<"" | (typeof EXPERIENCE_OPTIONS)[number]>("");
  const [availabilityStatus, setAvailabilityStatus] = useState<"" | (typeof AVAILABILITY_OPTIONS)[number]>("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const payload: SearchDevelopersParams = {
          q: q.trim() || undefined,
          skills: skillsText
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          experienceLevel: experienceLevel || undefined,
          availabilityStatus: availabilityStatus || undefined,
          location: location.trim() || undefined,
          limit: 50
        };

        const data = await searchDevelopers(payload);
        setItems(data);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Failed to load developers.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [q, skillsText, experienceLevel, availabilityStatus, location]);

  const averageScore = useMemo(() => {
    if (!items.length) {
      return 0;
    }
    return Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length);
  }, [items]);

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-50">
        <MarketplaceNavbar />
        <FullPageLoader label="Loading developers" fullScreen={false} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <MarketplaceNavbar />

      <section className="mx-auto w-full max-w-7xl px-4 py-5 md:px-6 md:py-7">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Discovery</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Find Developers</h1>
          <p className="mt-1 text-sm text-neutral-600">Ranked by profile quality, relevance, and project engagement.</p>

          <div className="mt-4 grid gap-2 md:grid-cols-5">
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search name, stack, bio"
              className="h-10 rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-900"
            />
            <input
              value={skillsText}
              onChange={(event) => setSkillsText(event.target.value)}
              placeholder="Skills (comma-separated)"
              className="h-10 rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-900"
            />
            <select
              value={experienceLevel}
              onChange={(event) => setExperienceLevel(event.target.value as "" | (typeof EXPERIENCE_OPTIONS)[number])}
              className="h-10 rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-900"
            >
              <option value="">All levels</option>
              {EXPERIENCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {toTitleCase(option)}
                </option>
              ))}
            </select>
            <select
              value={availabilityStatus}
              onChange={(event) => setAvailabilityStatus(event.target.value as "" | (typeof AVAILABILITY_OPTIONS)[number])}
              className="h-10 rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-900"
            >
              <option value="">All availability</option>
              {AVAILABILITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {toTitleCase(option)}
                </option>
              ))}
            </select>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Location"
              className="h-10 rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-900"
            />
          </div>

          <div className="mt-3 flex items-center gap-3 text-xs text-neutral-600">
            <span className="rounded-md border border-neutral-200 bg-neutral-100 px-2 py-1">{items.length} developers</span>
            <span className="rounded-md border border-neutral-200 bg-neutral-100 px-2 py-1">Avg score {averageScore}</span>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="hidden grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_0.8fr_120px] gap-3 border-b border-neutral-200 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 md:grid">
            <span>Developer</span>
            <span>Experience</span>
            <span>Availability</span>
            <span>Projects</span>
            <span>Score</span>
            <span />
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-neutral-600">No developers match your current filters.</p>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {items.map((item) => (
                <li key={item.id} className="grid gap-2 px-4 py-3 md:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_0.8fr_120px] md:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                        {initials(item.fullName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-neutral-900">{item.fullName}</p>
                        <p className="truncate text-xs text-neutral-600">{item.title || item.primaryStack || "Developer"}</p>
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{item.bio || "No bio provided yet."}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.skills.slice(0, 4).map((skill) => (
                        <span key={skill} className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-700">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-neutral-700">{toTitleCase(item.experienceLevel)}</p>
                  <p className="text-xs text-neutral-700">{toTitleCase(item.availabilityStatus)}</p>
                  <p className="text-xs text-neutral-700">{item.projectCount}</p>
                  <p className="text-xs font-semibold text-neutral-900">{item.score}</p>

                  <Link
                    href={`/developers/${item.username}`}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-neutral-300 px-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
