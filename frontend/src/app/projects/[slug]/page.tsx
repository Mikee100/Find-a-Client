"use client";

import Image from "next/image";
import Link from "next/link";
import { DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import MarketplaceNavbar from "@/features/shared/marketplace-navbar";
import { getAuthSession, getProjectBySlug, ProjectCategory, ProjectDetail, PricingType, updateProject, uploadMediaFile } from "@/lib/api";
import FullPageLoader from "@/components/ui/full-page-loader";
import BackButton from "@/components/ui/back-button";

const CATEGORY_OPTIONS: ProjectCategory[] = [
  "WEB_APP",
  "MOBILE_APP",
  "API",
  "DESKTOP",
  "AI_ML",

  "ECOMMERCE",
  "MANAGEMENT_SYSTEM",
  "OTHER"
];

const PRICING_OPTIONS: PricingType[] = ["FIXED", "NEGOTIABLE", "FREE", "CONTACT"];

const STATUS_OPTIONS: Array<ProjectDetail["status"]> = ["DRAFT", "PUBLISHED", "ARCHIVED"];

function formatMoney(price: number | string | null, currency: string, pricingType: ProjectDetail["pricingType"]): string {
  if (pricingType === "FREE") {
    return "Free";
  }
  if (pricingType === "CONTACT") {
    return "Contact";
  }
  if (pricingType === "NEGOTIABLE") {
    return "Negotiable";
  }

  if (price === null || price === undefined) {
    return "Fixed";
  }

  const numericPrice = typeof price === "string" ? Number(price) : price;
  if (!Number.isFinite(numericPrice)) {
    return `Fixed (${currency})`;
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency
  }).format(numericPrice);
}

function looksLikeVideoUrl(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.toLowerCase();
  return (
    normalized.includes("/video/") ||
    normalized.endsWith(".mp4") ||
    normalized.endsWith(".webm") ||
    normalized.endsWith(".mov") ||
    normalized.includes(".mp4?") ||
    normalized.includes(".webm?") ||
    normalized.includes(".mov?")
  );
}

function friendlyLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function parseIntakeDetails(longDescription: string): {
  narrative: string;
  details: Array<{ label: string; value: string }>;
} {
  const marker = "Project Intake Details";
  const markerIndex = longDescription.indexOf(marker);

  if (markerIndex < 0) {
    return {
      narrative: longDescription.trim(),
      details: []
    };
  }

  const narrative = longDescription.slice(0, markerIndex).trim();
  const detailBlock = longDescription.slice(markerIndex + marker.length).trim();

  const details = detailBlock
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(":");
      if (separator < 0) {
        return null;
      }

      const label = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim();

      if (!label || !value) {
        return null;
      }

      return { label, value };
    })
    .filter((entry): entry is { label: string; value: string } => entry !== null);

  return { narrative, details };
}

