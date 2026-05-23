import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { review as reviewApi, sessions as sessionsApi } from "../api/client";
import { ApiError } from "../api/client";
import type { Flashcard, UserSession } from "../api/types";

const RATINGS = [
  { value: 0, label: "Blackout", sub: "No memory", bg: "bg-red-50 hover:bg-red-100 border-red-200 text-red-700" },
  { value: 2, label: "Hard",     sub: "With effort", bg: "bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700" },
  { value: 3, label: "Good",     sub: "Some hesitation", bg: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700" },
  { value: 5, label: "Easy",     sub: "Perfect recall", bg: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700" },
];

export default function ReviewSession() {
  const { id } = useParams<{ id: string }>();
  const deckId = Number(id);
  const navigate = useNavigate();

  const [card, setCard] = useState<Flashcard | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<UserSession | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchNext = useCallback(async () => {
    setRevealed(false);
    setError(null);
    try {
      const next = await reviewApi.next(deckId);
      setCard(next);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setDone(true);
      else setError(err instanceof ApiError ? err.message : "Failed to fetch card");
    }
  }, [deckId]);

  useEffect(() => {
    sessionsApi.start().then(setSession).catch(() => null);
    fetchNext();
    return () => {
      setSession((s) => {
        if (s) sessionsApi.end(s.id).catch(() => null);
        return null;
      });
    };
  }, [fetchNext]);

  useEffect(() => {
    if (!session) return;
    const t = setInterval(() => sessionsApi.ping(session.id).catch(() => null), 30_000);
    return () => clearInterval(t);
  }, [session]);

  async function handleRate(rating: number) {
    if (!card || submitting) return;
    setSubmitting(true);
    try {
      await reviewApi.submit(deckId, card.id, { rating });
      await fetchNext();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-5 px-4">
        <div className="text-6xl">🎉</div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800">All caught up!</h2>
          <p className="text-slate-500 mt-1">No more cards due for review.</p>
        </div>
        <button onClick={() => navigate(`/decks/${deckId}`)} className="btn-primary">
          Back to deck
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-500">{error}</p>
        <button onClick={() => navigate(`/decks/${deckId}`)} className="btn-secondary">
          Back to deck
        </button>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-primary-500 rounded-full animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(`/decks/${deckId}`)}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 -ml-1 rounded-lg hover:bg-slate-100"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="font-semibold text-slate-700">Review</span>
        </div>
      </header>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-4">

          {/* Front */}
          <div className="card p-10 text-center">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Front</p>
            <p className="text-2xl font-semibold text-slate-900 leading-snug">{card.front_text}</p>
          </div>

          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="btn-primary w-full py-3 text-base"
            >
              Show answer
            </button>
          ) : (
            <>
              {/* Back */}
              <div className="card p-8 text-center border-primary-100 bg-primary-50/30">
                <p className="text-xs font-medium text-primary-400 uppercase tracking-widest mb-4">Answer</p>
                <p className="text-xl text-slate-800 leading-snug">{card.back_text}</p>
              </div>

              {/* Rating */}
              <div>
                <p className="text-center text-sm text-slate-400 mb-3">How well did you recall?</p>
                <div className="grid grid-cols-4 gap-2">
                  {RATINGS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => handleRate(r.value)}
                      disabled={submitting}
                      className={`rounded-xl border py-3 text-sm font-semibold transition-colors disabled:opacity-40 ${r.bg}`}
                    >
                      <span className="block">{r.label}</span>
                      <span className="block text-xs font-normal opacity-70 mt-0.5">{r.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
