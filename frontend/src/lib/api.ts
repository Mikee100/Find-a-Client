import { AuthTokens, clearTokens, readTokens, saveTokens } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4311";

interface ApiErrorBody {
  message?: string | string[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  username: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterResponse extends AuthTokens {
  userId: string;
}

type TokenResponse = AuthTokens;

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

export interface ProjectSummary {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  longDescription?: string;
  category: ProjectCategory;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  techStack: string[];
  industries: string[];
  pricingType: PricingType;
  price: string | number | null;
  currency: string;
  authorId: string;
  thumbnailUrl?: string | null;
  demoUrl?: string | null;
  videoUrl?: string | null;
  averageRating?: number;
  viewCount?: number;
  likeCount?: number;
  isFeatured?: boolean;
  createdAt?: string;
}

export interface ProjectDetail extends ProjectSummary {
  longDescription: string;
  author?: PublicProfile;
  media?: Array<{
    id: string;
    type: "IMAGE" | "VIDEO" | "SCREENSHOT";
    url: string;
    caption?: string | null;
  }>;
}

export interface PublicProfile {
  id: string;
  email?: string;
  username: string;
  fullName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  role: "DEVELOPER" | "CLIENT" | "ADMIN";
  skills: string[];
  location?: string | null;
  websiteUrl?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  isVerified?: boolean;
  projects?: ProjectSummary[];
}

export interface SavedProjectEntry {
  id: string;
  project: ProjectSummary;
}

export interface ThreadSummary {
  id: string;
  projectId: string | null;
  updatedAt: string;
  unreadCount: number;
  messages: Array<{
    id: string;
    content: string;
    createdAt: string;
  }>;
}

export interface CreateThreadPayload {
  recipientId: string;
  projectId?: string;
  initialMessage?: string;
}

export interface CreatedThread {
  id: string;
  participantAId: string;
  participantBId: string;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

export interface UpdateProfilePayload {
  fullName?: string;
  bio?: string;
  skills?: string[];
  location?: string;
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
  demoUrl?: string;
}

export interface ListProjectsParams {
  search?: string;
  category?: ProjectCategory;
  pricingType?: PricingType;
  minPrice?: string;
  maxPrice?: string;
  sortBy?: "newest" | "popular" | "price_asc" | "price_desc";
  limit?: string;
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
  } catch {
    // No-op: fallback message below.
  }

  return `Request failed (${response.status})`;
}

async function requestJson<TResponse, TBody = unknown>(
  method: HttpMethod,
  path: string,
  options?: { body?: TBody; token?: string }
): Promise<TResponse> {
  const hasBody = options?.body !== undefined;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: hasBody ? JSON.stringify(options?.body) : undefined
  });

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
  body: TBody,
  token?: string
): Promise<TResponse> {
  return requestJson<TResponse, TBody>("POST", path, { body, token });
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const data = await postJson<RegisterResponse, RegisterPayload>("/auth/register", payload);
  saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data;
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const data = await postJson<TokenResponse, LoginPayload>("/auth/login", payload);
  saveTokens(data);
  return data;
}

export async function refreshSession(): Promise<TokenResponse | null> {
  const tokens = readTokens();
  if (!tokens?.refreshToken) {
    return null;
  }

  try {
    const data = await postJson<TokenResponse, { refreshToken: string }>("/auth/refresh", {
      refreshToken: tokens.refreshToken
    });
    saveTokens(data);
    return data;
  } catch {
    clearTokens();
    return null;
  }
}

export async function logout(): Promise<void> {
  const tokens = readTokens();
  if (!tokens?.refreshToken) {
    clearTokens();
    return;
  }

  try {
    await postJson<{ loggedOut: true }, { refreshToken: string }>(
      "/auth/logout",
      { refreshToken: tokens.refreshToken },
      tokens.accessToken
    );
  } finally {
    clearTokens();
  }
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<void> {
  const tokens = readTokens();
  if (!tokens?.accessToken) {
    throw new Error("You must be signed in.");
  }

  await requestJson<unknown, UpdateProfilePayload>("PUT", "/users/me", {
    body: payload,
    token: tokens.accessToken
  });
}

export async function createProject(payload: CreateProjectPayload): Promise<ProjectResponse> {
  const tokens = readTokens();
  if (!tokens?.accessToken) {
    throw new Error("You must be signed in.");
  }

  return requestJson<ProjectResponse, CreateProjectPayload>("POST", "/projects", {
    body: payload,
    token: tokens.accessToken
  });
}

export async function publishProject(slug: string): Promise<void> {
  const tokens = readTokens();
  if (!tokens?.accessToken) {
    throw new Error("You must be signed in.");
  }

  await requestJson<unknown, { status: "PUBLISHED" }>("PUT", `/projects/${slug}`, {
    body: { status: "PUBLISHED" },
    token: tokens.accessToken
  });
}

export async function listProjects(params: ListProjectsParams = {}): Promise<ProjectSummary[]> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return requestJson<ProjectSummary[]>("GET", `/projects${suffix}`);
}

export async function getProject(slug: string): Promise<ProjectDetail> {
  return requestJson<ProjectDetail>("GET", `/projects/${slug}`);
}

export async function searchProjects(params: { q?: string; category?: string; tech?: string } = {}): Promise<ProjectSummary[]> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return requestJson<ProjectSummary[]>("GET", `/search${suffix}`);
}

export async function getPublicProfile(username: string): Promise<PublicProfile> {
  return requestJson<PublicProfile>("GET", `/users/${username}`);
}

export async function getSavedProjects(): Promise<SavedProjectEntry[]> {
  const tokens = readTokens();
  if (!tokens?.accessToken) {
    throw new Error("You must be signed in.");
  }

  return requestJson<SavedProjectEntry[]>("GET", "/users/me/saved", {
    token: tokens.accessToken
  });
}

export async function getMessageThreads(): Promise<ThreadSummary[]> {
  const tokens = readTokens();
  if (!tokens?.accessToken) {
    throw new Error("You must be signed in.");
  }

  return requestJson<ThreadSummary[]>("GET", "/messages/threads", {
    token: tokens.accessToken
  });
}

export async function createMessageThread(payload: CreateThreadPayload): Promise<CreatedThread> {
  const tokens = readTokens();
  if (!tokens?.accessToken) {
    throw new Error("You must be signed in.");
  }

  return requestJson<CreatedThread, CreateThreadPayload>("POST", "/messages/threads", {
    body: payload,
    token: tokens.accessToken
  });
}

export async function getNotifications(limit = 20): Promise<NotificationItem[]> {
  const tokens = readTokens();
  if (!tokens?.accessToken) {
    throw new Error("You must be signed in.");
  }

  return requestJson<NotificationItem[]>("GET", `/notifications?limit=${limit}`, {
    token: tokens.accessToken
  });
}
