from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import engine
from app.models import *
from app.database import Base
from app.api.v1 import api_router

# SEEDERS
from app.utils.seeder import run_all_seeders
from app.database import SessionLocal

settings = get_settings()

# Crea todas las tablas al iniciar
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.PROJECT_DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc"
)

@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        run_all_seeders(db)
    finally:
        db.close()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": settings.PROJECT_NAME, "version": settings.VERSION, "docs": "/docs"}