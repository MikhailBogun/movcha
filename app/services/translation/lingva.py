from __future__ import annotations

import httpx

from app.services.translation.base import TranslationProvider

# Public Lingva instances — tried in order until one responds
_INSTANCES = [
    "https://lingva.lunar.icu",
    "https://lingva.garudalinux.org",
    "https://translate.plausibility.cloud",
]


class LingvaProvider(TranslationProvider):
    name = "lingva"

    def translate(self, word: str) -> list[str]:
        for base in _INSTANCES:
            try:
                resp = httpx.get(
                    f"{base}/api/v1/en/uk/{word}",
                    timeout=5,
                )
                if resp.status_code != 200:
                    continue
                data = resp.json()

                seen: set[str] = set()
                results: list[str] = []

                main = data.get("translation", "").strip()
                if main:
                    seen.add(main.lower())
                    results.append(main)

                # extraTranslations is a list of {type, list}
                for group in data.get("info", {}).get("extraTranslations", []):
                    for t in group.get("list", []):
                        word_t = t.get("word", "").strip()
                        if word_t and word_t.lower() not in seen:
                            seen.add(word_t.lower())
                            results.append(word_t)
                        if len(results) >= 5:
                            break
                    if len(results) >= 5:
                        break

                if results:
                    return results
            except Exception:
                continue

        return []
