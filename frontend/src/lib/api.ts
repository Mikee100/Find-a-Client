const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/+$/, "");
const CSRF_COOKIE_NAME = process.env.NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME ?? "csrf_token";

interface ApiErrorBody {
  message?: string | string[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
let inFlightRefresh: Promise<boolean> | null = null;

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

interface SavedProjectEntry {
  id: string;
  project: {
    id: string;
    slug: string;
    title: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  };
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
  currency?: string;
  demoUrl?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
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
  options?: { body?: TBody; allowRetryOn401?: boolean }
): Promise<TResponse> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const hasBody = options?.body !== undefined;
  const allowRetryOn401 = options?.allowRetryOn401 ?? true;
  const csrfToken = readCookie(CSRF_COOKIE_NAME);
  const isMutation = method === "POST" || method === "PUT" || method === "DELETE";

  const send = async (): Promise<Response> =>
    fetch(`${API_BASE_URL}${normalizedPath}`, {
      method,
      credentials: "include",
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(isMutation && csrfToken ? { "x-csrf-token": csrfToken } : {})
      },
      body: hasBody ? JSON.stringify(options?.body) : undefined
    });

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
  return postJson<RegisterResponse, RegisterPayload>("/auth/register", payload);
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
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
}

export async function getAuthSession(): Promise<AuthSession> {
  return requestJson<AuthSession>("GET", "/auth/session");
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<void> {
  await requestJson<unknown, UpdateProfilePayload>("PUT", "/users/me", { body: payload });
}

export async function createProject(payload: CreateProjectPayload): Promise<ProjectResponse> {
  return requestJson<ProjectResponse, CreateProjectPayload>("POST", "/projects", { body: payload });
}

export async function publishProject(slug: string): Promise<void> {
  await requestJson<unknown, { status: "PUBLISHED" }>("PUT", `/projects/${slug}`, {
    body: { status: "PUBLISHED" }
  });
}

export async function getSavedProjects(): Promise<SavedProjectEntry[]> {
  return requestJson<SavedProjectEntry[]>("GET", "/users/me/saved");
}

export async function getMessageThreads(): Promise<ThreadSummary[]> {
  return requestJson<ThreadSummary[]>("GET", "/messages/threads");
}

export async function getNotifications(limit = 20): Promise<NotificationItem[]> {
  return requestJson<NotificationItem[]>("GET", `/notifications?limit=${limit}`);
}
