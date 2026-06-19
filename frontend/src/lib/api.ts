const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4311").replace(/\/+$/, "");
const CSRF_COOKIE_NAME = process.env.NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME ?? "csrf_token";

interface ApiErrorBody {
  message?: string | string[];
  error?: {
    message?: string | string[];
  };
}

export interface CreatedThread {
  id: string;
  participantAId: string;
  participantBId: string;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateThreadPayload {
  recipientId: string;
  projectId?: string;
  initialMessage?: string;
}

export interface ProjectInquiryPayload {
  type?: "ASK_QUESTION" | "OFFER_PROJECT";
  message?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
let inFlightRefresh: Promise<boolean> | null = null;
let inFlightSession: Promise<AuthSession> | null = null;
let cachedSession: AuthSession | null = null;
let cachedSessionAt = 0;
const SESSION_CACHE_TTL_MS = 10_000;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const token = `${name}=`;
  for (const chunk of document.cookie.split(";")) {
    const part = chunk.trim();
    if (part.startsWith(token)) {
      return decodeURIComponent(part.slice(token.length));
    }
  }

  return null;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  username: string;
  role: AppRole;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export type AppRole = "DEVELOPER" | "CLIENT" | "ADMIN";

interface RegisterResponse {
  userId: string;
  role: AppRole;
}

interface LoginResponse {
  role: AppRole;
}

export interface AuthSession {
  sub: string;
  email: string;
  role: AppRole;
}

export interface CurrentUserProfile {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  title: string | null;
  role: AppRole;
  bio: string | null;
  skills: string[];
  primaryStack: string | null;
  experienceLevel: "JUNIOR" | "MID" | "SENIOR";
  availabilityStatus: "AVAILABLE" | "BUSY" | "NOT_ACCEPTING_WORK";
  location: string | null;
  contactEmail: string | null;
  publicEmailEnabled: boolean;
  educationEntries: string[];
  certificationEntries: string[];
  languageEntries: string[];
  phoneNumber: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
}

export interface DeveloperSearchItem {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  title: string | null;
  bio: string | null;
  skills: string[];
  primaryStack: string | null;
  experienceLevel: "JUNIOR" | "MID" | "SENIOR";
  availabilityStatus: "AVAILABLE" | "BUSY" | "NOT_ACCEPTING_WORK";
  location: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  projectCount: number;
  profileCompleteness: number;
  score: number;
  scoreBreakdown: {
    completeness: number;
    skillMatches: number;
    requestedSkills: number;
    projectEngagement: number;
  };
  updatedAt: string;
}

export interface PublicDeveloperProfile {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  title: string | null;
  bio: string | null;
  skills: string[];
  primaryStack: string | null;
  experienceLevel: "JUNIOR" | "MID" | "SENIOR";
  availabilityStatus: "AVAILABLE" | "BUSY" | "NOT_ACCEPTING_WORK";
  location: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  contactEmail: string | null;
  projects: Array<{
    id: string;
    slug: string;
    title: string;
    shortDescription: string;
    techStack: string[];
    likeCount: number;
    viewCount: number;
    inquiryCount: number;
    thumbnailUrl: string | null;
    backgroundUrl: string | null;
    demoUrl: string | null;
    createdAt: string;
  }>;
}

export interface SearchDevelopersParams {
  q?: string;
  skills?: string[];
  experienceLevel?: "JUNIOR" | "MID" | "SENIOR";
  availabilityStatus?: "AVAILABLE" | "BUSY" | "NOT_ACCEPTING_WORK";
  location?: string;
  limit?: number;
}

export interface ListProjectsParams {
  category?: ProjectCategory;
  techStack?: string[];
  industries?: string[];
  pricingType?: PricingType;
  search?: string;
  sortBy?: "newest" | "oldest" | "popular" | "most_viewed" | "price_asc" | "price_desc";
  minPrice?: string;
  maxPrice?: string;
  cursor?: string;
  page?: number;
  limit?: number;
}

export interface CursorPageMeta {
  hasNext: boolean;
  nextCursor?: string;
  page?: number;
  totalPages?: number;
  totalItems?: number;
}

export interface PaginatedProjectList {
  items: ProjectListItem[];
  meta: CursorPageMeta;
}

export type ProjectCategory =
  | "WEB_APP"
  | "MOBILE_APP"
  | "API"
  | "DESKTOP"
  | "AI_ML"
  | "ECOMMERCE"
  | "MANAGEMENT_SYSTEM"
  | "OTHER";

export type PricingType = "FIXED" | "NEGOTIABLE" | "FREE" | "CONTACT";
export type ProjectMediaType = "IMAGE" | "VIDEO" | "SCREENSHOT";

export type NotificationType =
  | "NEW_MESSAGE"
  | "NEW_QUESTION"
  | "NEW_REVIEW"
  | "PROJECT_FEATURED"
  | "DEAL_INTEREST";

interface ProjectResponse {
  id: string;
  slug: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

export interface ProjectListItem {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  category: ProjectCategory;
  techStack: string[];
  pricingType: PricingType;
  price: number | string | null;
  currency: string;
  thumbnailUrl: string | null;
  backgroundUrl: string | null;
  likeCount: number;
  viewCount: number;
  inquiryCount: number;
  createdAt: string;
}

export interface ProjectDetail {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  category: ProjectCategory;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  techStack: string[];
  industries: string[];
  pricingType: PricingType;
  price: number | string | null;
  currency: string;
  demoUrl: string | null;
  backgroundUrl: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  likeCount: number;
  viewCount: number;
  inquiryCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    fullName: string;
    username: string;
  };
  media: Array<{
    id: string;
    type: ProjectMediaType;
    url: string;
    caption: string | null;
    order: number;
  }>;
}

interface SavedProjectEntry {
  id: string;
  project: {
    id: string;
    slug: string;
    title: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  };
}

export interface MyProjectListItem {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  category: ProjectCategory;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  techStack: string[];
  likeCount: number;
  viewCount: number;
  thumbnailUrl: string | null;
  backgroundUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadSummary {
  id: string;
  participantAId: string;
  participantBId: string;
  projectId: string | null;
  project?: {
    id: string;
    slug: string;
    title: string;
  } | null;
  participantA?: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
  };
  participantB?: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
  };
  updatedAt: string;
  unreadCount: number;
  messages: Array<{
    id: string;
    senderId?: string;
    content: string;
    createdAt: string;
  }>;
}

export interface ThreadMessage {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface MessagePageMeta {
  hasNext: boolean;
  nextCursor?: string;
}

export interface PaginatedThreadMessages {
  items: ThreadMessage[];
  meta: MessagePageMeta;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

export interface ProfileCompleteness {
  percentage: number;
  completedFields: number;
  totalFields: number;
  missingFields: string[];
  nextAction: string | null;
}

export interface UpdateProfilePayload {
  fullName?: string;
  title?: string;
  bio?: string;
  skills?: string[];
  primaryStack?: string;
  experienceLevel?: "JUNIOR" | "MID" | "SENIOR";
  availabilityStatus?: "AVAILABLE" | "BUSY" | "NOT_ACCEPTING_WORK";
  location?: string;
  contactEmail?: string;
  publicEmailEnabled?: boolean;
  educationEntries?: string[];
  certificationEntries?: string[];
  languageEntries?: string[];
  phoneNumber?: string;
  websiteUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
}

export interface CreateProjectPayload {
  title: string;
  shortDescription: string;
  longDescription: string;
  category: ProjectCategory;
  techStack: string[];
  industries: string[];
  pricingType: PricingType;
  price?: number;
  currency?: string;
  demoUrl?: string;
  backgroundUrl?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  screenshots?: string[];
}

export interface UpdateProjectPayload {
  title?: string;
  shortDescription?: string;
  longDescription?: string;
  category?: ProjectCategory;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  techStack?: string[];
  industries?: string[];
  pricingType?: PricingType;
  price?: number;
  currency?: string;
  demoUrl?: string | null;
  backgroundUrl?: string | null;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  screenshots?: string[];
}

export interface UploadMediaOptions {
  projectId?: string;
  mediaType?: "IMAGE" | "VIDEO" | "SCREENSHOT" | "THUMBNAIL";
  caption?: string;
}

function normalizeOptionalUrl(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (Array.isArray(body.message)) {
      return body.message.join(", ");
    }

    if (typeof body.message === "string") {
      return body.message;
    }

    if (Array.isArray(body.error?.message)) {
      return body.error.message.join(", ");
    }

    if (typeof body.error?.message === "string") {
      return body.error.message;
    }
  } catch {
    // No-op: fallback message below.
  }

