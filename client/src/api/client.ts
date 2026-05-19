import type {
  Deck,
  DeckCreate,
  DeckUpdate,
  Flashcard,
  FlashcardCreate,
  FlashcardUpdate,
  ReviewResponse,
  ReviewSubmit,
  Token,
  User,
  UserSession,
  UserStats,
} from "./types";

const BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function parseDetail(detail: unknown, fallback: string): string {
  if (Array.isArray(detail))
    return detail.map((e: { msg: string }) => e.msg).join("; ");
  return (detail as string | undefined) ?? fallback;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, parseDetail(body.detail, res.statusText));
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// --- Auth ---

export async function register(email: string, password: string): Promise<User> {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string): Promise<Token> {
  const form = new URLSearchParams({ username: email, password });
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, parseDetail(body.detail, res.statusText));
  }
  return res.json();
}

// --- Decks ---

export const decks = {
  list: (): Promise<Deck[]> => request("/decks/"),
  get: (id: number): Promise<Deck> => request(`/decks/${id}`),
  create: (data: DeckCreate): Promise<Deck> =>
    request("/decks/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: DeckUpdate): Promise<Deck> =>
    request(`/decks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number): Promise<void> =>
    request(`/decks/${id}`, { method: "DELETE" }),
};

// --- Cards ---

export const cards = {
  list: (deckId: number): Promise<Flashcard[]> =>
    request(`/decks/${deckId}/cards/`),
  get: (deckId: number, cardId: number): Promise<Flashcard> =>
    request(`/decks/${deckId}/cards/${cardId}`),
  create: (deckId: number, data: FlashcardCreate): Promise<Flashcard> =>
    request(`/decks/${deckId}/cards/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (
    deckId: number,
    cardId: number,
    data: FlashcardUpdate,
  ): Promise<Flashcard> =>
    request(`/decks/${deckId}/cards/${cardId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (deckId: number, cardId: number): Promise<void> =>
    request(`/decks/${deckId}/cards/${cardId}`, { method: "DELETE" }),
};

// --- Review ---

export const review = {
  next: (deckId: number): Promise<Flashcard> =>
    request(`/decks/${deckId}/review/next`),
  submit: (deckId: number, cardId: number, data: ReviewSubmit): Promise<ReviewResponse> =>
    request(`/decks/${deckId}/review/${cardId}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// --- Sessions ---

export const sessions = {
  start: (): Promise<UserSession> =>
    request("/sessions/start", { method: "POST" }),
  ping: (id: number): Promise<UserSession> =>
    request(`/sessions/${id}/ping`, { method: "POST" }),
  end: (id: number): Promise<UserSession> =>
    request(`/sessions/${id}/end`, { method: "POST" }),
};

// --- Admin ---

export const admin = {
  users: (): Promise<UserStats[]> => request("/admin/users"),
  userStats: (id: number): Promise<UserStats> => request(`/admin/users/${id}`),
};

export { ApiError };
