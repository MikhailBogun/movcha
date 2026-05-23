import { useEffect, useRef, useState } from "react";

export interface Definition {
  part_of_speech: string;
  definition: string;
  example: string | null;
}

export interface DictionaryResult {
  word: string;
  cefr: string | null;
  definitions: Definition[];
  examples: string[];
  phrasal_verbs: string[];
  translations: string[];
  translation_source: string;
  suggestions: string[];
}

export function useDictionary(word: string, debounceMs = 400) {
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trimmed = word.trim();

    if (!trimmed || trimmed.length < 2) {
      setResult(null);
      setError(null);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `/api/dictionary/lookup?word=${encodeURIComponent(trimmed)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) throw new Error("Not found");
        const data: DictionaryResult = await res.json();
        setResult(data);
      } catch {
        setResult(null);
        setError("No results");
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [word, debounceMs]);

  return { result, loading, error };
}
