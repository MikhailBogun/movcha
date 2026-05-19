import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { cards as cardsApi, decks as decksApi } from "../api/client";
import { ApiError } from "../api/client";
import type { Deck, Flashcard } from "../api/types";
import { useVoiceInput } from "../hooks/useVoiceInput";

export default function DeckView() {
  const { id } = useParams<{ id: string }>();
  const deckId = Number(id);
  const navigate = useNavigate();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cardList, setCardList] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add card form
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [activeVoiceField, setActiveVoiceField] = useState<"front" | "back" | null>(null);
  const activeVoiceFieldRef = useRef<"front" | "back" | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const { status: voiceStatus, start: startVoice, stop: stopVoice, isSupported } =
    useVoiceInput({
      onTranscript: (text) => {
        if (activeVoiceFieldRef.current === "front") setFront((p) => (p ? p + " " + text : text));
        else if (activeVoiceFieldRef.current === "back") setBack((p) => (p ? p + " " + text : text));
        activeVoiceFieldRef.current = null;
        setActiveVoiceField(null);
      },
    });

  useEffect(() => {
    Promise.all([decksApi.get(deckId), cardsApi.list(deckId)])
      .then(([d, c]) => {
        setDeck(d);
        setCardList(c);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load deck"))
      .finally(() => setLoading(false));
  }, [deckId]);

  function handleVoice(field: "front" | "back") {
    if (voiceStatus === "listening") {
      stopVoice();
      activeVoiceFieldRef.current = null;
      setActiveVoiceField(null);
      return;
    }
    activeVoiceFieldRef.current = field;
    setActiveVoiceField(field);
    startVoice();
  }

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    setAddError(null);
    setAdding(true);
    try {
      const card = await cardsApi.create(deckId, {
        front_text: front.trim(),
        back_text: back.trim(),
      });
      setCardList((prev) => [...prev, card]);
      setFront("");
      setBack("");
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : "Failed to add card");
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteCard(cardId: number) {
    await cardsApi.delete(deckId, cardId);
    setCardList((prev) => prev.filter((c) => c.id !== cardId));
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading…</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="text-gray-400 hover:text-gray-600 text-lg">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">{deck?.name}</h1>
          {deck?.description && (
            <p className="text-xs text-gray-400 truncate">{deck.description}</p>
          )}
        </div>
        <Link
          to={`/decks/${deckId}/review`}
          className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Study
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Add card form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Add card</h2>
          <form onSubmit={handleAddCard} className="space-y-3">
            <VoiceField
              label="Front"
              value={front}
              onChange={setFront}
              onVoice={() => handleVoice("front")}
              listening={voiceStatus === "listening" && activeVoiceField === "front"}
              isSupported={isSupported}
            />
            <VoiceField
              label="Back"
              value={back}
              onChange={setBack}
              onVoice={() => handleVoice("back")}
              listening={voiceStatus === "listening" && activeVoiceField === "back"}
              isSupported={isSupported}
            />
            {addError && <p className="text-sm text-red-600">{addError}</p>}
            <button
              type="submit"
              disabled={adding || !front.trim() || !back.trim()}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg py-2 transition-colors"
            >
              {adding ? "Adding…" : "Add card"}
            </button>
          </form>
        </div>

        {/* Card list */}
        <div>
          <p className="text-sm text-gray-400 mb-3">{cardList.length} card{cardList.length !== 1 ? "s" : ""}</p>
          <ul className="space-y-2">
            {cardList.map((card) => (
              <li
                key={card.id}
                className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{card.front_text}</p>
                  <p className="text-sm text-gray-500 truncate">{card.back_text}</p>
                </div>
                <button
                  onClick={() => handleDeleteCard(card.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors text-sm shrink-0 mt-0.5"
                  aria-label="Delete card"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          {cardList.length === 0 && (
            <p className="text-center text-gray-400 py-8">No cards yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}

interface VoiceFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onVoice: () => void;
  listening: boolean;
  isSupported: boolean;
}

function VoiceField({ label, value, onChange, onVoice, listening, isSupported }: VoiceFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {isSupported && (
          <button
            type="button"
            onClick={onVoice}
            title={listening ? "Stop recording" : "Speak"}
            className={`px-3 rounded-lg border text-sm transition-colors ${
              listening
                ? "bg-red-50 border-red-300 text-red-600 animate-pulse"
                : "border-gray-300 text-gray-500 hover:bg-gray-50"
            }`}
          >
            🎤
          </button>
        )}
      </div>
    </div>
  );
}
