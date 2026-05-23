from __future__ import annotations

import os


class Settings:
    deepl_api_key: str = os.getenv("DEEPL_API_KEY", "")
    translation_email: str = os.getenv("TRANSLATION_EMAIL", "yesnoapp1@gmail.com")
    database_url: str = os.getenv("DATABASE_URL", "sqlite://")
    secret_key: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")


settings = Settings()
