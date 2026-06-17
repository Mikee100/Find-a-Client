"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import MarketplaceNavbar from "@/features/shared/marketplace-navbar";
import {
  CurrentUserProfile,
  getCurrentUserProfile,
  updateProfile
} from "@/lib/api";
import FullPageLoader from "@/components/ui/full-page-loader";
import BackButton from "@/components/ui/back-button";

const LOCATION_OPTIONS = [
  "Lagos, Nigeria",
  "Nairobi, Kenya",
  "Accra, Ghana",
  "Johannesburg, South Africa",
  "Cairo, Egypt",
  "London, United Kingdom",
  "New York, United States",
  "Toronto, Canada",
  "Remote"
];

const SKILL_OPTIONS = [
  "React",
  "Next.js",
  "TypeScript",
  "Node.js",
  "NestJS",
  "PostgreSQL",
  "MongoDB",
  "Docker",
  "AWS",
  "Azure",
  "Python",
  "UI/UX"
];

const BIO_TEMPLATES = [
  {
    id: "fullstack",
    label: "Full-stack developer",
    text: "Full-stack developer focused on building reliable web products with clean architecture, fast delivery, and clear communication."
  },
  {
    id: "frontend",
    label: "Frontend specialist",
    text: "Frontend specialist creating responsive, accessible interfaces with strong design implementation and performance optimization."
  },
  {
    id: "backend",
    label: "Backend/API engineer",
    text: "Backend engineer building secure APIs, scalable services, and robust data layers for production systems."
  },
  {
    id: "mobile",
    label: "Mobile app developer",
    text: "Mobile developer delivering polished cross-platform app experiences with smooth UX and maintainable codebases."
  }
] as const;

type SettingsErrors = {
  fullName?: string;
  bio?: string;
  contactEmail?: string;
  phoneNumber?: string;
  websiteUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
};

function toCandidateUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function validateGenericUrl(value: string): string | null {
  if (!value.trim()) {
    return null;
  }

  try {
    const parsed = new URL(toCandidateUrl(value));
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "URL must start with http:// or https://.";
    }
    if (!parsed.hostname.includes(".")) {
      return "URL host looks incomplete.";
    }
    return null;
  } catch {
    return "Enter a valid URL.";
  }
}

function validateGithubUrl(value: string): string | null {
  if (!value.trim()) {
    return null;
  }

  try {
    const parsed = new URL(toCandidateUrl(value));
    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== "github.com" && hostname !== "www.github.com") {
      return "Use a GitHub URL from github.com.";
    }

    const path = parsed.pathname.replace(/\/+$/, "");
    if (!path || path === "/") {
      return "Provide a specific GitHub profile or repository URL.";
    }

    return null;
  } catch {
    return "Enter a valid GitHub URL.";
  }
}

function validateLinkedInUrl(value: string): string | null {
  if (!value.trim()) {
    return null;
  }

  try {
    const parsed = new URL(toCandidateUrl(value));
    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== "linkedin.com" && hostname !== "www.linkedin.com") {
      return "Use a LinkedIn URL from linkedin.com.";
    }

    const path = parsed.pathname.toLowerCase();
    if (!(path.startsWith("/in/") || path.startsWith("/company/") || path.startsWith("/pub/"))) {
      return "Use a LinkedIn profile or company page URL.";
    }

    return null;
  } catch {
    return "Enter a valid LinkedIn URL.";
  }
}

