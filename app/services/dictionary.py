from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import httpx

from app.core.config import settings
from app.services.translation.deepl import DeepLProvider
from app.services.translation.lingva import LingvaProvider
from app.services.translation.mymemory import MyMemoryProvider

# ---------------------------------------------------------------------------
# CEFR data — loaded once at import time
# ---------------------------------------------------------------------------

_CEFR_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "cefr.json")

def _build_cefr_index() -> Dict[str, str]:
    with open(_CEFR_PATH, encoding="utf-8") as f:
        data = json.load(f)
    index: Dict[str, str] = {}
    for level, words in data.items():
        for word in words:
            index[word.lower()] = level
    return index


_CEFR: Dict[str, str] = _build_cefr_index()

# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------


@dataclass
class Definition:
    part_of_speech: str
    definition: str
    example: Optional[str] = None


@dataclass
class DictionaryResult:
    word: str
    cefr: Optional[str]
    definitions: List[Definition] = field(default_factory=list)
    examples: List[str] = field(default_factory=list)
    phrasal_verbs: List[str] = field(default_factory=list)
    translations: List[str] = field(default_factory=list)
    translation_source: str = "none"


# ---------------------------------------------------------------------------
# Simple in-memory cache
# ---------------------------------------------------------------------------

_cache: Dict[str, DictionaryResult] = {}

# ---------------------------------------------------------------------------
# Provider chain — configured once
# ---------------------------------------------------------------------------

_providers = [
    DeepLProvider(api_key=settings.deepl_api_key),
    MyMemoryProvider(email=settings.translation_email),
    LingvaProvider(),
]


def _fetch_translations(word: str) -> tuple[list[str], str]:
    for provider in _providers:
        if not provider.is_configured():
            continue
        results = provider.translate(word)
        if results:
            return results, provider.name
    return [], "none"


def _fetch_definition(word: str) -> tuple[list[Definition], list[str], list[str]]:
    """Fetch from dictionaryapi.dev — returns (definitions, examples, phrasal_verbs)."""
    try:
        resp = httpx.get(
            f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}",
            timeout=5,
        )
        if resp.status_code != 200:
            return [], [], []

        data = resp.json()
        definitions: list[Definition] = []
        examples: list[str] = []
        phrasal_verbs: list[str] = []

        for entry in data:
            for meaning in entry.get("meanings", []):
                pos = meaning.get("partOfSpeech", "")
                for defn in meaning.get("definitions", [])[:3]:
                    d = Definition(
                        part_of_speech=pos,
                        definition=defn.get("definition", ""),
                        example=defn.get("example"),
                    )
                    definitions.append(d)
                    if defn.get("example"):
                        examples.append(defn["example"])

            # Phrasal verbs sometimes appear as separate entries with spaces
            entry_word = entry.get("word", "")
            if " " in entry_word and word.lower() in entry_word.lower():
                phrasal_verbs.append(entry_word)

        return definitions[:6], examples[:4], phrasal_verbs[:6]

    except Exception:
        return [], [], []


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def lookup(word: str) -> DictionaryResult:
    word = word.strip().lower()

    if word in _cache:
        return _cache[word]

    definitions, examples, phrasal_verbs = _fetch_definition(word)
    translations, source = _fetch_translations(word)
    cefr = _CEFR.get(word)

    result = DictionaryResult(
        word=word,
        cefr=cefr,
        definitions=definitions,
        examples=examples,
        phrasal_verbs=phrasal_verbs,
        translations=translations,
        translation_source=source,
    )

    _cache[word] = result
    return result
