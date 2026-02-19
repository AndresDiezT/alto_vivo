from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

# Ruta absoluta al .env relativa a este archivo (config.py)
ENV_PATH = Path(__file__).parent.parent.parent / ".env"

class Settings(BaseSettings):
    PROJECT_NAME: str
    VERSION: str
    API_V1_STR: str
    PROJECT_DESCRIPTION: str
    
    SECRET_KEY: str
    REFRESH_SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    DATABASE_URL: str
    
    # Planes
    FREE_PLAN_MAX_BUSINESSES: int = 1
    BASIC_PLAN_MAX_BUSINESSES: int = 3
    PROFESSIONAL_PLAN_MAX_BUSINESSES: int = 10
    ENTERPRISE_PLAN_MAX_BUSINESSES: int = 999
    
    class Config:
        env_file = str(ENV_PATH)
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings():
    return Settings()