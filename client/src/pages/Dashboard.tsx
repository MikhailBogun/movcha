import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { decks as decksApi } from "../api/client";
import type { Deck } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import CreateDeckModal from "../components/CreateDeckModal";

export default function Dashboard() {
  const { user, logout } = useAuth();
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="text-lg font-bold text-primary-600">Movcha</span>
        <div className="flex items-center gap-3">
          {user?.is_admin && (
            <Link
              to="/admin"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Admin
            </Link>
          )}
          <span className="text-sm text-gray-500">{user?.email}</span>
          <button
            onClick={logout}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Decks</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New deck
          </button>
        </div>

        {loading && (
          <p className="text-center text-gray-400 py-16">Loading…</p>
        )}
        {error && (
          <p className="text-center text-red-500 py-16">{error}</p>
        )}
        {!loading && !error && decks.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🗂️</p>
            <p>No decks yet. Create your first one!</p>
          </div>
        )}

        <ul className="space-y-3">
          {decks.map((deck) => (
            <li
              key={deck.id}
              className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between hover:border-primary-300 transition-colors"
            >
              <Link
                to={`/decks/${deck.id}`}
                className="flex-1 min-w-0"
              >
                <p className="font-medium text-gray-900 truncate">{deck.name}</p>
                {deck.description && (
                  <p className="text-sm text-gray-400 truncate mt-0.5">
                    {deck.description}
                  </p>
                )}
              </Link>
              <div className="flex items-center gap-2 ml-4">
                <Link
                  to={`/decks/${deck.id}/review`}
                  className="text-sm bg-primary-50 text-primary-700 hover:bg-primary-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  Study
                </Link>
                <button
                  onClick={() => handleDelete(deck.id)}
                  className="text-sm text-gray-400 hover:text-red-500 transition-colors px-2"
                  aria-label="Delete deck"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>

      {showCreate && (
        <CreateDeckModal
          onCreated={handleDeckCreated}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
