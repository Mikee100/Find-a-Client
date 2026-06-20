"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Briefcase, GraduationCap, Languages, LinkIcon, MapPin, Wallet } from "lucide-react";
import BackButton from "@/components/ui/back-button";
import FullPageLoader from "@/components/ui/full-page-loader";
import { CurrentUserProfile, getCurrentUserProfile, getMyProjects, MyProjectListItem, logout, logoutEverywhere } from "@/lib/api";
import DeveloperDashboardNavbar from "@/features/developer/developer-dashboard-navbar";

type EducationItem = {
  id: string;
  school: string;
  degree: string;
  period: string;
};

type CertificationItem = {
  id: string;
  name: string;
  issuer: string;
  year: string;
};

const EDUCATION_FALLBACK: EducationItem[] = [
  {
    id: "ed1",
    school: "University of Technology",
    degree: "B.Sc Computer Science",
    period: "2016 - 2020",
  },
];

const CERTIFICATIONS_FALLBACK: CertificationItem[] = [
  { id: "c1", name: "AWS Certified Developer", issuer: "Amazon Web Services", year: "2025" },
  { id: "c2", name: "Professional Scrum Developer", issuer: "Scrum.org", year: "2024" },
];

const LANGUAGES_FALLBACK = ["English", "French"];

function parseEducationEntries(entries?: string[] | null): EducationItem[] {
  if (!entries?.length) {
    return EDUCATION_FALLBACK;
  }

  const parsed = entries
    .map((entry, index) => {
      const [school = "", degree = "", period = ""] = entry.split("|").map((part) => part.trim());
      if (!school && !degree && !period) {
        return null;
      }

      return {
        id: `ed-${index}`,
        school: school || "Education",
        degree: degree || "",
        period: period || ""
      };
    })
    .filter((item): item is EducationItem => item !== null);

  return parsed.length ? parsed : EDUCATION_FALLBACK;
}

function parseCertificationEntries(entries?: string[] | null): CertificationItem[] {
  if (!entries?.length) {
    return CERTIFICATIONS_FALLBACK;
  }

  const parsed = entries
    .map((entry, index) => {
      const [name = "", issuer = "", year = ""] = entry.split("|").map((part) => part.trim());
      if (!name && !issuer && !year) {
        return null;
      }

      return {
        id: `cert-${index}`,
        name: name || "Certification",
        issuer: issuer || "",
        year: year || ""
      };
    })
    .filter((item): item is CertificationItem => item !== null);

  return parsed.length ? parsed : CERTIFICATIONS_FALLBACK;
}

function parseLanguageEntries(entries?: string[] | null): string[] {
  const parsed = (entries ?? []).map((entry) => entry.trim()).filter(Boolean);
  return parsed.length ? parsed : LANGUAGES_FALLBACK;
}

