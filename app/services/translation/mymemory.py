from __future__ import annotations

import httpx

from app.services.translation.base import TranslationProvider


class MyMemoryProvider(TranslationProvider):
    name = "mymemory"
    _URL = "https://api.mymemory.translated.net/get"

    def __init__(self, email: str) -> None:
        self._email = email

    def translate(self, word: str) -> list[str]:
        try:
            params: dict = {"q": word, "langpair": "en|uk"}
            if self._email:
                params["de"] = self._email

            resp = httpx.get(self._URL, params=params, timeout=5)
            resp.raise_for_status()
            data = resp.json()

            seen: set[str] = set()
            results: list[str] = []

            # Best match first
            best = data.get("responseData", {}).get("translatedText", "")
            if best and best.upper() != word.upper():
                seen.add(best.lower())
                results.append(best)

            # Additional matches sorted by quality
            matches = sorted(
                data.get("matches", []),
                key=lambda m: float(m.get("quality", 0)),
                reverse=True,
            )
            for match in matches:
                t = match.get("translation", "").strip()
                if t and t.lower() not in seen and t.upper() != word.upper():
                    seen.add(t.lower())
                    results.append(t)
                if len(results) >= 5:
                    break

            return results
        except Exception:
            return []
