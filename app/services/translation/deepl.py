from __future__ import annotations

import httpx

from app.services.translation.base import TranslationProvider


class DeepLProvider(TranslationProvider):
    name = "deepl"
    _URL = "https://api-free.deepl.com/v2/translate"

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    def is_configured(self) -> bool:
        return bool(self._api_key)

    def translate(self, word: str) -> list[str]:
        try:
            resp = httpx.post(
                self._URL,
                headers={"Authorization": f"DeepL-Auth-Key {self._api_key}"},
                json={"text": [word], "target_lang": "UK"},
                timeout=5,
            )
            resp.raise_for_status()
            data = resp.json()
            text = data["translations"][0]["text"]
            return [text] if text else []
        except Exception:
            return []
