export const API_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:8000';

const TOKEN_KEY = 'auth_token';

function buildHeaders(extra?: HeadersInit, multipart = false): HeadersInit {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (!multipart) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return { ...headers, ...(extra as Record<string, string> | undefined) };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    clearAuth();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const data = text ? safeParseJSON(text) : {};

  if (!res.ok) {
    const detail = (data && (data.detail || data.message)) || `Request failed (${res.status})`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }

  return data as T;
}

function safeParseJSON(text: string): any {
  try { return JSON.parse(text); } catch { return {}; }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: buildHeaders(options.headers),
  });
  return handleResponse<T>(res);
}

export async function apiMultipart<T>(path: string, formData: FormData, method: 'POST' | 'PUT' = 'POST'): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: buildHeaders(undefined, true),
    body: formData,
  });
  return handleResponse<T>(res);
}

export async function chat<T>(secretKey: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify(body),
  });
  // /chat does not use the user JWT so we don't auto-redirect on 401.
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? safeParseJSON(text) : {};
  if (!res.ok) {
    const detail = (data && (data.detail || data.message)) || `Request failed (${res.status})`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return data as T;
}

/* ── Auth storage ── */

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('user_email');
}

export function saveEmail(email: string) {
  localStorage.setItem('user_email', email);
}

export function getEmail(): string | null {
  return localStorage.getItem('user_email');
}

/* ── JWT helpers ── */

export function getUserId(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/* ── Types ── */

export type LoginResponse = { token: string };

export type UserResponse = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};
