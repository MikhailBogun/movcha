from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.auth import get_current_user
from app.models import User
from app.schemas import DictionaryResultSchema
from app.services import dictionary as dictionary_service

router = APIRouter(prefix="/dictionary", tags=["dictionary"])


@router.get("/lookup", response_model=DictionaryResultSchema)
def lookup(
    word: str = Query(..., min_length=1, max_length=100),
    _: User = Depends(get_current_user),
):
    result = dictionary_service.lookup(word)
    return DictionaryResultSchema(
        word=result.word,
        cefr=result.cefr,
        definitions=[
            {"part_of_speech": d.part_of_speech, "definition": d.definition, "example": d.example}
            for d in result.definitions
        ],
        examples=result.examples,
        phrasal_verbs=result.phrasal_verbs,
        translations=result.translations,
        translation_source=result.translation_source,
        suggestions=result.suggestions,
    )
