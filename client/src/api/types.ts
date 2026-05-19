// Mirrors app/schemas.py

export interface User {
  id: number;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface Deck {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
}

export interface Flashcard {
  id: number;
  deck_id: number;
  front_text: string;
  back_text: string;
  next_review: string;
  easiness_factor: number;
  interval: number;
  repetitions: number;
}

export interface ReviewResponse {
  card: Flashcard;
  next_review: string;
  interval: number;
}

export interface UserSession {
  id: number;
  user_id: number;
  started_at: string;
  last_ping_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

export interface UserStats {
  user_id: number;
  email: string;
  is_active: boolean;
  created_at: string;
  total_cards: number;
  new_cards: number;
  learning_cards: number;
  mastered_cards: number;
  total_reviews: number;
  total_time_seconds: number;
  last_active: string | null;
}

// Request bodies
export interface DeckCreate {
  name: string;
  description?: string;
}

export interface DeckUpdate {
  name?: string;
  description?: string;
}

export interface FlashcardCreate {
  front_text: string;
  back_text: string;
}

export interface FlashcardUpdate {
  front_text?: string;
  back_text?: string;
}

export interface ReviewSubmit {
  rating: number;
}
