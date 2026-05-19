import { useCallback, useRef, useState } from "react";

type Status = "idle" | "listening" | "error";

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  lang?: string;
}

export function useVoiceInput({ onTranscript, lang = "en-US" }: UseVoiceInputOptions) {
  const [status, setStatus] = useState<Status>("idle");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setStatus("listening");
    recognition.onerror = () => setStatus("error");
    recognition.onend = () => setStatus("idle");
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) onTranscript(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, lang, onTranscript]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setStatus("idle");
  }, []);

  return { status, start, stop, isSupported };
}
