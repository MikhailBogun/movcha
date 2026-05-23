import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { decks as decksApi } from "../api/client";
import { ApiError } from "../api/client";
import type { Deck } from "../api/types";
import AppShell from "../components/AppShell";
import CreateDeckModal from "../components/CreateDeckModal";

export default function Dashboard() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    decksApi
      .list()
      .then(setDecks)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load decks"))
      .finally(() => setLoading(false));
  }, []);

  function handleDeckCreated(deck: Deck) {
    setDecks((prev) => [...prev, deck]);
    setShowCreate(false);
  }

  async function handleDelete(id: number) {
    await decksApi.delete(id);
    setDecks((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Decks</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + New deck
        </button>
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="card p-5 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="card p-6 text-center text-red-500">{error}</div>
      )}

      {!loading && !error && decks.length === 0 && (
        <div className="card p-16 text-center">
          <p className="text-4xl mb-4">🗂️</p>
          <p className="font-medium text-slate-700 mb-1">No decks yet</p>
          <p className="text-sm text-slate-400">Create your first deck to get started</p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {decks.map((deck) => (
          <li
            key={deck.id}
            className="card px-5 py-4 flex items-center gap-4 hover:shadow-card-hover transition-shadow group"
          >
            <Link to={`/decks/${deck.id}`} className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 truncate group-hover:text-primary-600 transition-colors">
                {deck.name}
              </p>
              {deck.description && (
                <p className="text-sm text-slate-400 truncate mt-0.5">{deck.description}</p>
              )}
            </Link>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={`/decks/${deck.id}/review`}
                className="text-sm bg-primary-50 text-primary-700 hover:bg-primary-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                Study
              </Link>
              <button
                onClick={() => handleDelete(deck.id)}
                className="p-1.5 text-slate-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
                aria-label="Delete deck"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>

      {showCreate && (
        <CreateDeckModal onCreated={handleDeckCreated} onClose={() => setShowCreate(false)} />
      )}
    </AppShell>
  );
}
