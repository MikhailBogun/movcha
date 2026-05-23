import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { cards as cardsApi, decks as decksApi } from "../api/client";
import { ApiError } from "../api/client";
import type { Deck, Flashcard } from "../api/types";
import AppShell from "../components/AppShell";
import DictionaryPanel from "../components/DictionaryPanel";
import { useDictionary } from "../hooks/useDictionary";
import { useVoiceInput } from "../hooks/useVoiceInput";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CardPair {
  id: number;
  front: string;
  back: string;
}

interface ActiveVoice {
  pairId: number;
  field: "front" | "back";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DeckView() {
  const { id } = useParams<{ id: string }>();
  const deckId = Number(id);
  const navigate = useNavigate();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cardList, setCardList] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Multi-card pairs
  const [pairs, setPairs] = useState<CardPair[]>([{ id: Date.now(), front: "", back: "" }]);
  const [activePairId, setActivePairId] = useState<number>(0);
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Voice
  const activeVoiceRef = useRef<ActiveVoice | null>(null);
  const [activeVoice, setActiveVoice] = useState<ActiveVoice | null>(null);

  // Dictionary watches the front of whichever pair is active
  const activeFront = pairs.find((p) => p.id === activePairId)?.front ?? pairs[0].front;
  const { result: dictResult, loading: dictLoading } = useDictionary(activeFront);

  const { status: voiceStatus, start: startVoice, stop: stopVoice, isSupported } =
    useVoiceInput({
      onTranscript: (text) => {
        if (!activeVoiceRef.current) return;
        const { pairId, field } = activeVoiceRef.current;
        updatePair(pairId, field, text);
        activeVoiceRef.current = null;
        setActiveVoice(null);
      },
      onInterim: (text) => {
        if (!activeVoiceRef.current) return;
        const { pairId, field } = activeVoiceRef.current;
        updatePair(pairId, field, text);
      },
    });

  useEffect(() => {
    Promise.all([decksApi.get(deckId), cardsApi.list(deckId)])
      .then(([d, c]) => { setDeck(d); setCardList(c); })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load deck"))
      .finally(() => setLoading(false));
  }, [deckId]);

  // Pair helpers
  function updatePair(id: number, field: "front" | "back", value: string) {
    setPairs((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  function addPair() {
    const newId = Date.now();
    setPairs((prev) => [...prev, { id: newId, front: "", back: "" }]);
  }

  function removePair(id: number) {
    setPairs((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  }

  // Voice
  function handleVoice(pairId: number, field: "front" | "back") {
    if (voiceStatus === "listening") {
      stopVoice();
      activeVoiceRef.current = null;
      setActiveVoice(null);
      return;
    }
    // Clear the target field and start fresh
    updatePair(pairId, field, "");
    activeVoiceRef.current = { pairId, field };
    setActiveVoice({ pairId, field });
    setActivePairId(pairId);
    startVoice();
  }

  // Submit all valid pairs
  async function handleAddCards(e: React.FormEvent) {
    e.preventDefault();
    const valid = pairs.filter((p) => p.front.trim() && p.back.trim());
    if (!valid.length) return;
    setAddError(null);
    setAdding(true);
    try {
      const created = await Promise.all(
        valid.map((p) =>
          cardsApi.create(deckId, { front_text: p.front.trim(), back_text: p.back.trim() }),
        ),
      );
      setCardList((prev) => [...prev, ...created]);
      setPairs([{ id: Date.now(), front: "", back: "" }]);
      setActivePairId(0);
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : "Failed to add cards");
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteCard(cardId: number) {
    await cardsApi.delete(deckId, cardId);
    setCardList((prev) => prev.filter((c) => c.id !== cardId));
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-primary-500 rounded-full animate-spin" />
    </div>
  );
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>;

  const canSubmit = pairs.some((p) => p.front.trim() && p.back.trim());
  const validCount = pairs.filter((p) => p.front.trim() && p.back.trim()).length;

  return (
    <AppShell
      back="/"
      actions={
        <Link to={`/decks/${deckId}/review`} className="btn-primary">
          Study
        </Link>
      }
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{deck?.name}</h1>
        {deck?.description && <p className="text-sm text-slate-400 mt-0.5">{deck.description}</p>}
      </div>

      <div className="space-y-6">
        {/* Add cards form */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Add cards</h2>
          <form onSubmit={handleAddCards} className="space-y-4">
            {pairs.map((pair, idx) => (
              <div key={pair.id} className="space-y-2">
                {pairs.length > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">Card {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removePair(pair.id)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {/* Front */}
                <div>
                  <VoiceField
                    label="Front"
                    value={pair.front}
                    onChange={(v) => { updatePair(pair.id, "front", v); setActivePairId(pair.id); }}
                    onVoice={() => handleVoice(pair.id, "front")}
                    listening={voiceStatus === "listening" && activeVoice?.pairId === pair.id && activeVoice.field === "front"}
                    isSupported={isSupported}
                  />
                  {activePairId === pair.id && (
                    <DictionaryPanel
                      result={dictResult}
                      loading={dictLoading}
                      onPickTranslation={(t) => updatePair(pair.id, "back", t)}
                      onPickSuggestion={(s) => { updatePair(pair.id, "front", s); setActivePairId(pair.id); }}
                    />
                  )}
                </div>

                {/* Back */}
                <VoiceField
                  label="Back"
                  value={pair.back}
                  onChange={(v) => updatePair(pair.id, "back", v)}
                  onVoice={() => handleVoice(pair.id, "back")}
                  listening={voiceStatus === "listening" && activeVoice?.pairId === pair.id && activeVoice.field === "back"}
                  isSupported={isSupported}
                />

                {idx < pairs.length - 1 && <hr className="border-gray-100 mt-2" />}
              </div>
            ))}

            {addError && <p className="text-sm text-red-600">{addError}</p>}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={addPair} className="btn-secondary">
                + Add another
              </button>
              <button type="submit" disabled={adding || !canSubmit} className="btn-primary flex-1">
                {adding ? "Adding…" : `Add ${validCount || ""} card${validCount !== 1 ? "s" : ""}`}
              </button>
            </div>
          </form>
        </div>

        {/* Card list */}
        <div>
          <p className="text-sm text-slate-400 font-medium mb-3">
            {cardList.length} card{cardList.length !== 1 ? "s" : ""}
          </p>
          <ul className="flex flex-col gap-2">
            {cardList.map((card) => (
              <li key={card.id} className="card px-4 py-3 flex items-start justify-between gap-3 hover:shadow-card-hover transition-shadow">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{card.front_text}</p>
                  <p className="text-sm text-slate-400 truncate mt-0.5">{card.back_text}</p>
                </div>
                <button
                  onClick={() => handleDeleteCard(card.id)}
                  className="p-1 text-slate-300 hover:text-red-400 transition-colors rounded hover:bg-red-50 shrink-0"
                  aria-label="Delete card"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          {cardList.length === 0 && (
            <div className="card p-10 text-center text-slate-400">No cards yet.</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// VoiceField component
// ---------------------------------------------------------------------------

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
        <div className="relative flex-1">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required
            className="input pr-8"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-xs"
              aria-label="Clear"
            >
              ✕
            </button>
          )}
        </div>
        {isSupported && (
          <button
            type="button"
            onClick={onVoice}
            title={listening ? "Stop recording" : "Speak"}
            className={`px-3 rounded-xl border text-sm transition-colors ${
              listening
                ? "bg-red-50 border-red-200 text-red-500 animate-pulse"
                : "border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            }`}
          >
            🎤
          </button>
        )}
      </div>
    </div>
  );
}
