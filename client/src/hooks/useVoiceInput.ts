import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "listening" | "error";

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  lang?: string;
}

export function useVoiceInput({ onTranscript, onInterim, lang = "en-US" }: UseVoiceInputOptions) {
  const [status, setStatus] = useState<Status>("idle");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Always-current refs so recognition callbacks never capture stale closures
  const onTranscriptRef = useRef(onTranscript);
  const onInterimRef = useRef(onInterim);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onInterimRef.current = onInterim;
  });

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const start = useCallback(() => {
    if (!isSupported) {
      setStatus("error");
      return;
    }

    const SpeechRecognitionImpl =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setStatus("listening");
    recognition.onerror = () => setStatus("error");
    recognition.onend = () => setStatus("idle");

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }

      if (final) onTranscriptRef.current(final);
      else if (interim) onInterimRef.current?.(interim);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, lang]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setStatus("idle");
  }, []);

  return { status, start, stop, isSupported };
}
