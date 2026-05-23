import type { DictionaryResult } from "../hooks/useDictionary";

const CEFR_COLOR: Record<string, string> = {
  A1: "bg-green-100 text-green-700",
  A2: "bg-green-100 text-green-700",
  B1: "bg-blue-100 text-blue-700",
  B2: "bg-blue-100 text-blue-700",
  C1: "bg-purple-100 text-purple-700",
  C2: "bg-purple-100 text-purple-700",
};

interface Props {
  result: DictionaryResult | null;
  loading: boolean;
  onPickTranslation: (t: string) => void;
  onPickSuggestion: (word: string) => void;
}

export default function DictionaryPanel({ result, loading, onPickTranslation, onPickSuggestion }: Props) {
  if (loading) {
    return (
      <div className="mt-1 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-400 animate-pulse">
        Looking up…
      </div>
    );
  }

  if (!result) return null;

  // Misspelled — show suggestions only
  if (result.definitions.length === 0 && result.suggestions.length > 0) {
    return (
      <div className="mt-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
        <p className="text-amber-700 font-medium mb-2">Did you mean…?</p>
        <div className="flex flex-wrap gap-1.5">
          {result.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPickSuggestion(s)}
              className="px-3 py-1 rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 transition-colors font-medium"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 rounded-xl border border-gray-200 bg-white shadow-sm text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-gray-100">
        <span className="font-semibold text-gray-800">{result.word}</span>
        {result.cefr && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CEFR_COLOR[result.cefr] ?? "bg-gray-100 text-gray-600"}`}>
            {result.cefr}
          </span>
        )}
        {result.translation_source !== "none" && (
          <span className="ml-auto text-xs text-gray-400">via {result.translation_source}</span>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Translations */}
        {result.translations.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Translations — click to fill
            </p>
            <div className="flex flex-wrap gap-1.5">
              {result.translations.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onPickTranslation(t)}
                  className="px-3 py-1 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 transition-colors font-medium"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Definitions */}
        {result.definitions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Definitions
            </p>
            <ul className="space-y-1.5">
              {result.definitions.slice(0, 3).map((d, i) => (
                <li key={i}>
                  <span className="text-xs text-gray-400 italic mr-1">{d.part_of_speech}</span>
                  <span className="text-gray-700">{d.definition}</span>
                  {d.example && (
                    <p className="text-xs text-gray-400 mt-0.5 pl-2 border-l-2 border-gray-200">
                      "{d.example}"
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Phrasal verbs */}
        {result.phrasal_verbs.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Phrasal verbs
            </p>
            <div className="flex flex-wrap gap-1.5">
              {result.phrasal_verbs.map((pv) => (
                <span
                  key={pv}
                  className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs"
                >
                  {pv}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