export default function DeveloperSettingsPage() {
  const searchParams = useSearchParams();
  const isOnboardingFlow = searchParams.get("onboarding") === "1";
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [selectedBioTemplate, setSelectedBioTemplate] = useState<(typeof BIO_TEMPLATES)[number]["id"] | "existing">("fullstack");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [fieldErrors, setFieldErrors] = useState<SettingsErrors>({});

  useEffect(() => {
    void (async () => {
      try {
        const me = await getCurrentUserProfile();
        setProfile(me);
        setFullName(me.fullName ?? "");
        const existingBio = me.bio ?? "";
        const matchedTemplate = BIO_TEMPLATES.find((item) => item.text === existingBio);
        setBio(existingBio || BIO_TEMPLATES[0].text);
        setSelectedBioTemplate(matchedTemplate ? matchedTemplate.id : "existing");
        setSelectedSkills((me.skills ?? []).filter((skill) => SKILL_OPTIONS.includes(skill)));
        setLocation(me.location && LOCATION_OPTIONS.includes(me.location) ? me.location : "Remote");
        setContactEmail(me.contactEmail ?? me.email ?? "");
        setPhoneNumber(me.phoneNumber ?? "");
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

  function toggleSkill(skill: string): void {
    setSelectedSkills((current) =>
      current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]
    );
  }

  function onBioTemplateChange(value: string): void {
    if (value === "existing") {
      setSelectedBioTemplate("existing");
      return;
    }

    const template = BIO_TEMPLATES.find((item) => item.id === value);
    if (!template) {
      return;
    }

    setSelectedBioTemplate(template.id);
    setBio(template.text);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPending(true);
    setError(null);
    setSuccess(null);

    const nextErrors: SettingsErrors = {};
    const trimmedName = fullName.trim();
    const trimmedBio = bio.trim();
    const trimmedContactEmail = contactEmail.trim();
    const trimmedPhoneNumber = phoneNumber.trim();

    if (trimmedName.length > 0 && trimmedName.length < 2) {
      nextErrors.fullName = "Full name must be at least 2 characters.";
    }

    if (trimmedBio.length > 500) {
      nextErrors.bio = "Bio must be 500 characters or less.";
    }

    if (trimmedContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedContactEmail)) {
      nextErrors.contactEmail = "Enter a valid contact email.";
    }

    if (trimmedPhoneNumber && !/^\+?[0-9()\-\s]{7,20}$/.test(trimmedPhoneNumber)) {
      nextErrors.phoneNumber = "Phone must use digits and can include +, spaces, (), -.";
    }

    const websiteError = validateGenericUrl(websiteUrl);
    if (websiteError) {
      nextErrors.websiteUrl = websiteError;
    }

    const githubError = validateGithubUrl(githubUrl);
    if (githubError) {
      nextErrors.githubUrl = githubError;
    }

    const linkedinError = validateLinkedInUrl(linkedinUrl);
    if (linkedinError) {
      nextErrors.linkedinUrl = linkedinError;
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError("Please fix the highlighted fields and try again.");
      setPending(false);
      return;
    }

    try {
      await updateProfile({
        fullName: trimmedName || undefined,
        bio: trimmedBio || undefined,
        skills: selectedSkills,
        location: location.trim() || undefined,
        contactEmail: trimmedContactEmail || undefined,
        phoneNumber: trimmedPhoneNumber || undefined,
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
      <main className="min-h-screen bg-neutral-50 p-6">
        <MarketplaceNavbar />
        <FullPageLoader label="Loading account settings" fullScreen={false} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <MarketplaceNavbar />
      <section className="w-full px-4 py-4 md:px-8 md:py-6">
        <div className="w-full">
          {isOnboardingFlow ? (
            <div className="mb-4 border-l-2 border-cyan-500 pl-3 text-sm text-cyan-900">
              Welcome to developer onboarding. Complete your profile details, then continue to your dashboard.
            </div>
          ) : null}

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">Account Settings</h1>
              <p className="mt-1 text-sm text-neutral-600">Manage your profile information visible across the platform.</p>
            </div>
            <BackButton fallbackHref="/developer/dashboard" label="Back to dashboard" />
          </div>

          <div className="mb-5 flex items-center gap-3 border-y border-neutral-200 py-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white">
              {initials}
            </span>
            <div>
              <p className="font-semibold text-neutral-900">{profile?.email}</p>
              <p className="text-xs text-neutral-600">@{profile?.username} · {profile?.role}</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
              <section className="py-1 lg:border-r lg:border-neutral-200 lg:pr-8">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">Account Information</h2>
                <div className="mt-3 grid gap-3">
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-neutral-800">Full name</span>
                    <input
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className={`rounded-lg border px-3 py-2 outline-none transition ${fieldErrors.fullName ? "border-red-400" : "border-neutral-300 focus:border-cyan-500"}`}
                    />
                    {fieldErrors.fullName ? <span className="text-xs text-red-600">{fieldErrors.fullName}</span> : null}
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-neutral-800">Username</span>
                    <input
                      value={profile?.username ?? ""}
                      disabled
                      className="rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-neutral-600"
                    />
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-neutral-800">Location</span>
                    <select
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      className="rounded-lg border border-neutral-300 px-3 py-2 outline-none transition focus:border-cyan-500"
                    >
                      {LOCATION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-neutral-800">Bio template</span>
                    <select
                      value={selectedBioTemplate}
                      onChange={(event) => onBioTemplateChange(event.target.value)}
                      className="rounded-lg border border-neutral-300 px-3 py-2 outline-none transition focus:border-cyan-500"
                    >
                      {BIO_TEMPLATES.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                      <option value="existing">Keep existing bio</option>
                    </select>
                    <p className={`rounded-lg border px-3 py-2 text-sm ${fieldErrors.bio ? "border-red-300 bg-red-50 text-red-700" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`}>
                      {bio || "No bio selected."}
                    </p>
                    <div className="flex items-center justify-between">
                      {fieldErrors.bio ? <span className="text-xs text-red-600">{fieldErrors.bio}</span> : <span className="text-xs text-neutral-500">Up to 500 characters.</span>}
                      <span className="text-xs text-neutral-500">{bio.trim().length}/500</span>
                    </div>
                  </label>

                  <div className="grid gap-1 text-sm">
                    <span className="font-medium text-neutral-800">Skills (select options)</span>
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                      {SKILL_OPTIONS.map((skill) => {
                        const selected = selectedSkills.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            className={`rounded-md border px-2 py-1.5 text-xs text-left transition ${selected ? "border-cyan-700 bg-cyan-50 text-cyan-900" : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500"}`}
                          >
                            {selected ? "✓ " : ""}
                            {skill}
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-xs text-neutral-500">Selected: {selectedSkills.length}</span>
                  </div>
                </div>
              </section>

              <section className="py-1 lg:pl-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">Contact & Links</h2>
                <div className="mt-3 grid gap-3">
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-neutral-800">Contact email</span>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(event) => setContactEmail(event.target.value)}
                      className={`rounded-lg border px-3 py-2 outline-none transition ${fieldErrors.contactEmail ? "border-red-400" : "border-neutral-300 focus:border-cyan-500"}`}
                      placeholder="you@example.com"
                    />
                    {fieldErrors.contactEmail ? <span className="text-xs text-red-600">{fieldErrors.contactEmail}</span> : null}
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-neutral-800">Phone number</span>
                    <input
                      value={phoneNumber}
                      onChange={(event) => setPhoneNumber(event.target.value)}
                      className={`rounded-lg border px-3 py-2 outline-none transition ${fieldErrors.phoneNumber ? "border-red-400" : "border-neutral-300 focus:border-cyan-500"}`}
                      placeholder="+1 555 123 4567"
                    />
                    {fieldErrors.phoneNumber ? <span className="text-xs text-red-600">{fieldErrors.phoneNumber}</span> : null}
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-neutral-800">Website</span>
                    <input
                      value={websiteUrl}
                      onChange={(event) => setWebsiteUrl(event.target.value)}
                      className={`rounded-lg border px-3 py-2 outline-none transition ${fieldErrors.websiteUrl ? "border-red-400" : "border-neutral-300 focus:border-cyan-500"}`}
                      placeholder="your-site.com"
                    />
                    {fieldErrors.websiteUrl ? <span className="text-xs text-red-600">{fieldErrors.websiteUrl}</span> : <span className="text-xs text-neutral-500">Any valid website URL.</span>}
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-neutral-800">GitHub</span>
                    <input
                      value={githubUrl}
                      onChange={(event) => setGithubUrl(event.target.value)}
                      className={`rounded-lg border px-3 py-2 outline-none transition ${fieldErrors.githubUrl ? "border-red-400" : "border-neutral-300 focus:border-cyan-500"}`}
                      placeholder="github.com/username"
                    />
                    {fieldErrors.githubUrl ? <span className="text-xs text-red-600">{fieldErrors.githubUrl}</span> : <span className="text-xs text-neutral-500">Must be a github.com URL.</span>}
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-neutral-800">LinkedIn</span>
                    <input
                      value={linkedinUrl}
                      onChange={(event) => setLinkedinUrl(event.target.value)}
                      className={`rounded-lg border px-3 py-2 outline-none transition ${fieldErrors.linkedinUrl ? "border-red-400" : "border-neutral-300 focus:border-cyan-500"}`}
                      placeholder="linkedin.com/in/username"
                    />
                    {fieldErrors.linkedinUrl ? <span className="text-xs text-red-600">{fieldErrors.linkedinUrl}</span> : <span className="text-xs text-neutral-500">Must be a linkedin.com profile/company URL.</span>}
                  </label>
                </div>
              </section>
            </div>

            {error ? <p className="border-l-2 border-red-500 pl-3 text-sm font-medium text-red-700">{error}</p> : null}
            {success ? <p className="border-l-2 border-emerald-500 pl-3 text-sm font-medium text-emerald-700">{success}</p> : null}

            <div className="flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-60"
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
