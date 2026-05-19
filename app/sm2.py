from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.models import Flashcard

MASTERED_INTERVAL_DAYS = 21


def apply_sm2(card: Flashcard, rating: int) -> Flashcard:
    """
    SM-2 spaced repetition algorithm.

    Rating 0–5:
      0–2  → failed recall, reset to day 1
      3–5  → successful recall, advance interval

    Updates card in-place and returns it.
    """
    rating = max(0, min(5, rating))

    if rating < 3:
        card.repetitions = 0
        card.interval = 1
    else:
        if card.repetitions == 0:
            card.interval = 1
        elif card.repetitions == 1:
            card.interval = 6
        else:
            card.interval = round(card.interval * card.easiness_factor)
        card.repetitions += 1

    card.easiness_factor = max(
        1.3,
        card.easiness_factor + 0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02),
    )
    card.next_review = datetime.now(timezone.utc) + timedelta(days=card.interval)
    return card
