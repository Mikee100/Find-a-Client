"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Briefcase, GraduationCap, Languages, LinkIcon, MapPin, Star, Wallet } from "lucide-react";
import MarketplaceNavbar from "@/features/shared/marketplace-navbar";
import BackButton from "@/components/ui/back-button";
import FullPageLoader from "@/components/ui/full-page-loader";
import { CurrentUserProfile, getCurrentUserProfile } from "@/lib/api";

type ExperienceItem = {
  id: string;
  role: string;
  company: string;
  period: string;
  summary: string;
};

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

type RecommendationItem = {
  id: string;
  name: string;
  role: string;
  text: string;
};

const EXPERIENCES: ExperienceItem[] = [
  {
    id: "e1",
    role: "Senior Full-stack Engineer",
    company: "Northline Labs",
    period: "2023 - Present",
    summary: "Leading delivery of SaaS platforms with TypeScript, Next.js, and scalable API architecture.",
  },
  {
    id: "e2",
    role: "Frontend Engineer",
    company: "Cloud Harbor",
    period: "2021 - 2023",
    summary: "Built high-conversion product surfaces and design-system-first frontend foundations.",
  },
];

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

const RECOMMENDATIONS: RecommendationItem[] = [
  {
    id: "r1",
    name: "Miriam Ade",
    role: "Product Manager",
    text: "Excellent communicator and highly reliable. Delivered quality features with strong attention to detail.",
  },
  {
    id: "r2",
    name: "Tom Rivera",
    role: "Founder",
    text: "Turned our product vision into a polished platform quickly. Great ownership from planning to launch.",
  },
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
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const me = await getCurrentUserProfile();
        setProfile(me);
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

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <MarketplaceNavbar />
        <FullPageLoader label="Loading profile" fullScreen={false} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <MarketplaceNavbar />

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
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Open to opportunities</span>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">@{profile?.username}</span>
              </div>
            </div>

            <div className="mt-5 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
              <div className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-500" />{profile?.location || "Remote"}</div>
              <div className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-slate-500" />Hourly rate: $80 - $120</div>
              <div className="inline-flex items-center gap-2"><LinkIcon className="h-4 w-4 text-slate-500" />{profile?.websiteUrl || "Website not set"}</div>
              <div className="inline-flex items-center gap-2"><Star className="h-4 w-4 text-slate-500" />4.9 average rating</div>
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
              <div className="space-y-4">
                {EXPERIENCES.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="inline-flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white"><Briefcase className="h-4 w-4" /></span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.role}</p>
                          <p className="text-sm text-slate-600">{item.company}</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">{item.period}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{item.summary}</p>
                  </article>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Portfolio highlights">
              <div className="grid gap-4 sm:grid-cols-2">
                {["SaaS Command Center", "AI Support Assistant"].map((title, idx) => (
                  <article key={title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="relative h-28 w-full bg-slate-100">
                      <Image src="/dashboard_preview.png" alt={title} fill className="object-cover" />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-slate-900">{title}</p>
                      <p className="mt-1 text-xs text-slate-600">Premium product UI and scalable backend architecture.</p>
                      <p className="mt-2 text-xs text-slate-500">{idx === 0 ? "1.2k views" : "870 views"}</p>
                    </div>
                  </article>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Reviews & recommendations">
              <div className="space-y-3">
                {RECOMMENDATIONS.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.role}</p>
                      </div>
                      <span className="text-amber-500">★★★★★</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{item.text}</p>
                  </article>
                ))}
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