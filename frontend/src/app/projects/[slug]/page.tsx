"use client";

import Image from "next/image";
import Link from "next/link";
import { DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import MarketplaceNavbar from "@/features/shared/marketplace-navbar";
import {
  getAuthSession,
  getProjectBySlug,
  getProjectLikeStatus,
  ProjectCategory,
  ProjectDetail,
  PricingType,
  toggleProjectLike,
  updateProject,
  uploadMediaFile
} from "@/lib/api";
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

function parseTimelineWeeks(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  const numbers = normalized.match(/\d+(?:\.\d+)?/g)?.map((part) => Number(part)) ?? [];
  if (numbers.length === 0) {
    return null;
  }

  let base = numbers.reduce((sum, current) => sum + current, 0) / numbers.length;

  if (normalized.includes("month")) {
    base *= 4;
  } else if (normalized.includes("day")) {
    base /= 7;
  }

  return Math.max(1, base);
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
  const [showFullOverview, setShowFullOverview] = useState(false);
  const [copiedState, setCopiedState] = useState<"none" | "url">("none");
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
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
  const [fitBudget, setFitBudget] = useState("");
  const [fitDeadlineWeeks, setFitDeadlineWeeks] = useState("");
  const [fitRequiredStack, setFitRequiredStack] = useState("");

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

  useEffect(() => {
    if (!project?.slug || !viewerId) {
      return;
    }

    let active = true;

    void (async () => {
      try {
        const status = await getProjectLikeStatus(project.slug);
        if (!active) {
          return;
        }
        setIsLiked(status.liked);
        setProject((current) => {
          if (!current || current.likeCount === status.likeCount) {
            return current;
          }
          return { ...current, likeCount: status.likeCount };
        });
      } catch {
        if (active) {
          setIsLiked(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [project?.slug, viewerId]);

  const parsed = useMemo(() => parseIntakeDetails(project?.longDescription ?? ""), [project?.longDescription]);

  const overviewText = parsed.narrative.trim();
  const hasLongOverview = overviewText.length > 540;
  const visibleOverview = hasLongOverview && !showFullOverview ? `${overviewText.slice(0, 540).trimEnd()}...` : overviewText;
  const isAuthenticated = Boolean(viewerId);
  const likedForDisplay = isAuthenticated && Boolean(project?.slug) ? isLiked : false;
  const canEdit = Boolean(project && viewerId && project.author.id === viewerId);
  const messageDeveloperHref = useMemo(() => {
    if (!project) {
      return "/client/messages";
    }

    const params = new URLSearchParams({
      recipientId: project.author.id,
      projectId: project.id,
      thread: "",
      username: project.author.username,
      name: project.author.fullName
    });
    params.delete("thread");
    return `/client/messages?${params.toString()}`;
  }, [project]);
  const hireDeveloperHref = useMemo(() => {
    if (!project) {
      return "/developers";
    }

    const params = new URLSearchParams({
      projectId: project.id,
      projectSlug: project.slug,
      projectTitle: project.title
    });

    return `/hire/${project.author.username}?${params.toString()}`;
  }, [project]);
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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setActiveGalleryIndex(0);
      setLightboxIndex(null);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [project?.id]);

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
  const mainGalleryImage = galleryImages[activeGalleryIndex] ?? galleryImages[0] ?? null;

  const normalizedDetails = useMemo(
    () =>
      parsed.details.map((item) => ({
        ...item,
        key: item.label.toLowerCase()
      })),
    [parsed.details]
  );

  const pickDetailValue = (...needles: string[]): string | null => {
    const match = normalizedDetails.find((item) => needles.some((needle) => item.key.includes(needle)));
    return match?.value ?? null;
  };

  const problemText = pickDetailValue("problem", "pain", "challenge") ?? "Teams needed a cleaner way to discover and evaluate developer quality before starting a project.";
  const solutionText =
    pickDetailValue("solution", "approach", "strategy") ??
    "This project delivers a structured developer marketplace experience with rich portfolio storytelling and direct conversion actions.";
  const outcomeText =
    pickDetailValue("outcome", "result", "impact") ??
    "Clients can quickly assess capability, trust signals, and fit, then move straight into a hiring conversation.";
  const durationLabel = pickDetailValue("duration", "timeline", "time") ?? "4-8 weeks";
  const complexityLabel = pickDetailValue("complexity", "scope") ?? "Production-grade";
  const responseTimeLabel = pickDetailValue("response", "reply") ?? "Usually responds in 2 hours";
  const availabilityLabel =
    pickDetailValue("availability") ?? (project?.status === "PUBLISHED" ? "Available for new projects" : "Limited availability");
  const roleLabel = pickDetailValue("role", "title", "position") ?? "Senior Full Stack Engineer";
  const locationLabel = pickDetailValue("location", "country", "city") ?? "Nairobi, Kenya";
  const projectTypeLabel = project ? friendlyLabel(project.category) : "Project";

  const timelineSource = pickDetailValue("timeline", "process", "milestone", "stages");
  const timelineSteps = useMemo(() => {
    if (!timelineSource) {
      return ["Research", "Wireframes", "Development", "Testing", "Deployment"];
    }

    const parsedSteps = timelineSource
      .split(/\n|,|>|→/)
      .map((step) => step.trim())
      .filter(Boolean);

    return parsedSteps.length > 0 ? parsedSteps.slice(0, 7) : ["Research", "Wireframes", "Development", "Testing", "Deployment"];
  }, [timelineSource]);

  const featureHighlights = useMemo(() => {
    const candidates = parsed.details
      .filter((item) => {
        const normalized = item.label.toLowerCase();
        return normalized.includes("feature") || normalized.includes("capability") || normalized.includes("module") || normalized.includes("service");
      })
      .map((item) => item.value)
      .flatMap((value) => value.split(/\n|,|•|\|/))
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (candidates.length > 0) {
      return [...new Set(candidates)].slice(0, 8);
    }

    return ["Conversion-focused project showcase", "Trust-first developer profile", "Rich media gallery with video", "Structured case-study narrative"];
  }, [parsed.details]);

  const resourceLinks = useMemo(
    () =>
      [
        { label: "Live Demo", url: project?.demoUrl },
        { label: "Video Walkthrough", url: projectVideoUrl },
        { label: "Primary Screenshot", url: galleryImages[0] }
      ].filter((item): item is { label: string; url: string } => Boolean(item.url)),
    [galleryImages, project?.demoUrl, projectVideoUrl]
  );

  const authorInitials = useMemo(() => {
    const name = project?.author.fullName.trim() ?? "";
    if (!name) {
      return "DV";
    }
    const parts = name.split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "DV";
  }, [project?.author.fullName]);

  const trustScore = useMemo(() => {
    if (!project) {
      return 4.7;
    }
    const engagement = project.viewCount + project.likeCount * 8 + project.inquiryCount * 15;
    if (engagement > 250) {
      return 5;
    }
    if (engagement > 120) {
      return 4.9;
    }
    if (engagement > 50) {
      return 4.8;
    }
    return 4.7;
  }, [project]);

  const fitAssessment = useMemo(() => {
    const defaultResult = {
      score: 0,
      budgetScore: 0,
      timelineScore: 0,
      stackScore: 0,
      reasons: ["Load a project to calculate fit."] as string[]
    };

    if (!project) {
      return defaultResult;
    }

    const inputBudget = Number(fitBudget);
    const hasBudgetInput = Number.isFinite(inputBudget) && inputBudget > 0;
    const hasFixedBudget = project.pricingType === "FIXED" && Number.isFinite(Number(project.price)) && Number(project.price) > 0;
    const projectBudget = hasFixedBudget ? Number(project.price) : null;

    let budgetScore = 70;
    if (hasBudgetInput && projectBudget) {
      const ratio = inputBudget / projectBudget;
      if (ratio >= 1) {
        budgetScore = 100;
      } else if (ratio >= 0.8) {
        budgetScore = 75;
      } else if (ratio >= 0.6) {
        budgetScore = 50;
      } else {
        budgetScore = 20;
      }
    }

    const inputDeadline = Number(fitDeadlineWeeks);
    const hasDeadlineInput = Number.isFinite(inputDeadline) && inputDeadline > 0;
    const estimatedTimeline = parseTimelineWeeks(durationLabel);

    let timelineScore = 70;
    if (hasDeadlineInput && estimatedTimeline) {
      const ratio = inputDeadline / estimatedTimeline;
      if (ratio >= 1) {
        timelineScore = 100;
      } else if (ratio >= 0.8) {
        timelineScore = 70;
      } else if (ratio >= 0.6) {
        timelineScore = 40;
      } else {
        timelineScore = 15;
      }
    }

    const requiredStack = parseCommaList(fitRequiredStack).map((item) => item.toLowerCase());
    const projectStack = project.techStack.map((item) => item.toLowerCase());

    let stackScore = 70;
    let matchedCount = 0;
    if (requiredStack.length > 0) {
      matchedCount = requiredStack.filter((item) => projectStack.includes(item)).length;
      stackScore = Math.round((matchedCount / requiredStack.length) * 100);
    }

    const score = Math.round(budgetScore * 0.4 + timelineScore * 0.3 + stackScore * 0.3);
    const reasons: string[] = [];

    if (hasBudgetInput) {
      if (!projectBudget) {
        reasons.push("Budget fit is estimated because this project does not expose a fixed price.");
      } else if (inputBudget >= projectBudget) {
        reasons.push("Your budget can cover the indicated project price.");
      } else {
        reasons.push(`Your budget is below the listed ${new Intl.NumberFormat(undefined, { style: "currency", currency: project.currency }).format(projectBudget)} target.`);
      }
    } else {
      reasons.push("Add your budget to get a more accurate fit score.");
    }

    if (hasDeadlineInput) {
      if (!estimatedTimeline) {
        reasons.push("Timeline fit is estimated because duration details are broad.");
      } else if (inputDeadline >= estimatedTimeline) {
        reasons.push("Your deadline aligns with the estimated delivery window.");
      } else {
        reasons.push(`Your deadline is tighter than the estimated ${estimatedTimeline.toFixed(1)} week delivery.`);
      }
    } else {
      reasons.push("Add your desired timeline in weeks to improve timeline matching.");
    }

    if (requiredStack.length > 0) {
      reasons.push(`Stack overlap: ${matchedCount}/${requiredStack.length} required technologies matched.`);
    } else {
      reasons.push("Add required stack items to score technical fit.");
    }

    return { score, budgetScore, timelineScore, stackScore, reasons };
  }, [durationLabel, fitBudget, fitDeadlineWeeks, fitRequiredStack, project]);

  const copyProjectUrl = async (): Promise<void> => {
    if (typeof window === "undefined" || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(window.location.href);
    setCopiedState("url");
    window.setTimeout(() => setCopiedState("none"), 1500);
  };

  const handleToggleLike = async (): Promise<void> => {
    if (!project) {
      return;
    }

    if (!isAuthenticated) {
      setSaveError("Sign in to like projects.");
      return;
    }

    setLikeLoading(true);
    setSaveError(null);

    try {
      const result = await toggleProjectLike(project.slug);
      setIsLiked(result.liked);
      setProject((current) => (current ? { ...current, likeCount: result.likeCount } : current));
    } catch (likeError) {
      const message = likeError instanceof Error ? likeError.message : "Unable to update like.";
      setSaveError(message);
    } finally {
      setLikeLoading(false);
    }
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
    <main className="min-h-screen bg-white text-slate-900">
      <MarketplaceNavbar />

      <section className="mx-auto w-full max-w-310 px-4 py-6 md:px-6 md:py-8">
        {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

        {project ? (
          <div className="space-y-8">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <BackButton fallbackHref="/projects" label="Back" size="sm" />
              <Link href="/projects" className="font-semibold text-slate-600 hover:text-slate-900">
                Projects
              </Link>
              <span>/</span>
              <span className="font-medium text-slate-700">Case Study</span>
            </div>

            <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 px-5 py-6 text-slate-900 shadow-xl shadow-slate-300/60 md:px-8 md:py-9">
              {project.backgroundUrl ? (
                <>
                  <div className="absolute inset-0">
                    <Image src={project.backgroundUrl} alt="Project background" fill className="object-cover opacity-10" unoptimized />
                  </div>
                  <div className="absolute inset-0 bg-white/90" />
                </>
              ) : null}

              <div className="relative z-10 grid gap-6 xl:grid-cols-[1.5fr_0.85fr]">
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                    <span className="rounded-full border border-slate-300 bg-white px-3 py-1">Featured Case Study</span>
                    <span className="rounded-full border border-slate-300 bg-white px-3 py-1">{friendlyLabel(project.category)}</span>
                    <span className="rounded-full border border-slate-300 bg-white px-3 py-1">Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>

                  <div>
                    <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-tight md:text-[44px]">{project.title}</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700 md:text-base">{project.shortDescription}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
                    <span className="rounded-full border border-slate-300 bg-white px-3 py-1.5">{formatMoney(project.price, project.currency, project.pricingType)}</span>
                    <span className="rounded-full border border-slate-300 bg-white px-3 py-1.5">{projectTypeLabel}</span>
                    <span className="rounded-full border border-slate-300 bg-white px-3 py-1.5">{complexityLabel}</span>
                    <span className="rounded-full border border-slate-300 bg-white px-3 py-1.5">{durationLabel}</span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {project.demoUrl ? (
                      <a
                        href={project.demoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-slate-900 underline underline-offset-4"
                      >
                        View Live Demo
                      </a>
                    ) : null}
                    <Link
                      href={hireDeveloperHref}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      Hire Developer
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        void handleToggleLike();
                      }}
                      disabled={likeLoading}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      {likeLoading ? "Updating..." : likedForDisplay ? `Liked (${project.likeCount})` : `Like Project (${project.likeCount})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSaved((current) => !current)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      {isSaved ? "Saved" : "Save Project"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void copyProjectUrl();
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      {copiedState === "url" ? "Link Copied" : "Share"}
                    </button>
                  </div>
                </div>

                <aside className="rounded-2xl border border-slate-200 bg-white p-4 backdrop-blur md:p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">Hire This Developer</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{responseTimeLabel}</p>
                  <p className="mt-1 text-xs text-slate-600">{availabilityLabel}</p>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="px-0 py-0">
                      <p className="text-slate-600">Trust Score</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{trustScore.toFixed(1)} / 5</p>
                    </div>
                    <div className="px-0 py-0">
                      <p className="text-slate-600">Client Inquiries</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{project.inquiryCount}</p>
                    </div>
                    <div className="px-0 py-0">
                      <p className="text-slate-600">Views</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{project.viewCount}</p>
                    </div>
                    <div className="px-0 py-0">
                      <p className="text-slate-600">Likes</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{project.likeCount}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Link
                      href={messageDeveloperHref}
                      className="block text-sm font-semibold text-slate-900 underline underline-offset-4"
                    >
                      Message Developer
                    </Link>
                    <Link
                      href={`/developers/${project.author.username}`}
                      className="block text-sm font-semibold text-slate-700 underline underline-offset-4"
                    >
                      View Full Profile
                    </Link>
                  </div>
                </aside>
              </div>

              {saveError ? <p className="relative z-10 mt-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{saveError}</p> : null}
              {saveSuccess ? <p className="relative z-10 mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{saveSuccess}</p> : null}

              <div className="relative z-10 mt-5">
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
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
                  >
                    {isEditing ? "Close Editor" : "Edit Case Study"}
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="inline-block rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
                  >
                    Sign In To Edit
                  </Link>
                )}
              </div>
            </header>

            {isEditing ? (
              <section className="border border-neutral-200 bg-slate-100 p-3 md:p-4">
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

            <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_300px] xl:grid-cols-[280px_minmax(0,1fr)_320px] lg:items-start">
              <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                <section className="border border-slate-200 bg-slate-50 px-4 py-4 md:px-5">
                  <div className="border-b border-slate-200 pb-5 pt-1 text-slate-900">
                    <div className="flex items-start gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-300 bg-white text-lg font-semibold text-slate-900">{authorInitials}</div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold">{project.author.fullName}</p>
                        <p className="mt-0.5 text-xs text-slate-700">{roleLabel}</p>
                        <p className="mt-1 text-xs text-slate-600">{locationLabel}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]">
                      <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-slate-700">Top Rated</span>
                      <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-slate-700">GitHub Verified</span>
                    </div>
                  </div>

                  <div className="pt-5">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="px-0 py-0">
                        <p className="text-[11px] text-slate-500">Rating</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900">{trustScore.toFixed(1)}</p>
                      </div>
                      <div className="px-0 py-0">
                        <p className="text-[11px] text-slate-500">Response</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900">2 hrs</p>
                      </div>
                      <div className="px-0 py-0">
                        <p className="text-[11px] text-slate-500">Status</p>
                        <p className="mt-0.5 text-sm font-semibold text-emerald-700">Open</p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-600">{responseTimeLabel}. Available for scoped MVPs and long-term product work.</p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {project.techStack.slice(0, 6).map((skill) => (
                        <span key={skill} className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 space-y-2">
                      <Link
                        href={hireDeveloperHref}
                        className="block text-sm font-semibold text-slate-900 underline underline-offset-4"
                      >
                        Hire Developer
                      </Link>
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href={messageDeveloperHref}
                          className="text-sm font-semibold text-slate-700 underline underline-offset-4"
                        >
                          Message
                        </Link>
                        <Link
                          href={`/developers/${project.author.username}`}
                          className="text-sm font-semibold text-slate-700 underline underline-offset-4"
                        >
                          Profile
                        </Link>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="border border-slate-200 bg-slate-100 px-4 py-4 md:px-5">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Project Snapshot</h3>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="px-0 py-0">
                      <p className="text-slate-500">Views</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{project.viewCount}</p>
                    </div>
                    <div className="px-0 py-0">
                      <p className="text-slate-500">Likes</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{project.likeCount}</p>
                    </div>
                    <div className="px-0 py-0">
                      <p className="text-slate-500">Inquiries</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{project.inquiryCount}</p>
                    </div>
                    <div className="px-0 py-0">
                      <p className="text-slate-500">Type</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{projectTypeLabel}</p>
                    </div>
                  </div>
                </section>
              </aside>

              <article className="order-3 space-y-6 lg:order-0">
                {(mainGalleryImage || projectVideoUrl) ? (
                  <section className="border border-slate-200 bg-slate-50 px-4 py-4 md:px-5">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Showcase</h2>
                    {projectVideoUrl ? (
                      <div className="group relative mt-4 overflow-hidden">
                        <video
                          controls
                          preload="metadata"
                          poster={project.thumbnailUrl ?? mainGalleryImage ?? undefined}
                          className="aspect-video h-auto w-full"
                        >
                          <source src={projectVideoUrl} />
                          Your browser does not support video playback.
                        </video>
                        <span className="pointer-events-none absolute left-4 top-4 text-xs font-semibold text-white">Video Walkthrough</span>
                      </div>
                    ) : mainGalleryImage ? (
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(activeGalleryIndex)}
                        className="group mt-4 block w-full overflow-hidden"
                      >
                        <div className="relative aspect-video w-full">
                          <Image src={mainGalleryImage} alt="Main project screenshot" fill className="object-cover transition duration-300 group-hover:scale-[1.02]" unoptimized />
                        </div>
                      </button>
                    ) : null}

                    {galleryImages.length > 1 ? (
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {galleryImages.slice(0, 4).map((url, index) => (
                          <button
                            key={`${url}-${index}`}
                            type="button"
                            onClick={() => {
                              setActiveGalleryIndex(index);
                              setLightboxIndex(index);
                            }}
                            className={`overflow-hidden border transition ${
                              index === activeGalleryIndex ? "border-cyan-500" : "border-slate-200 hover:border-slate-400"
                            }`}
                          >
                            <div className="relative aspect-4/3 w-full">
                              <Image src={url} alt={`Project gallery ${index + 1}`} fill className="object-cover" unoptimized />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ) : null}

                <section className="border border-slate-200 bg-slate-100 px-4 py-4 md:px-5">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">About This Project</h2>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700 md:text-base">{visibleOverview || "No overview provided."}</p>
                  {hasLongOverview ? (
                    <button
                      type="button"
                      onClick={() => setShowFullOverview((current) => !current)}
                      className="mt-3 text-xs font-semibold text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
                    >
                      {showFullOverview ? "Show less" : "Show full story"}
                    </button>
                  ) : null}
                </section>

                <section className="grid gap-4 border border-slate-200 bg-slate-50 px-4 py-4 md:grid-cols-3 md:px-5">
                  <article className="">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Problem</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{problemText}</p>
                  </article>
                  <article className="">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Solution</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{solutionText}</p>
                  </article>
                  <article className="">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Outcome</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{outcomeText}</p>
                  </article>
                </section>

                <section className="border border-slate-200 bg-slate-100 px-4 py-4 md:px-5">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Key Features</h2>
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {featureHighlights.map((feature, index) => (
                      <div key={`${feature}-${index}`} className="px-0 py-0.5 text-sm text-slate-700">
                        {feature}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="border border-slate-200 bg-slate-50 px-4 py-4 md:px-5">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Technology Stack</h2>
                  {project.techStack.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {project.techStack.map((item) => (
                        <span key={item} className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-600">Tech stack details were not provided.</p>
                  )}
                </section>

                <section className="border border-slate-200 bg-slate-100 px-4 py-4 md:px-5">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Development Process</h2>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    {timelineSteps.map((step, index) => (
                      <div key={`${step}-${index}`} className="px-0 py-0 text-sm font-medium text-slate-900">
                        {step}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="grid gap-4 border border-slate-200 bg-slate-50 px-4 py-4 md:grid-cols-2 md:px-5">
                  <article className="">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Industries Served</h2>
                    {project.industries.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {project.industries.map((industry) => (
                          <span key={industry} className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-800">
                            {industry}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-600">Industry details coming soon.</p>
                    )}
                  </article>

                  <article className="">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Resources</h2>
                    {resourceLinks.length > 0 ? (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {resourceLinks.map((resource) => (
                          <a
                            key={`${resource.label}-${resource.url}`}
                            href={resource.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
                          >
                            {resource.label}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-600">No external resources provided.</p>
                    )}
                  </article>
                </section>

                <section className="border border-slate-200 bg-slate-100 px-4 py-7 text-slate-900 md:px-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">Ready To Build Something Similar?</p>
                  <h2 className="mt-3 text-2xl font-semibold md:text-3xl">Let&apos;s turn your idea into a production-ready product.</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-700">
                    Work directly with {project.author.fullName} to design, build, and ship software with the same quality shown in this case study.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/developers/${project.author.username}`}
                      className="text-sm font-semibold text-slate-900 underline underline-offset-4"
                    >
                      Hire {project.author.fullName.split(" ")[0] || "Developer"}
                    </Link>
                    <Link
                      href={messageDeveloperHref}
                      className="text-sm font-semibold text-slate-700 underline underline-offset-4"
                    >
                      Message Developer
                    </Link>
                  </div>
                </section>

                <section className="border border-slate-200 bg-slate-50 px-4 py-4 md:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">More Projects From This Developer</h2>
                    <Link href={`/developers/${project.author.username}`} className="text-xs font-semibold text-slate-600 hover:text-slate-900">
                      View profile
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {["Mobile Product", "Dashboard System", "API Platform"].map((name, index) => (
                      <article key={`${name}-${index}`} className="border border-slate-300 bg-slate-100 p-3">
                        <p className="text-sm font-semibold text-slate-800">{name}</p>
                        <p className="mt-1 text-xs text-slate-500">More project highlights can be shown here to keep clients exploring.</p>
                      </article>
                    ))}
                  </div>
                </section>
              </article>

              <aside className="order-2 space-y-4 lg:order-0 lg:sticky lg:top-20 lg:self-start">
                <section className="border border-slate-200 bg-slate-50 px-4 py-4 md:px-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Client Fit Score</h3>
                    <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {fitAssessment.score}%
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-600">Enter your needs to see how well this project matches your budget, timeline, and stack.</p>

                  <div className="mt-3 space-y-2.5">
                    <label className="block text-[11px] font-medium text-slate-600">
                      Budget ({project.currency})
                      <input
                        type="number"
                        min={0}
                        step="100"
                        value={fitBudget}
                        onChange={(event) => setFitBudget(event.target.value)}
                        placeholder="e.g. 5000"
                        className="mt-1 h-9 w-full border border-slate-300 bg-white px-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-900"
                      />
                    </label>

                    <label className="block text-[11px] font-medium text-slate-600">
                      Deadline (weeks)
                      <input
                        type="number"
                        min={1}
                        step="1"
                        value={fitDeadlineWeeks}
                        onChange={(event) => setFitDeadlineWeeks(event.target.value)}
                        placeholder="e.g. 6"
                        className="mt-1 h-9 w-full border border-slate-300 bg-white px-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-900"
                      />
                    </label>

                    <label className="block text-[11px] font-medium text-slate-600">
                      Required stack (comma separated)
                      <input
                        value={fitRequiredStack}
                        onChange={(event) => setFitRequiredStack(event.target.value)}
                        placeholder="React, Node.js, PostgreSQL"
                        className="mt-1 h-9 w-full border border-slate-300 bg-white px-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-900"
                      />
                    </label>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="border border-slate-200 bg-white px-2 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">Budget</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900">{fitAssessment.budgetScore}%</p>
                    </div>
                    <div className="border border-slate-200 bg-white px-2 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">Timeline</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900">{fitAssessment.timelineScore}%</p>
                    </div>
                    <div className="border border-slate-200 bg-white px-2 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">Stack</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900">{fitAssessment.stackScore}%</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 border border-slate-200 bg-white p-2.5">
                    {fitAssessment.reasons.map((reason, index) => (
                      <p key={`${reason}-${index}`} className="text-xs leading-5 text-slate-700">
                        {reason}
                      </p>
                    ))}
                  </div>
                </section>
              </aside>
            </div>

            {lightboxIndex !== null && galleryImages[lightboxIndex] ? (
              <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4"
                onClick={() => setLightboxIndex(null)}
              >
                <div className="relative w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(null)}
                    className="absolute right-2 top-2 z-10 rounded-full bg-black/70 px-3 py-1 text-sm font-semibold text-white"
                  >
                    Close
                  </button>
                  <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-900">
                    <Image
                      src={galleryImages[lightboxIndex]}
                      alt={`Project gallery full view ${lightboxIndex + 1}`}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}


