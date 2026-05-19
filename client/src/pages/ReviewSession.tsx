import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { review as reviewApi, sessions as sessionsApi } from "../api/client";
import { ApiError } from "../api/client";
import type { Flashcard, UserSession } from "../api/types";

const RATINGS = [
  { value: 0, label: "Blackout", color: "bg-red-100 text-red-700 hover:bg-red-200" },
  { value: 2, label: "Hard", color: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
  { value: 3, label: "Good", color: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" },
  { value: 5, label: "Easy", color: "bg-green-100 text-green-700 hover:bg-green-200" },
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
      if (err instanceof ApiError && err.status === 404) {
        setDone(true);
      } else {
        setError(err instanceof ApiError ? err.message : "Failed to fetch card");
      }
    }
  }, [deckId]);

  useEffect(() => {
    sessionsApi
      .start()
      .then(setSession)
      .catch(() => null);

    fetchNext();

    return () => {
      setSession((s) => {
        if (s) sessionsApi.end(s.id).catch(() => null);
        return null;
      });
    };
  }, [fetchNext]);

  // Ping session every 30 s
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      sessionsApi.ping(session.id).catch(() => null);
    }, 30_000);
    return () => clearInterval(interval);
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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800">All caught up!</h2>
        <p className="text-gray-500 text-center">No more cards due for review in this deck.</p>
        <button
          onClick={() => navigate(`/decks/${deckId}`)}
          className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-6 py-2.5 rounded-xl transition-colors"
        >
          Back to deck
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-500">{error}</p>
        <button onClick={() => navigate(`/decks/${deckId}`)} className="text-primary-600 hover:underline">
          Back to deck
        </button>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(`/decks/${deckId}`)}
          className="text-gray-400 hover:text-gray-600 text-lg"
        >
          ←
        </button>
        <span className="font-medium text-gray-700">Review session</span>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
        {/* Card */}
        <div className="w-full max-w-lg">
          {/* Front */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center min-h-[140px] flex items-center justify-center">
            <p className="text-xl font-semibold text-gray-900">{card.front_text}</p>
          </div>

          {/* Back / reveal */}
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="w-full mt-3 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-xl transition-colors"
            >
              Show answer
            </button>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center mt-3 min-h-[100px] flex items-center justify-center">
                <p className="text-gray-700 text-lg">{card.back_text}</p>
              </div>

              <p className="text-center text-sm text-gray-400 mt-4 mb-2">How well did you recall?</p>
              <div className="grid grid-cols-4 gap-2">
                {RATINGS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => handleRate(r.value)}
                    disabled={submitting}
                    className={`rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${r.color}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
