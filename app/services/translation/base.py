from __future__ import annotations

from abc import ABC, abstractmethod


class TranslationProvider(ABC):
    name: str = "base"

    def is_configured(self) -> bool:
        return True

    @abstractmethod
    def translate(self, word: str) -> list[str]:
        """Return a list of Ukrainian translations, best first. Empty list on failure."""
