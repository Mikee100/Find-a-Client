"use client";

import Link from "next/link";
import { DragEvent, FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ClientDashboardNavbar from "@/features/client/client-dashboard-navbar";
import {
  ProjectCategory,
  PricingType,
  createProject,
  publishProject,
  uploadMediaFile
} from "@/lib/api";

const CATEGORY_OPTIONS: Array<{ value: ProjectCategory; label: string }> = [
  { value: "WEB_APP", label: "Web App" },
  { value: "MOBILE_APP", label: "Mobile App" },
  { value: "API", label: "API" },
  { value: "DESKTOP", label: "Desktop" },
  { value: "AI_ML", label: "AI / ML" },
  { value: "ECOMMERCE", label: "Ecommerce" },
  { value: "MANAGEMENT_SYSTEM", label: "Management System" },
  { value: "OTHER", label: "Other" }
];

const PRICING_OPTIONS: Array<{ value: PricingType; label: string }> = [
  { value: "FIXED", label: "Fixed" },
  { value: "NEGOTIABLE", label: "Negotiable" },
  { value: "FREE", label: "Free" },
  { value: "CONTACT", label: "Contact me" }
];

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "CAD", "AUD", "NGN", "KES", "ZAR"];

function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function mergeCommaLists(existing: string, incoming: string[]): string {
  const merged = [...parseCommaList(existing), ...incoming];
  return [...new Set(merged)].join(", ");
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white/95 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] md:p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function UploadDropZone({
  label,
  accept,
  multiple,
  onFiles
}: {
  label: string;
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const [isActive, setIsActive] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsActive(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length > 0) {
      onFiles(files);
    }
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsActive(true);
      }}
      onDragLeave={() => setIsActive(false)}
      onDrop={handleDrop}
      className={`rounded-lg border border-dashed p-3 text-center text-xs transition ${
        isActive ? "border-cyan-500 bg-cyan-50 text-cyan-800" : "border-neutral-300 bg-white text-neutral-600"
      }`}
    >
      <p className="font-medium">{label}</p>
      <p className="mt-1">Drag files here or choose from device</p>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(event) => {
          const files = event.target.files ? Array.from(event.target.files) : [];
          if (files.length > 0) {
            onFiles(files);
          }
          event.target.value = "";
        }}
        className="mt-2 text-xs"
      />
    </div>
  );
}