function initialsFromProfile(profile: CurrentUserProfile | null): string {
  if (!profile) return "FA";
  const source = profile.fullName?.trim() || profile.email;
  const parts = source.split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function DeveloperProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [projects, setProjects] = useState<MyProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingSignOut, setPendingSignOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [me, myProjects] = await Promise.all([getCurrentUserProfile(), getMyProjects()]);
        setProfile(me);
        setProjects(myProjects);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const initials = useMemo(() => initialsFromProfile(profile), [profile]);
  const fullName = profile?.fullName?.trim() || "Developer Profile";
  const headline = profile?.bio?.trim() || "Product-focused software engineer building high-quality web platforms.";
  const skills = profile?.skills?.length ? profile.skills : ["React", "TypeScript", "Next.js", "Node.js", "PostgreSQL"];
  const educationItems = useMemo(() => parseEducationEntries(profile?.educationEntries), [profile?.educationEntries]);
  const certificationItems = useMemo(() => parseCertificationEntries(profile?.certificationEntries), [profile?.certificationEntries]);
  const languageItems = useMemo(() => parseLanguageEntries(profile?.languageEntries), [profile?.languageEntries]);
  const publishedProjects = useMemo(
    () => projects.filter((project) => project.status === "PUBLISHED"),
    [projects]
  );
  const featuredProjects = useMemo(
    () => [...publishedProjects].sort((left, right) => right.viewCount - left.viewCount).slice(0, 2),
    [publishedProjects]
  );
  const totalViews = useMemo(() => projects.reduce((sum, project) => sum + project.viewCount, 0), [projects]);
  const totalLikes = useMemo(() => projects.reduce((sum, project) => sum + project.likeCount, 0), [projects]);
  const availabilityLabel = useMemo(() => {
    if (!profile?.availabilityStatus) {
      return "Open to opportunities";
    }
    return profile.availabilityStatus
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }, [profile?.availabilityStatus]);

  async function onSignOut() {
    setPendingSignOut(true);
    await logout();
    router.replace("/login");
  }

  async function onSignOutEverywhere() {
    setPendingSignOut(true);
    await logoutEverywhere();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <DeveloperDashboardNavbar
          onSignOut={() => {
            void onSignOut();
          }}
          onSignOutEverywhere={() => {
            void onSignOutEverywhere();
          }}
          pendingSignOut={pendingSignOut}
        />
        <FullPageLoader label="Loading profile" fullScreen={false} />
      </main>
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

      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Professional profile</p>
          </div>
          <div className="flex items-center gap-2">
            <BackButton fallbackHref="/developer/dashboard" label="Back to dashboard" />
            <Link href="/developers/settings" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              Edit profile
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                <div className="inline-flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-slate-900 text-2xl font-bold text-white">
                  {initials}
                </div>
                <div className="pb-1">
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{fullName}</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">{headline}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pb-1">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{availabilityLabel}</span>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">@{profile?.username}</span>
              </div>
            </div>

            <div className="mt-5 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
              <div className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-500" />{profile?.location || "Remote"}</div>
              <div className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-slate-500" />{profile?.primaryStack || "Primary stack not set"}</div>
              <div className="inline-flex items-center gap-2"><LinkIcon className="h-4 w-4 text-slate-500" />{profile?.websiteUrl || "Website not set"}</div>
              <div className="inline-flex items-center gap-2"><Briefcase className="h-4 w-4 text-slate-500" />{profile?.experienceLevel || "MID"} level</div>
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-6">
            <SectionCard title="About">
              <p className="text-sm leading-relaxed text-slate-700">{headline}</p>
            </SectionCard>

            <SectionCard title="Experience">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="inline-flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white"><Briefcase className="h-4 w-4" /></span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{profile?.title || "Professional title not set"}</p>
                    <p className="text-sm text-slate-600">{profile?.primaryStack || "Primary stack not set"}</p>
                    <p className="mt-1 text-xs text-slate-500">Experience level: {profile?.experienceLevel || "MID"} · Availability: {availabilityLabel}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-700">{headline}</p>
              </article>
            </SectionCard>

            <SectionCard title="Portfolio highlights">
              {featuredProjects.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {featuredProjects.map((project) => (
                    <article key={project.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className="relative h-28 w-full bg-slate-100">
                        <Image src={project.thumbnailUrl ?? project.backgroundUrl ?? "/dashboard_preview.png"} alt={project.title} fill className="object-cover" />
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold text-slate-900">{project.title}</p>
                        <p className="mt-1 text-xs text-slate-600 line-clamp-2">{project.shortDescription}</p>
                        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                          <span>{project.viewCount} views</span>
                          <span>{project.likeCount} likes</span>
                        </div>
                        <Link href={`/projects/${project.slug}`} className="mt-2 inline-flex text-xs font-semibold text-blue-700 hover:underline">
                          View project
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-600">
                  No published portfolio highlights yet. Publish a project to showcase your work here.
                </p>
              )}
            </SectionCard>

            <SectionCard title="Portfolio metrics">
              <div className="grid gap-3 sm:grid-cols-3">
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total projects</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{projects.length}</p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Portfolio views</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{totalViews}</p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Project likes</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{totalLikes}</p>
                </article>
              </div>
            </SectionCard>
          </div>

          <aside className="space-y-6">
            <SectionCard title="Skills">
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span key={skill} className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{skill}</span>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Education">
              <div className="space-y-3">
                {educationItems.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="inline-flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white"><GraduationCap className="h-4 w-4" /></span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.school}</p>
                        <p className="text-sm text-slate-600">{item.degree}</p>
                        <p className="text-xs text-slate-500">{item.period}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Certifications">
              <div className="space-y-2">
                {certificationItems.map((item) => (
                  <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-600">{item.issuer} · {item.year}</p>
                  </article>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Languages">
              <div className="space-y-2">
                {languageItems.map((language) => (
                  <div key={language} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <Languages className="h-4 w-4 text-slate-500" />
                    {language}
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Links">
              <div className="space-y-2 text-sm">
                <p className="text-slate-700">GitHub: <span className="text-slate-500">{profile?.githubUrl || "Not provided"}</span></p>
                <p className="text-slate-700">LinkedIn: <span className="text-slate-500">{profile?.linkedinUrl || "Not provided"}</span></p>
                <p className="text-slate-700">Website: <span className="text-slate-500">{profile?.websiteUrl || "Not provided"}</span></p>
              </div>
            </SectionCard>
          </aside>
        </div>
      </section>
    </main>
  );
}