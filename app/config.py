from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_TITLE: str = "Dynamic Model Management System"
    APP_DESCRIPTION: str = "A FastAPI-based dynamic model management system"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()