type FieldName =
  | "title"
  | "shortDescription"
  | "longDescription"
  | "coreProblem"
  | "targetUsers"
  | "mustHaveFeatures"
  | "deliverables"
  | "timelineWeeks"
  | "techStackInput"
  | "industriesInput"
  | "priceInput";

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboardingFlow = searchParams.get("onboarding") === "1";

  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [category, setCategory] = useState<ProjectCategory>("WEB_APP");
  const [techStackInput, setTechStackInput] = useState("");
  const [industriesInput, setIndustriesInput] = useState("");
  const [pricingType, setPricingType] = useState<PricingType>("NEGOTIABLE");
  const [priceInput, setPriceInput] = useState("");
  const [currency, setCurrency] = useState("USD");

  const [coreProblem, setCoreProblem] = useState("");
  const [targetUsers, setTargetUsers] = useState("");
  const [successMetrics, setSuccessMetrics] = useState("");
  const [mustHaveFeatures, setMustHaveFeatures] = useState("");
  const [niceToHaveFeatures, setNiceToHaveFeatures] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [timelineWeeks, setTimelineWeeks] = useState("");
  const [milestones, setMilestones] = useState("");
  const [timezone, setTimezone] = useState("");
  const [communicationCadence, setCommunicationCadence] = useState("");
  const [qualityBar, setQualityBar] = useState("");
  const [integrationNeeds, setIntegrationNeeds] = useState("");
  const [securityRequirements, setSecurityRequirements] = useState("");

  const [demoUrl, setDemoUrl] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [screenshotsInput, setScreenshotsInput] = useState("");
  const [referenceLinks, setReferenceLinks] = useState("");
  const [existingProductUrl, setExistingProductUrl] = useState("");

  const [ndaRequired, setNdaRequired] = useState(false);
  const [ipTransferRequired, setIpTransferRequired] = useState(true);
  const [postLaunchSupport, setPostLaunchSupport] = useState("2 weeks");
  const [publishNow, setPublishNow] = useState(false);

  const [pending, setPending] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});

  const needsPrice = useMemo(() => pricingType === "FIXED", [pricingType]);

  function markTouched(field: FieldName) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function getFieldError(field: FieldName): string | null {
    switch (field) {
      case "title":
        return title.trim().length < 3 ? "Project title must be at least 3 characters." : null;
      case "shortDescription":
        return shortDescription.trim().length < 20
          ? "Short description should be at least 20 characters for better quality."
          : null;
      case "longDescription":
        return longDescription.trim().length < 30 ? "Project overview must be at least 30 characters." : null;
      case "coreProblem":
        return coreProblem.trim().length === 0 ? "Tell developers the core problem this project solves." : null;
      case "targetUsers":
        return targetUsers.trim().length === 0 ? "Specify who the target users are." : null;
      case "mustHaveFeatures":
        return mustHaveFeatures.trim().length === 0 ? "List must-have features." : null;
      case "deliverables":
        return deliverables.trim().length === 0 ? "List at least one expected deliverable." : null;
      case "timelineWeeks":
        return timelineWeeks.trim().length === 0 ? "Set an expected timeline." : null;
      case "techStackInput":
        return parseCommaList(techStackInput).length === 0 ? "Add at least one tech stack value." : null;
      case "industriesInput":
        return parseCommaList(industriesInput).length === 0 ? "Add at least one industry tag." : null;
      case "priceInput": {
        if (!needsPrice) {
          return null;
        }
        const parsedPrice = Number(priceInput);
        return Number.isFinite(parsedPrice) && parsedPrice > 0 ? null : "Enter a valid fixed price greater than 0.";
      }
      default:
        return null;
    }
  }

  function showFieldError(field: FieldName): string | null {
    return touched[field] ? getFieldError(field) : null;
  }

  const completionPercent = useMemo(() => {
    const checkpoints = [
      title.trim().length >= 3,
      shortDescription.trim().length >= 20,
      longDescription.trim().length >= 30,
      coreProblem.trim().length > 0,
      targetUsers.trim().length > 0,
      mustHaveFeatures.trim().length > 0,
      deliverables.trim().length > 0,
      timelineWeeks.trim().length > 0,
      parseCommaList(techStackInput).length > 0,
      parseCommaList(industriesInput).length > 0
    ];

    const completed = checkpoints.filter(Boolean).length;
    return Math.round((completed / checkpoints.length) * 100);
  }, [
    title,
    shortDescription,
    longDescription,
    coreProblem,
    targetUsers,
    mustHaveFeatures,
    deliverables,
    timelineWeeks,
    techStackInput,
    industriesInput
  ]);

  function buildComposedBrief(baseBrief: string): string {
    const lines: string[] = [baseBrief.trim()];

    const details: Array<[string, string]> = [
      ["Core Problem", coreProblem],
      ["Target Users", targetUsers],
      ["Success Metrics", successMetrics],
      ["Must-Have Features", mustHaveFeatures],
      ["Nice-to-Have Features", niceToHaveFeatures],
      ["Deliverables", deliverables],
      ["Timeline (Weeks)", timelineWeeks],
      ["Milestones", milestones],
      ["Timezone", timezone],
      ["Communication Cadence", communicationCadence],
      ["Quality Bar", qualityBar],
      ["Integration Needs", integrationNeeds],
      ["Security Requirements", securityRequirements],
      ["Existing Product URL", existingProductUrl],
      ["Reference Links", referenceLinks],
      ["NDA Required", ndaRequired ? "Yes" : "No"],
      ["IP Transfer Required", ipTransferRequired ? "Yes" : "No"],
      ["Post Launch Support", postLaunchSupport]
    ];

    const filled = details.filter(([, value]) => value.trim().length > 0);

    if (filled.length > 0) {
      lines.push("", "Project Intake Details");
      for (const [label, value] of filled) {
        lines.push(`${label}: ${value.trim()}`);
      }
    }

    return lines.join("\n");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const techStack = parseCommaList(techStackInput);
      const industries = parseCommaList(industriesInput);

      const requiredFields: FieldName[] = [
        "title",
        "shortDescription",
        "longDescription",
        "coreProblem",
        "targetUsers",
        "mustHaveFeatures",
        "deliverables",
        "timelineWeeks",
        "techStackInput",
        "industriesInput",
        ...(needsPrice ? (["priceInput"] as const) : [])
      ];

      setTouched((prev) => ({
        ...prev,
        ...Object.fromEntries(requiredFields.map((field) => [field, true]))
      }));

      for (const field of requiredFields) {
        const inlineError = getFieldError(field);
        if (inlineError) {
          throw new Error(inlineError);
        }
      }

      let price: number | undefined;
      if (needsPrice) {
        const parsedPrice = Number(priceInput);
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
          throw new Error("Enter a valid fixed price greater than 0.");
        }
        price = parsedPrice;
      }

      const composedBrief = buildComposedBrief(longDescription);
      if (composedBrief.length > 5000) {
        throw new Error("Project details are too long. Shorten some sections to stay under 5000 characters.");
      }

      const created = await createProject({
        title: title.trim(),
        shortDescription: shortDescription.trim(),
        longDescription: composedBrief,
        category,
        techStack,
        industries,
        pricingType,
        price,
        currency: needsPrice ? currency.trim().toUpperCase() : undefined,
        demoUrl: demoUrl.trim() || undefined,
        backgroundUrl: backgroundUrl.trim() || undefined,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        screenshots: parseCommaList(screenshotsInput)
      });

      if (publishNow) {
        await publishProject(created.slug);
      }

      setSuccess(`Project created${publishNow ? " and published" : ""} successfully.`);
      setTimeout(() => {
        router.push(`/projects/${created.slug}`);
      }, 900);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to create project.";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  async function uploadThumbnailFile(file: File) {
    if (!file) {
      return;
    }

    setMediaUploading(true);
    setError(null);

    try {
      const upload = await uploadMediaFile(file, { mediaType: "THUMBNAIL" });
      setThumbnailUrl(upload.url);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Failed to upload thumbnail.";
      setError(message);
    } finally {
      setMediaUploading(false);
    }
  }

  async function uploadBackgroundFile(file: File) {
    if (!file) {
      return;
    }

    setMediaUploading(true);
    setError(null);

    try {
      const upload = await uploadMediaFile(file, { mediaType: "IMAGE" });
      setBackgroundUrl(upload.url);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Failed to upload background image.";
      setError(message);
    } finally {
      setMediaUploading(false);
    }
  }

  async function uploadScreenshotFiles(files: File[]) {
    if (files.length === 0) {
      return;
    }

    setMediaUploading(true);
    setError(null);

    try {
      const uploads = await Promise.all(files.map((file) => uploadMediaFile(file, { mediaType: "SCREENSHOT" })));
      setScreenshotsInput((prev) => mergeCommaLists(prev, uploads.map((item) => item.url)));
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Failed to upload screenshot files.";
      setError(message);
    } finally {
      setMediaUploading(false);
    }
  }

  async function uploadVideoFile(file: File) {
    if (!file) {
      return;
    }

    setMediaUploading(true);
    setError(null);

    try {
      const upload = await uploadMediaFile(file, { mediaType: "VIDEO" });
      setVideoUrl(upload.url);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Failed to upload video.";
      setError(message);
    } finally {
      setMediaUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbf4ff_0%,#f8fafc_45%,#f1f5f9_100%)]">
      <ClientDashboardNavbar />

      <section className="mx-auto w-full max-w-7xl p-4 md:p-6">
        {isOnboardingFlow ? (
          <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
            Welcome to client onboarding. Publish your first project brief to start receiving developer proposals.
          </div>
        ) : null}

        <div className="mb-4 overflow-hidden rounded-2xl border border-cyan-100 bg-linear-to-r from-slate-900 via-cyan-900 to-teal-700 p-5 text-white shadow-[0_20px_50px_rgba(15,23,42,0.25)] md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Detailed project intake</p>
              <h1 className="mt-1 text-2xl font-semibold md:text-3xl">Create A High-Quality Project Brief</h1>
              <p className="mt-2 max-w-3xl text-sm text-cyan-50">
                This form is intentionally detailed so developers can estimate accurately, deliver faster, and avoid scope confusion.
              </p>
            </div>
            <Link href="/client/dashboard" className="rounded-full border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20">
              Back to dashboard
            </Link>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="h-2 rounded-full bg-white/20">
                <div
                  className="h-2 rounded-full bg-cyan-300 transition-all"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-cyan-100">Form completeness: {completionPercent}%</p>
            </div>
            <div className="rounded-full border border-white/35 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-50">
              Better briefs get better proposals
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <SectionCard
            title="1. Project Snapshot"
            subtitle="Define what this project is, who it is for, and how you want pricing handled."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-neutral-800">Project title</span>
                <input
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onBlur={() => markTouched("title")}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                  placeholder="Client portal and internal ops dashboard"
                />
                {showFieldError("title") ? <span className="text-xs font-medium text-red-600">{showFieldError("title")}</span> : null}
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-neutral-800">Category</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as ProjectCategory)}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-neutral-800">Short public summary</span>
              <input
                required
                value={shortDescription}
                onChange={(event) => setShortDescription(event.target.value)}
                onBlur={() => markTouched("shortDescription")}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                placeholder="One clear sentence developers see first"
              />
              {showFieldError("shortDescription") ? <span className="text-xs font-medium text-red-600">{showFieldError("shortDescription")}</span> : null}
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-neutral-800">Pricing model</span>
                <select
                  value={pricingType}
                  onChange={(event) => setPricingType(event.target.value as PricingType)}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                >
                  {PRICING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-neutral-800">Expected timeline (weeks)</span>
                <input
                  required
                  value={timelineWeeks}
                  onChange={(event) => setTimelineWeeks(event.target.value)}
                  onBlur={() => markTouched("timelineWeeks")}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                  placeholder="6 to 10 weeks"
                />
                {showFieldError("timelineWeeks") ? <span className="text-xs font-medium text-red-600">{showFieldError("timelineWeeks")}</span> : null}
              </label>
            </div>

            {needsPrice ? (
              <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-neutral-800">Fixed budget</span>
                  <input
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    value={priceInput}
                    onChange={(event) => setPriceInput(event.target.value)}
                    onBlur={() => markTouched("priceInput")}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                    placeholder="2500"
                  />
                  {showFieldError("priceInput") ? <span className="text-xs font-medium text-red-600">{showFieldError("priceInput")}</span> : null}
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-neutral-800">Currency</span>
                  <select
                    required
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value)}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                  >
                    {CURRENCY_OPTIONS.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            title="2. Scope and Outcomes"
            subtitle="Capture business context so developers understand what to build and why."
          >
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-neutral-800">Project overview</span>
              <textarea
                required
                value={longDescription}
                onChange={(event) => setLongDescription(event.target.value)}
                onBlur={() => markTouched("longDescription")}
                className="min-h-28 rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                placeholder="Describe the project, goals, and business outcome in detail"
              />
              {showFieldError("longDescription") ? <span className="text-xs font-medium text-red-600">{showFieldError("longDescription")}</span> : null}
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-neutral-800">Core problem to solve</span>
                <textarea
                  required
                  value={coreProblem}
                  onChange={(event) => setCoreProblem(event.target.value)}
                  onBlur={() => markTouched("coreProblem")}
                  className="min-h-24 rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                  placeholder="What pain point is this project fixing?"
                />
                {showFieldError("coreProblem") ? <span className="text-xs font-medium text-red-600">{showFieldError("coreProblem")}</span> : null}
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-neutral-800">Target users</span>
                <textarea
                  required
                  value={targetUsers}
                  onChange={(event) => setTargetUsers(event.target.value)}
                  onBlur={() => markTouched("targetUsers")}
                  className="min-h-24 rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                  placeholder="Who will use this and how often?"
                />
                {showFieldError("targetUsers") ? <span className="text-xs font-medium text-red-600">{showFieldError("targetUsers")}</span> : null}
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-neutral-800">Must-have features</span>
                <textarea
                  required
                  value={mustHaveFeatures}
                  onChange={(event) => setMustHaveFeatures(event.target.value)}
                  onBlur={() => markTouched("mustHaveFeatures")}
                  className="min-h-28 rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                  placeholder="List key features that must be included"
                />
                {showFieldError("mustHaveFeatures") ? <span className="text-xs font-medium text-red-600">{showFieldError("mustHaveFeatures")}</span> : null}
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-neutral-800">Nice-to-have features</span>
                <textarea
                  value={niceToHaveFeatures}
                  onChange={(event) => setNiceToHaveFeatures(event.target.value)}
                  className="min-h-28 rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                  placeholder="Future enhancements or optional features"
                />
              </label>
            </div>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-neutral-800">Success metrics</span>
              <textarea
                value={successMetrics}
                onChange={(event) => setSuccessMetrics(event.target.value)}
                className="min-h-20 rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                placeholder="How will you measure project success?"
              />
            </label>
          </SectionCard>

          <SectionCard
            title="3. Delivery Plan"
            subtitle="Set expectations for milestones, outputs, and collaboration rhythm."
          >
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-neutral-800">Expected deliverables</span>
              <textarea
                required
                value={deliverables}
                onChange={(event) => setDeliverables(event.target.value)}
                onBlur={() => markTouched("deliverables")}
                className="min-h-24 rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                placeholder="Examples: source code, deployment guide, admin docs, test coverage"
              />
              {showFieldError("deliverables") ? <span className="text-xs font-medium text-red-600">{showFieldError("deliverables")}</span> : null}
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-neutral-800">Milestones and checkpoints</span>
              <textarea
                value={milestones}
                onChange={(event) => setMilestones(event.target.value)}
                className="min-h-24 rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                placeholder="Week 2 prototype, week 4 core features, week 6 QA"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-neutral-800">Timezone or overlap window</span>
                <input
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                  placeholder="GMT+1 with 2h overlap"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-neutral-800">Communication cadence</span>
                <input
                  value={communicationCadence}
                  onChange={(event) => setCommunicationCadence(event.target.value)}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                  placeholder="Daily async updates + weekly call"
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard
            title="4. Technical Requirements"
            subtitle="Add stack constraints and technical quality requirements."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-neutral-800">Tech stack (comma-separated)</span>
                <input
                  required
                  value={techStackInput}
                  onChange={(event) => setTechStackInput(event.target.value)}
                  onBlur={() => markTouched("techStackInput")}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                  placeholder="Next.js, NestJS, PostgreSQL"
                />
                {showFieldError("techStackInput") ? <span className="text-xs font-medium text-red-600">{showFieldError("techStackInput")}</span> : null}
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-neutral-800">Industry tags (comma-separated)</span>
                <input
                  required
                  value={industriesInput}
                  onChange={(event) => setIndustriesInput(event.target.value)}
                  onBlur={() => markTouched("industriesInput")}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                  placeholder="Healthcare, Fintech"
                />
                {showFieldError("industriesInput") ? <span className="text-xs font-medium text-red-600">{showFieldError("industriesInput")}</span> : null}
              </label>
            </div>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-neutral-800">Integration needs</span>
              <textarea
                value={integrationNeeds}
                onChange={(event) => setIntegrationNeeds(event.target.value)}
                className="min-h-20 rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                placeholder="Stripe, Twilio, Salesforce, internal APIs"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-neutral-800">Security requirements</span>
                <textarea
                  value={securityRequirements}
                  onChange={(event) => setSecurityRequirements(event.target.value)}
                  className="min-h-20 rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                  placeholder="2FA, RBAC, audit logging, secure sessions"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-neutral-800">Quality bar</span>
                <textarea
                  value={qualityBar}
                  onChange={(event) => setQualityBar(event.target.value)}
                  className="min-h-20 rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                  placeholder="Testing expectations, linting, CI checks"
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard
            title="5. Assets, Legal, and Publishing"
            subtitle="Provide references and launch preferences so proposals are aligned."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-neutral-800">Existing product URL</span>
                <input
                  type="url"
                  value={existingProductUrl}
                  onChange={(event) => setExistingProductUrl(event.target.value)}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                  placeholder="https://app.example.com"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-neutral-800">Reference links (comma-separated)</span>
                <input
                  value={referenceLinks}
                  onChange={(event) => setReferenceLinks(event.target.value)}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                  placeholder="https://site-a.com, https://site-b.com"
                />
              </label>
            </div>

            <section className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 md:p-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-neutral-900">Visual Assets</h3>
                <p className="mt-0.5 text-xs text-neutral-600">Upload media to Cloudinary or paste direct URLs.</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-neutral-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Background Image</p>
                  <input
                    type="url"
                    value={backgroundUrl}
                    onChange={(event) => setBackgroundUrl(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                    placeholder="https://example.com/background.jpg"
                  />
                  <div className="mt-2">
                    <UploadDropZone
                      label="Upload background image"
                      accept="image/png,image/jpeg,image/webp"
                      onFiles={(files) => {
                        if (files[0]) {
                          void uploadBackgroundFile(files[0]);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Thumbnail</p>
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(event) => setThumbnailUrl(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                    placeholder="https://example.com/thumb.jpg"
                  />
                  <div className="mt-2">
                    <UploadDropZone
                      label="Upload thumbnail"
                      accept="image/png,image/jpeg,image/webp"
                      onFiles={(files) => {
                        if (files[0]) {
                          void uploadThumbnailFile(files[0]);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-200 bg-white p-3 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Screenshots</p>
                  <textarea
                    value={screenshotsInput}
                    onChange={(event) => setScreenshotsInput(event.target.value)}
                    className="mt-2 min-h-20 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                    placeholder="https://example.com/screen-1.png, https://example.com/screen-2.png"
                  />
                  <div className="mt-2">
                    <UploadDropZone
                      label="Upload one or more screenshots"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      onFiles={(files) => {
                        void uploadScreenshotFiles(files);
                      }}
                    />
                  </div>
                  {parseCommaList(screenshotsInput).length > 0 ? (
                    <p className="mt-2 text-xs text-neutral-600">{parseCommaList(screenshotsInput).length} screenshot URLs added</p>
                  ) : null}
                </div>

                <div className="rounded-lg border border-neutral-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Demo URL</p>
                  <input
                    type="url"
                    value={demoUrl}
                    onChange={(event) => setDemoUrl(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                    placeholder="https://example.com/demo"
                  />
                </div>

                <div className="rounded-lg border border-neutral-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Video</p>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(event) => setVideoUrl(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                  <div className="mt-2">
                    <UploadDropZone
                      label="Upload MP4 video"
                      accept="video/mp4"
                      onFiles={(files) => {
                        if (files[0]) {
                          void uploadVideoFile(files[0]);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {mediaUploading ? <p className="text-xs font-medium text-neutral-600">Uploading media to Cloudinary...</p> : null}

            <div className="grid gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm">
              <label className="flex items-center gap-2 text-neutral-700">
                <input
                  type="checkbox"
                  checked={ndaRequired}
                  onChange={(event) => setNdaRequired(event.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                NDA required for selected developer
              </label>

              <label className="flex items-center gap-2 text-neutral-700">
                <input
                  type="checkbox"
                  checked={ipTransferRequired}
                  onChange={(event) => setIpTransferRequired(event.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                Full IP transfer expected at handover
              </label>

              <label className="grid gap-1 md:max-w-xs">
                <span className="font-medium text-neutral-800">Post-launch support</span>
                <select
                  value={postLaunchSupport}
                  onChange={(event) => setPostLaunchSupport(event.target.value)}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-500"
                >
                  <option>None</option>
                  <option>1 week</option>
                  <option>2 weeks</option>
                  <option>1 month</option>
                  <option>3 months</option>
                </select>
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              <input
                type="checkbox"
                checked={publishNow}
                onChange={(event) => setPublishNow(event.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
              />
              Publish immediately after creation
            </label>
          </SectionCard>

          {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
          {success ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{success}</p> : null}

          <div className="sticky bottom-3 z-10 rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-[0_12px_28px_rgba(15,23,42,0.1)] backdrop-blur md:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-neutral-600">
                Your detailed sections are merged into the final project brief developers will read.
              </p>
              <div className="flex items-center gap-2">
                <Link href="/client/dashboard" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100">
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? "Creating project..." : "Create project"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
