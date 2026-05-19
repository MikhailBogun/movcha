# Movcha

> _Мовча_ — Ukrainian for "silently". Learn words quietly, one card at a time.

Movcha is a spaced repetition app built for people who take vocabulary seriously. You study at your own pace, speak cards into existence with your voice, and let the algorithm decide when you're ready for the next review.

## What it does

- **Flashcard decks** — create decks for any subject, fill them with cards
- **Voice input** — speak the front or back of a card instead of typing it
- **SM-2 algorithm** — each card schedules its own next review based on how well you recalled it
- **Mastery tracking** — cards graduate from _new_ → _learning_ → _mastered_ as your memory strengthens
- **Session tracking** — the app measures the time you actually spend studying
- **Admin panel** — see progress stats across all users: cards known, time spent, review counts
- **PWA** — installable on any device, works in the browser first

## Tech stack

| Layer | Tools |
|---|---|
| Backend | Python · FastAPI · SQLModel · MySQL |
| Auth | JWT · passlib · bcrypt |
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS |
| PWA | vite-plugin-pwa |
| Testing | pytest (backend) · Vitest + Testing Library (frontend) |
| Dev environment | Docker Compose |

## Running locally

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:8000 |
| API docs | http://localhost:8000/docs |

## Running tests

**Backend:**
```bash
pytest
```

**Frontend:**
```bash
docker compose run --rm client npm test
```