  return `Request failed (${response.status})`;
}

async function requestJson<TResponse, TBody = unknown>(
  method: HttpMethod,
  path: string,
  options?: { body?: TBody; allowRetryOn401?: boolean }
): Promise<TResponse> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const hasBody = options?.body !== undefined;
  const allowRetryOn401 = options?.allowRetryOn401 ?? true;
  const isMutation = method === "POST" || method === "PUT" || method === "DELETE";

  const send = async (): Promise<Response> => {
    const csrfToken = isMutation ? readCookie(CSRF_COOKIE_NAME) : null;

    return fetch(`${API_BASE_URL}${normalizedPath}`, {
      method,
      credentials: "include",
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(isMutation && csrfToken ? { "x-csrf-token": csrfToken } : {})
      },
      body: hasBody ? JSON.stringify(options?.body) : undefined
    });
  };

  const response = await send();

  if (response.status === 401 && allowRetryOn401 && path !== "/auth/refresh") {
    const refreshed = await refreshSession();
    if (refreshed) {
      const retryResponse = await send();
      if (!retryResponse.ok) {
        throw new Error(await parseError(retryResponse));
      }

      const retryPayload = (await retryResponse.json()) as TResponse | ApiEnvelope<TResponse>;
      if (
        typeof retryPayload === "object" &&
        retryPayload !== null &&
        "success" in retryPayload &&
        "data" in retryPayload
      ) {
        return (retryPayload as ApiEnvelope<TResponse>).data;
      }

      return retryPayload as TResponse;
    }
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as TResponse | ApiEnvelope<TResponse>;

  if (typeof payload === "object" && payload !== null && "success" in payload && "data" in payload) {
    return (payload as ApiEnvelope<TResponse>).data;
  }

  return payload as TResponse;
}

async function postJson<TResponse, TBody>(
  path: string,
  body: TBody
): Promise<TResponse> {
  return requestJson<TResponse, TBody>("POST", path, { body });
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  cachedSession = null;
  cachedSessionAt = 0;
  return postJson<RegisterResponse, RegisterPayload>("/auth/register", payload);
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  cachedSession = null;
  cachedSessionAt = 0;
  return postJson<LoginResponse, LoginPayload>("/auth/login", payload);
}

export async function refreshSession(): Promise<boolean> {
  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  inFlightRefresh = (async () => {
    try {
      await requestJson<{ refreshed: true }, Record<string, never>>("POST", "/auth/refresh", {
        body: {},
        allowRetryOn401: false
      });
      return true;
    } catch {
      return false;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

export async function logout(): Promise<void> {
  await postJson<{ loggedOut: true }, Record<string, never>>("/auth/logout", {});
  cachedSession = null;
  cachedSessionAt = 0;
}

export async function logoutEverywhere(): Promise<void> {
  await postJson<{ loggedOutAll: true }, Record<string, never>>("/auth/logout-all", {});
  cachedSession = null;
  cachedSessionAt = 0;
}

export async function getAuthSession(): Promise<AuthSession> {
  const now = Date.now();
  if (cachedSession && now - cachedSessionAt < SESSION_CACHE_TTL_MS) {
    return cachedSession;
  }

  if (inFlightSession) {
    return inFlightSession;
  }

  inFlightSession = requestJson<AuthSession>("GET", "/auth/session")
    .then((session) => {
      cachedSession = session;
      cachedSessionAt = Date.now();
      return session;
    })
    .catch((error) => {
      cachedSession = null;
      cachedSessionAt = 0;
      throw error;
    })
    .finally(() => {
      inFlightSession = null;
    });

  return inFlightSession;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<void> {
  const normalizedPayload: UpdateProfilePayload = {
    ...payload,
    websiteUrl: normalizeOptionalUrl(payload.websiteUrl),
    githubUrl: normalizeOptionalUrl(payload.githubUrl),
    linkedinUrl: normalizeOptionalUrl(payload.linkedinUrl)
  };

  await requestJson<unknown, UpdateProfilePayload>("PUT", "/users/me", { body: normalizedPayload });
}

export async function getCurrentUserProfile(): Promise<CurrentUserProfile> {
  return requestJson<CurrentUserProfile>("GET", "/users/me");
}

export async function searchDevelopers(params: SearchDevelopersParams = {}): Promise<DeveloperSearchItem[]> {
  const searchParams = new URLSearchParams();

  if (params.q?.trim()) {
    searchParams.set("q", params.q.trim());
  }

  if (params.skills?.length) {
    searchParams.set("skills", params.skills.join(","));
  }

  if (params.experienceLevel) {
    searchParams.set("experienceLevel", params.experienceLevel);
  }

  if (params.availabilityStatus) {
    searchParams.set("availabilityStatus", params.availabilityStatus);
  }

  if (params.location?.trim()) {
    searchParams.set("location", params.location.trim());
  }

  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const queryString = searchParams.toString();
  const path = queryString ? `/users/developers/search?${queryString}` : "/users/developers/search";
  return requestJson<DeveloperSearchItem[]>("GET", path);
}

export async function getDeveloperPublicProfile(username: string): Promise<PublicDeveloperProfile> {
  return requestJson<PublicDeveloperProfile>("GET", `/users/${encodeURIComponent(username)}`);
}

export async function getProfileCompleteness(): Promise<ProfileCompleteness> {
  return requestJson<ProfileCompleteness>("GET", "/users/me/completeness");
}

export async function createProject(payload: CreateProjectPayload): Promise<ProjectResponse> {
  return requestJson<ProjectResponse, CreateProjectPayload>("POST", "/projects", { body: payload });
}

export async function publishProject(slug: string): Promise<void> {
  await requestJson<unknown, { status: "PUBLISHED" }>("PUT", `/projects/${slug}`, {
    body: { status: "PUBLISHED" }
  });
}

export async function updateProject(slug: string, payload: UpdateProjectPayload): Promise<void> {
  await requestJson<unknown, UpdateProjectPayload>("PUT", `/projects/${slug}`, {
    body: payload
  });
}

export async function listProjects(params: ListProjectsParams = {}): Promise<ProjectListItem[]> {
  const searchParams = new URLSearchParams();

  if (params.category) {
    searchParams.set("category", params.category);
  }
  if (params.techStack?.length) {
    params.techStack.forEach((value) => searchParams.append("techStack", value));
  }
  if (params.industries?.length) {
    params.industries.forEach((value) => searchParams.append("industries", value));
  }
  if (params.pricingType) {
    searchParams.set("pricingType", params.pricingType);
  }
  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }
  if (params.sortBy) {
    searchParams.set("sortBy", params.sortBy);
  }
  if (params.minPrice?.trim()) {
    searchParams.set("minPrice", params.minPrice.trim());
  }
  if (params.maxPrice?.trim()) {
    searchParams.set("maxPrice", params.maxPrice.trim());
  }
  if (params.cursor) {
    searchParams.set("cursor", params.cursor);
  }
  if (params.page) {
    searchParams.set("page", String(params.page));
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const queryString = searchParams.toString();
  const path = queryString ? `/projects?${queryString}` : "/projects";
  return requestJson<ProjectListItem[]>("GET", path);
}

export async function listProjectsPaginated(params: ListProjectsParams = {}): Promise<PaginatedProjectList> {
  const searchParams = new URLSearchParams();

  if (params.category) {
    searchParams.set("category", params.category);
  }
  if (params.techStack?.length) {
    params.techStack.forEach((value) => searchParams.append("techStack", value));
  }
  if (params.industries?.length) {
    params.industries.forEach((value) => searchParams.append("industries", value));
  }
  if (params.pricingType) {
    searchParams.set("pricingType", params.pricingType);
  }
  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }
  if (params.sortBy) {
    searchParams.set("sortBy", params.sortBy);
  }
  if (params.minPrice?.trim()) {
    searchParams.set("minPrice", params.minPrice.trim());
  }
  if (params.maxPrice?.trim()) {
    searchParams.set("maxPrice", params.maxPrice.trim());
  }
  if (params.cursor) {
    searchParams.set("cursor", params.cursor);
  }
  if (params.page) {
    searchParams.set("page", String(params.page));
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const queryString = searchParams.toString();
  const path = queryString ? `/projects?${queryString}` : "/projects";
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as
    | { success?: boolean; data?: ProjectListItem[]; meta?: CursorPageMeta }
    | ProjectListItem[];

  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: { hasNext: false }
    };
  }

  return {
    items: Array.isArray(payload.data) ? payload.data : [],
    meta: payload.meta ?? { hasNext: false }
  };
}

export async function getProjectBySlug(slug: string): Promise<ProjectDetail> {
  return requestJson<ProjectDetail>("GET", `/projects/${slug}`);
}

export async function getSavedProjects(): Promise<SavedProjectEntry[]> {
  return requestJson<SavedProjectEntry[]>("GET", "/users/me/saved");
}

export async function getMyProjects(): Promise<MyProjectListItem[]> {
  return requestJson<MyProjectListItem[]>("GET", "/users/me/projects");
}

export async function getMessageThreads(): Promise<ThreadSummary[]> {
  return requestJson<ThreadSummary[]>("GET", "/messages/threads");
}

export async function getMessageQuickReplies(threadId?: string): Promise<string[]> {
  const searchParams = new URLSearchParams();
  if (threadId) {
    searchParams.set("threadId", threadId);
  }

  const queryString = searchParams.toString();
  const path = queryString ? `/messages/quick-replies?${queryString}` : "/messages/quick-replies";
  return requestJson<string[]>("GET", path);
}

export async function createMessageThread(payload: CreateThreadPayload): Promise<CreatedThread> {
  return requestJson<CreatedThread, CreateThreadPayload>("POST", "/messages/threads", { body: payload });
}

export async function getThreadMessages(threadId: string, cursor?: string, limit = 30): Promise<PaginatedThreadMessages> {
  const searchParams = new URLSearchParams();
  if (cursor) {
    searchParams.set("cursor", cursor);
  }
  if (limit) {
    searchParams.set("limit", String(limit));
  }

  const queryString = searchParams.toString();
  const path = queryString
    ? `/messages/threads/${encodeURIComponent(threadId)}?${queryString}`
    : `/messages/threads/${encodeURIComponent(threadId)}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as
    | { success?: boolean; data?: ThreadMessage[]; meta?: MessagePageMeta }
    | ThreadMessage[];

  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: { hasNext: false }
    };
  }

  return {
    items: Array.isArray(payload.data) ? payload.data : [],
    meta: payload.meta ?? { hasNext: false }
  };
}

export async function sendThreadMessage(threadId: string, content: string): Promise<ThreadMessage> {
  return requestJson<ThreadMessage, { content: string }>("POST", `/messages/threads/${encodeURIComponent(threadId)}`, {
    body: { content }
  });
}

export async function markThreadRead(threadId: string): Promise<{ updated: number }> {
  return requestJson<{ updated: number }, Record<string, never>>("PUT", `/messages/threads/${encodeURIComponent(threadId)}/read`, {
    body: {}
  });
}

export async function trackProjectInquiry(slug: string, payload: ProjectInquiryPayload): Promise<{ tracked: true; inquiryType: string; inquiryCount: number; messageAccepted: boolean }> {
  return requestJson<{ tracked: true; inquiryType: string; inquiryCount: number; messageAccepted: boolean }, ProjectInquiryPayload>(
    "POST",
    `/projects/${encodeURIComponent(slug)}/inquiry`,
    { body: payload }
  );
}

export async function getNotifications(limit = 20): Promise<NotificationItem[]> {
  return requestJson<NotificationItem[]>("GET", `/notifications?limit=${limit}`);
}

export async function uploadMediaFile(file: File, options?: UploadMediaOptions): Promise<{ url: string; publicId: string }> {
  const csrfToken = readCookie(CSRF_COOKIE_NAME);
  const formData = new FormData();
  formData.append("file", file);

  if (options?.projectId) {
    formData.append("projectId", options.projectId);
  }
  if (options?.mediaType) {
    formData.append("mediaType", options.mediaType);
  }
  if (options?.caption) {
    formData.append("caption", options.caption);
  }

  const response = await fetch(`${API_BASE_URL}/media/upload`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...(csrfToken ? { "x-csrf-token": csrfToken } : {})
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as { url: string; publicId: string } | ApiEnvelope<{ url: string; publicId: string }>;

  if (typeof payload === "object" && payload !== null && "success" in payload && "data" in payload) {
    return (payload as ApiEnvelope<{ url: string; publicId: string }>).data;
  }

  return payload as { url: string; publicId: string };
}