function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function mergeCommaLists(existing: string, incoming: string[]): string {
  const merged = [...parseCommaList(existing), ...incoming];
  return [...new Set(merged)].join(", ");
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function normalizeList(value: string): string {
  return parseCommaList(value)
    .map((item) => item.toLowerCase())
    .sort((a, b) => a.localeCompare(b))
    .join("|");
}

function normalizeStringArray(value: string[]): string {
  return [...value]
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .join("|");
}

function toNullableUrl(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function UploadDropZone({
  label,
  accept,
  multiple,
  onFiles,
  currentUrl
}: {
  label: string;
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  currentUrl?: string;
}) {
  const [isActive, setIsActive] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = (files: File[]): void => {
    if (files.length === 0) {
      return;
    }

    setSelectedSummary(
      files.length === 1
        ? files[0].name
        : `${files.length} files selected (${files
            .slice(0, 2)
            .map((file) => file.name)
            .join(", ")}${files.length > 2 ? ", ..." : ""})`
    );
    onFiles(files);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsActive(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    handleFiles(files);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsActive(true);
      }}
      onDragLeave={() => setIsActive(false)}
      onDrop={handleDrop}
      className={`rounded-xl border border-dashed p-3 text-xs transition ${
        isActive ? "border-cyan-500 bg-cyan-50 text-cyan-900" : "border-neutral-300 bg-white text-neutral-700"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-neutral-800">{label}</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900"
        >
          Choose {multiple ? "files" : "file"}
        </button>
      </div>

      <p className="mt-1 text-[11px] text-neutral-500">Drag and drop here, or use the button to browse your device.</p>

      {selectedSummary ? <p className="mt-2 text-[11px] font-medium text-cyan-800">Selected: {selectedSummary}</p> : null}
      {!selectedSummary && currentUrl ? (
        <a href={currentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] font-medium text-cyan-700 hover:underline">
          View currently linked file
        </a>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(event) => {
          const files = event.target.files ? Array.from(event.target.files) : [];
          handleFiles(files);
          event.target.value = "";
        }}
        className="hidden"
      />
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params.slug ?? "";
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requirementsQuery, setRequirementsQuery] = useState("");
  const [showFullOverview, setShowFullOverview] = useState(false);
  const [copiedState, setCopiedState] = useState<"none" | "url" | "summary">("none");
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const hasHandledEditDeepLinkRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [videoDeleting, setVideoDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editShortDescription, setEditShortDescription] = useState("");
  const [editLongDescription, setEditLongDescription] = useState("");
  const [editCategory, setEditCategory] = useState<ProjectCategory>("WEB_APP");
  const [editStatus, setEditStatus] = useState<ProjectDetail["status"]>("DRAFT");
  const [editPricingType, setEditPricingType] = useState<PricingType>("FIXED");
  const [editPrice, setEditPrice] = useState("");
  const [editCurrency, setEditCurrency] = useState("USD");
  const [editTechStack, setEditTechStack] = useState("");
  const [editIndustries, setEditIndustries] = useState("");
  const [editDemoUrl, setEditDemoUrl] = useState("");
  const [editBackgroundUrl, setEditBackgroundUrl] = useState("");
  const [editThumbnailUrl, setEditThumbnailUrl] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editScreenshots, setEditScreenshots] = useState("");

  const initializeEditForm = (item: ProjectDetail): void => {
    setEditTitle(item.title);
    setEditShortDescription(item.shortDescription);
    setEditLongDescription(item.longDescription);
    setEditCategory(item.category);
    setEditStatus(item.status);
    setEditPricingType(item.pricingType);
    setEditPrice(item.price === null || item.price === undefined ? "" : String(item.price));
    setEditCurrency(item.currency || "USD");
    setEditTechStack(item.techStack.join(", "));
    setEditIndustries(item.industries.join(", "));
    setEditDemoUrl(item.demoUrl ?? "");
    setEditBackgroundUrl(item.backgroundUrl ?? "");
    setEditThumbnailUrl(item.thumbnailUrl ?? "");
    setEditVideoUrl(item.videoUrl ?? "");
    setEditScreenshots(
      [...(item.media ?? [])]
        .filter((media) => media.type === "SCREENSHOT" || media.type === "IMAGE")
        .sort((left, right) => left.order - right.order)
        .map((media) => media.url)
        .join(", ")
    );
  };

  useEffect(() => {
    if (!slug) {
      return;
    }

    let isActive = true;

    void (async () => {
      try {
        const item = await getProjectBySlug(slug);
        if (!isActive) {
          return;
        }
        setProject(item);
        setError(null);
      } catch (loadError) {
        if (!isActive) {
          return;
        }
        const message = loadError instanceof Error ? loadError.message : "Failed to load project.";
        setError(message);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [slug]);

  useEffect(() => {
    void (async () => {
      try {
        const auth = await getAuthSession();
        setViewerId(auth.sub);
      } catch {
        setViewerId(null);
      } finally {
        setAuthResolved(true);
      }
    })();
  }, []);

  const parsed = useMemo(() => parseIntakeDetails(project?.longDescription ?? ""), [project?.longDescription]);
  const filteredDetails = useMemo(() => {
    const normalizedQuery = requirementsQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return parsed.details;
    }

    return parsed.details.filter((item) => {
      return item.label.toLowerCase().includes(normalizedQuery) || item.value.toLowerCase().includes(normalizedQuery);
    });
  }, [parsed.details, requirementsQuery]);

  const overviewText = parsed.narrative.trim();
  const hasLongOverview = overviewText.length > 540;
  const visibleOverview = hasLongOverview && !showFullOverview ? `${overviewText.slice(0, 540).trimEnd()}...` : overviewText;
  const isAuthenticated = Boolean(viewerId);
  const canEdit = Boolean(project && viewerId && project.author.id === viewerId);
  const editQuery = (searchParams.get("edit") ?? "").trim().toLowerCase();
  const hasEditQuery = editQuery === "1" || editQuery === "true" || editQuery === "yes";

  useEffect(() => {
    if (!hasEditQuery || hasHandledEditDeepLinkRef.current || !project || !authResolved) {
      return;
    }

    hasHandledEditDeepLinkRef.current = true;

    if (!canEdit) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      initializeEditForm(project);
      setIsEditing(true);
      setSaveError(null);
      setSaveSuccess(null);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [authResolved, canEdit, hasEditQuery, project]);

  const editDiff = useMemo(() => {
    if (!project) {
      return {
        title: false,
        shortDescription: false,
        longDescription: false,
        category: false,
        status: false,
        pricingType: false,
        price: false,
        currency: false,
        techStack: false,
        industries: false,
        demoUrl: false,
        backgroundUrl: false,
        thumbnailUrl: false,
        videoUrl: false,
        screenshots: false
      };
    }

    const currentScreenshots = normalizeStringArray(
      [...(project.media ?? [])]
        .filter((item) => item.type === "SCREENSHOT" || item.type === "IMAGE")
        .sort((left, right) => left.order - right.order)
        .map((item) => item.url)
    );

    return {
      title: normalizeText(editTitle) !== normalizeText(project.title),
      shortDescription: normalizeText(editShortDescription) !== normalizeText(project.shortDescription),
      longDescription: normalizeText(editLongDescription) !== normalizeText(project.longDescription),
      category: editCategory !== project.category,
      status: editStatus !== project.status,
      pricingType: editPricingType !== project.pricingType,
      price:
        normalizeText(editPrice) !==
        normalizeText(project.price === null || project.price === undefined ? "" : String(project.price)),
      currency: normalizeText(editCurrency).toUpperCase() !== normalizeText(project.currency).toUpperCase(),
      techStack: normalizeList(editTechStack) !== normalizeStringArray(project.techStack),
      industries: normalizeList(editIndustries) !== normalizeStringArray(project.industries),
      demoUrl: normalizeText(editDemoUrl) !== normalizeText(project.demoUrl),
      backgroundUrl: normalizeText(editBackgroundUrl) !== normalizeText(project.backgroundUrl),
      thumbnailUrl: normalizeText(editThumbnailUrl) !== normalizeText(project.thumbnailUrl),
      videoUrl: normalizeText(editVideoUrl) !== normalizeText(project.videoUrl),
      screenshots: normalizeList(editScreenshots) !== currentScreenshots
    };
  }, [
    editBackgroundUrl,
    editCategory,
    editCurrency,
    editDemoUrl,
    editIndustries,
    editLongDescription,
    editPrice,
    editPricingType,
    editScreenshots,
    editShortDescription,
    editStatus,
    editTechStack,
    editThumbnailUrl,
    editTitle,
    editVideoUrl,
    project
  ]);
  const changedFieldLabels = useMemo(
    () =>
      Object.entries(editDiff)
        .filter(([, changed]) => changed)
        .map(([field]) => friendlyLabel(field)),
    [editDiff]
  );
  const screenshotItems = useMemo(() => parseCommaList(editScreenshots), [editScreenshots]);
  const inputClass = (changed: boolean): string =>
    `mt-1 block w-full border px-2.5 text-sm outline-none transition focus:border-neutral-900 ${
      changed ? "border-cyan-400 bg-cyan-50/40" : "border-neutral-300 bg-white"
    }`;

  const removeScreenshotAt = (index: number): void => {
    const next = screenshotItems.filter((_, itemIndex) => itemIndex !== index);
    setEditScreenshots(next.join(", "));
  };
  const galleryImages = useMemo(() => {
    if (!project) {
      return [] as string[];
    }

    const screenshotUrls = [...(project.media ?? [])]
      .filter((item) => item.type === "SCREENSHOT" || item.type === "IMAGE")
      .sort((left, right) => left.order - right.order)
      .map((item) => item.url);

    const merged = [
      ...(project.backgroundUrl ? [project.backgroundUrl] : []),
      ...(project.thumbnailUrl ? [project.thumbnailUrl] : []),
      ...screenshotUrls
    ];
    return [...new Set(merged.filter(Boolean))];
  }, [project]);

  const projectVideoUrls = useMemo(() => {
    if (!project) {
      return [] as string[];
    }

    const mediaVideos = [...(project.media ?? [])]
      .filter((item) => item.type === "VIDEO" || looksLikeVideoUrl(item.url))
      .sort((left, right) => left.order - right.order)
      .map((item) => item.url);

    const candidateUrls = [
      ...(project.videoUrl ? [project.videoUrl] : []),
      ...mediaVideos,
      ...(looksLikeVideoUrl(project.demoUrl) ? [project.demoUrl] : [])
    ].filter((url): url is string => Boolean(url));

    return candidateUrls.filter((url, index, array) => array.indexOf(url) === index);
  }, [project]);
  const projectVideoUrl = projectVideoUrls[0] ?? null;

  const copyProjectUrl = async (): Promise<void> => {
    if (typeof window === "undefined" || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(window.location.href);
    setCopiedState("url");
    window.setTimeout(() => setCopiedState("none"), 1500);
  };

  const copySummary = async (): Promise<void> => {
    if (!project || typeof window === "undefined" || !navigator.clipboard) {
      return;
    }

    const summary = [
      `Project: ${project.title}`,
      `Price: ${formatMoney(project.price, project.currency, project.pricingType)}`,
      `Category: ${friendlyLabel(project.category)}`,
      `Status: ${friendlyLabel(project.status)}`,
      "",
      project.shortDescription
    ].join("\n");

    await navigator.clipboard.writeText(summary);
    setCopiedState("summary");
    window.setTimeout(() => setCopiedState("none"), 1500);
  };

  const handleSaveUpdate = async (): Promise<void> => {
    if (!project) {
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    const normalizedPricingType = editPricingType;
    const parsedPrice = Number(editPrice);
    const shouldSendPrice = normalizedPricingType === "FIXED" && Number.isFinite(parsedPrice);

    try {
      await updateProject(project.slug, {
        title: editTitle.trim(),
        shortDescription: editShortDescription.trim(),
        longDescription: editLongDescription.trim(),
        category: editCategory,
        status: editStatus,
        pricingType: normalizedPricingType,
        ...(shouldSendPrice ? { price: parsedPrice } : {}),
        currency: editCurrency.trim().toUpperCase(),
        techStack: parseCommaList(editTechStack),
        industries: parseCommaList(editIndustries),
        demoUrl: toNullableUrl(editDemoUrl),
        backgroundUrl: toNullableUrl(editBackgroundUrl),
        thumbnailUrl: toNullableUrl(editThumbnailUrl),
        videoUrl: toNullableUrl(editVideoUrl),
        screenshots: parseCommaList(editScreenshots)
      });

      const refreshed = await getProjectBySlug(project.slug);
      setProject(refreshed);
      setIsEditing(false);
      setSaveSuccess("Project updated.");
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : "Failed to update project.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  async function uploadThumbnailFile(file: File) {
    if (!file || !project) {
      return;
    }

    setMediaUploading(true);
    setSaveError(null);

    try {
      const upload = await uploadMediaFile(file, { mediaType: "THUMBNAIL", projectId: project.id });
      setEditThumbnailUrl(upload.url);
      const refreshed = await getProjectBySlug(project.slug);
      setProject(refreshed);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Failed to upload thumbnail.";
      setSaveError(message);
    } finally {
      setMediaUploading(false);
    }
  }

  async function uploadBackgroundFile(file: File) {
    if (!file || !project) {
      return;
    }

    setMediaUploading(true);
    setSaveError(null);

    try {
      const upload = await uploadMediaFile(file, { mediaType: "IMAGE", projectId: project.id });
      setEditBackgroundUrl(upload.url);
      const refreshed = await getProjectBySlug(project.slug);
      setProject(refreshed);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Failed to upload background image.";
      setSaveError(message);
    } finally {
      setMediaUploading(false);
    }
  }

  async function uploadScreenshotFiles(files: File[]) {
    if (files.length === 0 || !project) {
      return;
    }

    setMediaUploading(true);
    setSaveError(null);

    try {
      const uploads = await Promise.all(files.map((file) => uploadMediaFile(file, { mediaType: "SCREENSHOT", projectId: project.id })));
      setEditScreenshots((prev) => mergeCommaLists(prev, uploads.map((item) => item.url)));
      const refreshed = await getProjectBySlug(project.slug);
      setProject(refreshed);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Failed to upload screenshots.";
      setSaveError(message);
    } finally {
      setMediaUploading(false);
    }
  }

  async function uploadVideoFile(file: File) {
    if (!file || !project) {
      return;
    }

    setMediaUploading(true);
    setSaveError(null);

    try {
      const upload = await uploadMediaFile(file, { mediaType: "VIDEO", projectId: project.id });
      setEditVideoUrl(upload.url);
      const refreshed = await getProjectBySlug(project.slug);
      setProject(refreshed);
      setSaveSuccess("Video uploaded.");
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Failed to upload video.";
      setSaveError(message);
    } finally {
      setMediaUploading(false);
    }
  }

  async function deleteProjectVideo() {
    if (!project) {
      return;
    }

    setVideoDeleting(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await updateProject(project.slug, { videoUrl: null });
      const refreshed = await getProjectBySlug(project.slug);
      setProject(refreshed);
      setEditVideoUrl("");
      setSaveSuccess("Video deleted.");
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete video.";
      setSaveError(message);
    } finally {
      setVideoDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-50 text-neutral-900">
        <MarketplaceNavbar />
        <FullPageLoader label="Loading project" fullScreen={false} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <MarketplaceNavbar />

      <section className="mx-auto w-full max-w-6xl px-3 py-4 md:px-5 md:py-6">
        {error ? <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

        {project ? (
          <div className="space-y-3">
            <header className="relative overflow-hidden border border-neutral-200 bg-white p-3 md:p-4">
              {project.backgroundUrl ? (
                <>
                  <div className="absolute inset-0">
                    <Image src={project.backgroundUrl} alt="Project background" fill className="object-cover" unoptimized />
                  </div>
                  <div className="absolute inset-0 bg-white/85" />
                </>
              ) : null}

              <div className="relative z-10 mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3 text-xs text-neutral-500">
                <div className="flex items-center gap-2">
                  <BackButton fallbackHref="/projects" label="Back" size="sm" />
                  <Link href="/projects" className="font-medium hover:text-neutral-800">
                    Projects
                  </Link>
                  <span>/</span>
                  <span className="truncate">{project.slug}</span>
                </div>
                <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
              </div>

              <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight md:text-[30px]">{project.title}</h1>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-700">{project.shortDescription}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Budget</p>
                  <p className="mt-1 text-lg font-semibold text-neutral-900">
                    {formatMoney(project.price, project.currency, project.pricingType)}
                  </p>
                </div>
              </div>

              <div className="relative z-10 mt-3 grid gap-2 border-t border-neutral-100 pt-3 text-xs md:grid-cols-5">
                <div className="border border-neutral-200 px-2.5 py-2">
                  <p className="text-neutral-500">Category</p>
                  <p className="mt-0.5 font-medium text-neutral-800">{friendlyLabel(project.category)}</p>
                </div>
                <div className="border border-neutral-200 px-2.5 py-2">
                  <p className="text-neutral-500">Status</p>
                  <p className="mt-0.5 font-medium text-neutral-800">{friendlyLabel(project.status)}</p>
                </div>
                <div className="border border-neutral-200 px-2.5 py-2">
                  <p className="text-neutral-500">Likes</p>
                  <p className="mt-0.5 font-medium text-neutral-800">{project.likeCount}</p>
                </div>
                <div className="border border-neutral-200 px-2.5 py-2">
                  <p className="text-neutral-500">Views</p>
                  <p className="mt-0.5 font-medium text-neutral-800">{project.viewCount}</p>
                </div>
                <div className="border border-neutral-200 px-2.5 py-2">
                  <p className="text-neutral-500">Created</p>
                  <p className="mt-0.5 font-medium text-neutral-800">{new Date(project.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="relative z-10 mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void copyProjectUrl();
                  }}
                  className="border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900"
                >
                  {copiedState === "url" ? "Link copied" : "Copy link"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void copySummary();
                  }}
                  className="border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900"
                >
                  {copiedState === "summary" ? "Summary copied" : "Copy summary"}
                </button>
                {project.demoUrl ? (
                  <a
                    href={project.demoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="border border-neutral-900 bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-700"
                  >
                    Open demo
                  </a>
                ) : null}
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!project) {
                        return;
                      }

                      setIsEditing((current) => {
                        const next = !current;
                        if (next) {
                          initializeEditForm(project);
                        }
                        return next;
                      });
                      setSaveError(null);
                      setSaveSuccess(null);
                    }}
                    className="border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900"
                  >
                    {isEditing ? "Close editor" : "Edit project"}
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900"
                  >
                    Sign in to edit
                  </Link>
                )}
              </div>

              {saveError ? <p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{saveError}</p> : null}
              {saveSuccess ? <p className="mt-3 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{saveSuccess}</p> : null}
            </header>

            {isEditing ? (
              <section className="border border-neutral-200 bg-white p-3 md:p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Edit Project</h2>
                  <span className="text-xs text-neutral-500">{canEdit ? "Owner mode" : "Read-only mode"}</span>
                </div>

                <div className="sticky top-16 z-20 mb-3 rounded-lg border border-neutral-200 bg-neutral-50/95 p-2.5 backdrop-blur">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-neutral-700">
                      {changedFieldLabels.length > 0
                        ? `${changedFieldLabels.length} unsaved ${changedFieldLabels.length === 1 ? "change" : "changes"}`
                        : "No unsaved changes yet"}
                    </p>
                    {project ? (
                      <button
                        type="button"
                        onClick={() => initializeEditForm(project)}
                        className="border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900"
                      >
                        Reset form
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {changedFieldLabels.length > 0 ? (
                      changedFieldLabels.map((label) => (
                        <span key={label} className="border border-cyan-300 bg-cyan-50 px-1.5 py-0.5 text-[11px] font-medium text-cyan-800">
                          {label}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-neutral-500">Edit any field to see exactly what will be saved.</span>
                    )}
                  </div>
                </div>

                {!canEdit ? (
                  <p className="mb-3 border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    You can view this editor, but only the project owner can save updates.
                  </p>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs text-neutral-600">
                    Title {editDiff.title ? <span className="text-cyan-700">(changed)</span> : null}
                    <input
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      className={`${inputClass(editDiff.title)} h-9`}
                    />
                  </label>

                  <label className="text-xs text-neutral-600">
                    Short Description {editDiff.shortDescription ? <span className="text-cyan-700">(changed)</span> : null}
                    <input
                      value={editShortDescription}
                      onChange={(event) => setEditShortDescription(event.target.value)}
                      className={`${inputClass(editDiff.shortDescription)} h-9`}
                    />
                  </label>
                </div>

                <label className="mt-3 block text-xs text-neutral-600">
                  Long Description {editDiff.longDescription ? <span className="text-cyan-700">(changed)</span> : null}
                  <textarea
                    value={editLongDescription}
                    onChange={(event) => setEditLongDescription(event.target.value)}
                    className={`${inputClass(editDiff.longDescription)} min-h-36 py-2`}
                  />
                </label>

                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  <label className="text-xs text-neutral-600">
                    Category {editDiff.category ? <span className="text-cyan-700">(changed)</span> : null}
                    <select
                      value={editCategory}
                      onChange={(event) => setEditCategory(event.target.value as ProjectCategory)}
                      className={`${inputClass(editDiff.category)} h-9`}
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {friendlyLabel(option)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs text-neutral-600">
                    Status {editDiff.status ? <span className="text-cyan-700">(changed)</span> : null}
                    <select
                      value={editStatus}
                      onChange={(event) => setEditStatus(event.target.value as ProjectDetail["status"])}
                      className={`${inputClass(editDiff.status)} h-9`}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {friendlyLabel(option)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs text-neutral-600">
                    Pricing Type {editDiff.pricingType ? <span className="text-cyan-700">(changed)</span> : null}
                    <select
                      value={editPricingType}
                      onChange={(event) => setEditPricingType(event.target.value as PricingType)}
                      className={`${inputClass(editDiff.pricingType)} h-9`}
                    >
                      {PRICING_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {friendlyLabel(option)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs text-neutral-600">
                    Currency {editDiff.currency ? <span className="text-cyan-700">(changed)</span> : null}
                    <input
                      value={editCurrency}
                      onChange={(event) => setEditCurrency(event.target.value)}
                      maxLength={3}
                      className={`${inputClass(editDiff.currency)} h-9 uppercase`}
                    />
                  </label>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="text-xs text-neutral-600">
                    Price (for FIXED) {editDiff.price ? <span className="text-cyan-700">(changed)</span> : null}
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(event) => setEditPrice(event.target.value)}
                      min={0}
                      step="0.01"
                      className={`${inputClass(editDiff.price)} h-9`}
                    />
                  </label>

                  <label className="text-xs text-neutral-600">
                    Tech Stack (comma separated) {editDiff.techStack ? <span className="text-cyan-700">(changed)</span> : null}
                    <input
                      value={editTechStack}
                      onChange={(event) => setEditTechStack(event.target.value)}
                      className={`${inputClass(editDiff.techStack)} h-9`}
                    />
                  </label>
                </div>

                <label className="mt-3 block text-xs text-neutral-600">
                  Industries (comma separated) {editDiff.industries ? <span className="text-cyan-700">(changed)</span> : null}
                  <input
                    value={editIndustries}
                    onChange={(event) => setEditIndustries(event.target.value)}
                    className={`${inputClass(editDiff.industries)} h-9`}
                  />
                </label>

                <section className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50/70 p-3">
                  <div className="mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Visual Assets</h3>
                    <p className="mt-1 text-xs text-neutral-500">Manage hero background, thumbnail, screenshots, and video.</p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-xs text-neutral-600">
                      Demo URL {editDiff.demoUrl ? <span className="text-cyan-700">(changed)</span> : null}
                      <input
                        value={editDemoUrl}
                        onChange={(event) => setEditDemoUrl(event.target.value)}
                        className={`${inputClass(editDiff.demoUrl)} h-9`}
                      />
                    </label>

                    <label className="text-xs text-neutral-600">
                      Background URL {editDiff.backgroundUrl ? <span className="text-cyan-700">(changed)</span> : null}
                      <input
                        value={editBackgroundUrl}
                        onChange={(event) => setEditBackgroundUrl(event.target.value)}
                        className={`${inputClass(editDiff.backgroundUrl)} h-9`}
                      />
                      <div className="mt-2">
                        <UploadDropZone
                          label="Upload background image"
                          accept="image/png,image/jpeg,image/webp"
                          currentUrl={editBackgroundUrl || undefined}
                          onFiles={(files) => {
                            if (files[0]) {
                              void uploadBackgroundFile(files[0]);
                            }
                          }}
                        />
                      </div>
                    </label>

                    <label className="text-xs text-neutral-600">
                      Thumbnail URL {editDiff.thumbnailUrl ? <span className="text-cyan-700">(changed)</span> : null}
                      <input
                        value={editThumbnailUrl}
                        onChange={(event) => setEditThumbnailUrl(event.target.value)}
                        className={`${inputClass(editDiff.thumbnailUrl)} h-9`}
                      />
                      <div className="mt-2">
                        <UploadDropZone
                          label="Upload thumbnail"
                          accept="image/png,image/jpeg,image/webp"
                          currentUrl={editThumbnailUrl || undefined}
                          onFiles={(files) => {
                            if (files[0]) {
                              void uploadThumbnailFile(files[0]);
                            }
                          }}
                        />

                        {editThumbnailUrl ? (
                          <div className="mt-2 overflow-hidden rounded-lg border border-neutral-200 bg-white">
                            <div className="relative h-28 w-full bg-neutral-100">
                              <Image src={editThumbnailUrl} alt="Current thumbnail" fill className="object-cover" unoptimized />
                            </div>
                            <div className="flex items-center justify-between px-2.5 py-2">
                              <span className="text-[11px] font-medium text-neutral-700">Current thumbnail</span>
                              <div className="flex items-center gap-2">
                                <a href={editThumbnailUrl} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-cyan-700 hover:underline">
                                  Open
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setEditThumbnailUrl("")}
                                  className="text-[11px] font-medium text-red-700 transition hover:text-red-800"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </label>

                    <label className="text-xs text-neutral-600">
                      Video URL {editDiff.videoUrl ? <span className="text-cyan-700">(changed)</span> : null}
                      <input
                        value={editVideoUrl}
                        onChange={(event) => setEditVideoUrl(event.target.value)}
                        className={`${inputClass(editDiff.videoUrl)} h-9`}
                      />
                      <div className="mt-2">
                        <UploadDropZone
                          label="Upload video"
                          accept="video/mp4,video/webm,video/quicktime"
                          currentUrl={editVideoUrl || undefined}
                          onFiles={(files) => {
                            if (files[0]) {
                              void uploadVideoFile(files[0]);
                            }
                          }}
                        />

                        {editVideoUrl ? (
                          <div className="mt-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-medium text-neutral-700">Current video attached</p>
                              <button
                                type="button"
                                onClick={() => {
                                  void deleteProjectVideo();
                                }}
                                disabled={videoDeleting || mediaUploading || saving}
                                className="text-[11px] font-medium text-red-700 transition hover:text-red-800"
                              >
                                {videoDeleting ? "Deleting..." : "Delete video"}
                              </button>
                            </div>
                            <a href={editVideoUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] font-medium text-cyan-700 hover:underline">
                              Preview video URL
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </label>
                  </div>

                  <label className="mt-3 block text-xs text-neutral-600">
                    Screenshot URLs (comma separated) {editDiff.screenshots ? <span className="text-cyan-700">(changed)</span> : null}
                    <textarea
                      value={editScreenshots}
                      onChange={(event) => setEditScreenshots(event.target.value)}
                      className={`${inputClass(editDiff.screenshots)} min-h-20 py-2`}
                      placeholder="https://example.com/screen-1.png, https://example.com/screen-2.png"
                    />
                    <div className="mt-2">
                      <UploadDropZone
                        label="Upload one or more screenshots"
                        accept="image/png,image/jpeg,image/webp"
                        currentUrl={parseCommaList(editScreenshots)[0]}
                        multiple
                        onFiles={(files) => {
                          void uploadScreenshotFiles(files);
                        }}
                      />
                    </div>

                    {screenshotItems.length > 0 ? (
                      <div className="mt-2 rounded-lg border border-neutral-200 bg-white p-2">
                        <div className="mb-1.5 flex items-center justify-between">
                          <p className="text-[11px] font-medium text-neutral-600">Attached screenshots</p>
                          <button
                            type="button"
                            onClick={() => setEditScreenshots("")}
                            className="text-[11px] font-medium text-red-700 transition hover:text-red-800"
                          >
                            Remove all
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {screenshotItems.map((url, index) => (
                            <span key={`${url}-${index}`} className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] text-neutral-700">
                              <span className="max-w-45 truncate">Screenshot {index + 1}</span>
                              <button
                                type="button"
                                onClick={() => removeScreenshotAt(index)}
                                className="font-semibold text-red-700 transition hover:text-red-800"
                                aria-label={`Remove screenshot ${index + 1}`}
                              >
                                x
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </label>
                </section>

                {mediaUploading ? <p className="mt-2 text-xs font-medium text-neutral-600">Uploading media to Cloudinary...</p> : null}

                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving || !canEdit}
                    onClick={() => {
                      void handleSaveUpdate();
                    }}
                    className="border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60"
                  >
                    {!canEdit
                      ? "Owner only"
                      : saving
                        ? "Saving..."
                        : changedFieldLabels.length > 0
                          ? `Save ${changedFieldLabels.length} change${changedFieldLabels.length === 1 ? "" : "s"}`
                          : "Save changes"}
                  </button>
                </div>
              </section>
            ) : null}

            <div className="grid gap-3 xl:grid-cols-[1.45fr_0.9fr]">
              <article className="space-y-3">
                <section className="border border-neutral-200 bg-white p-3 md:p-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Project Videos</h2>
                  {projectVideoUrl ? (
                    <div className="mt-3 space-y-3">
                      <div className="overflow-hidden border border-neutral-200 bg-black">
                        <video
                          controls
                          preload="metadata"
                          poster={project.thumbnailUrl ?? undefined}
                          className="aspect-video h-auto w-full"
                        >
                          <source src={projectVideoUrl} />
                          Your browser does not support video playback.
                        </video>
                      </div>

                      {projectVideoUrls.length > 1 ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {projectVideoUrls.slice(1).map((url, index) => (
                            <div key={`${url}-${index}`} className="overflow-hidden border border-neutral-200 bg-black">
                              <video controls preload="metadata" className="aspect-video h-auto w-full">
                                <source src={url} />
                                Your browser does not support video playback.
                              </video>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-neutral-600">No project video uploaded yet.</p>
                  )}
                </section>

                {galleryImages.length > 0 ? (
                  <section className="border border-neutral-200 bg-white p-3 md:p-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Project Images</h2>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {galleryImages.map((url, index) => (
                        <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden border border-neutral-200 bg-neutral-100">
                          <div className="relative h-40 w-full">
                            <Image src={url} alt={`Project screenshot ${index + 1}`} fill className="object-cover" unoptimized />
                          </div>
                        </a>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="border border-neutral-200 bg-white p-3 md:p-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Overview</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-800">{visibleOverview || "No overview provided."}</p>
                  {hasLongOverview ? (
                    <button
                      type="button"
                      onClick={() => setShowFullOverview((current) => !current)}
                      className="mt-2 text-xs font-medium text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline"
                    >
                      {showFullOverview ? "Show less" : "Show full overview"}
                    </button>
                  ) : null}
                </section>

                <section className="grid gap-3 md:grid-cols-2">
                  <div className="border border-neutral-200 bg-white p-3 md:p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Tech Stack</h3>
                    {project.techStack.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                        {project.techStack.map((item) => (
                          <span key={item} className="border border-neutral-200 px-2 py-1 text-neutral-700">
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-neutral-600">No tech stack specified.</p>
                    )}
                  </div>

                  <div className="border border-neutral-200 bg-white p-3 md:p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Industries</h3>
                    {project.industries.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                        {project.industries.map((item) => (
                          <span key={item} className="border border-neutral-200 px-2 py-1 text-neutral-700">
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-neutral-600">No industries specified.</p>
                    )}
                  </div>
                </section>
              </article>

              <aside className="space-y-3">
                <section className="border border-neutral-200 bg-white p-3 md:p-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Project Links</h2>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {project.demoUrl ? (
                      <li>
                        <a href={project.demoUrl} className="text-neutral-800 underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
                          Demo
                        </a>
                      </li>
                    ) : null}
                    {projectVideoUrl ? (
                      <li>
                        <a href={projectVideoUrl} className="text-neutral-800 underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
                          Video
                        </a>
                      </li>
                    ) : null}
                    {project.thumbnailUrl ? (
                      <li>
                        <a href={project.thumbnailUrl} className="text-neutral-800 underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
                          Thumbnail
                        </a>
                      </li>
                    ) : null}
                    {!project.demoUrl && !projectVideoUrl && !project.thumbnailUrl ? (
                      <li className="text-neutral-600">No external links attached.</li>
                    ) : null}
                  </ul>
                </section>

                <section className="border border-neutral-200 bg-white p-3 md:p-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Fast Facts</h2>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    <dt className="text-neutral-500">Author</dt>
                    <dd className="text-neutral-800">{project.author.fullName}</dd>
                    <dt className="text-neutral-500">Username</dt>
                    <dd className="text-neutral-800">@{project.author.username}</dd>
                    <dt className="text-neutral-500">Slug</dt>
                    <dd className="break-all text-neutral-800">{project.slug}</dd>
                    <dt className="text-neutral-500">Price Type</dt>
                    <dd className="text-neutral-800">{friendlyLabel(project.pricingType)}</dd>
                  </dl>
                </section>
              </aside>
            </div>

            <section className="border border-neutral-200 bg-white p-3 md:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Requirements</h2>
                <span className="text-xs text-neutral-500">
                  {filteredDetails.length}/{parsed.details.length}
                </span>
              </div>

              {parsed.details.length > 0 ? (
                <>
                  <input
                    value={requirementsQuery}
                    onChange={(event) => setRequirementsQuery(event.target.value)}
                    placeholder="Search requirements"
                    className="mb-3 block h-9 w-full border border-neutral-300 bg-white px-2.5 text-sm outline-none transition focus:border-neutral-900"
                  />

                  {filteredDetails.length > 0 ? (
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {filteredDetails.map((item) => (
                        <article key={`${item.label}-${item.value}`} className="border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{item.label}</p>
                          <p className="mt-1 text-sm leading-6 text-neutral-800">{item.value}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-600">No requirements match your search.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-neutral-600">No structured requirements were provided.</p>
              )}
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}
