from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from . import models  # noqa: F401  (ensures models are registered before create_all)
from .routers import auth, records, timeline

# Creates tables if they don't exist. Fine for local dev / SQLite.
# For production with Postgres, switch to Alembic migrations instead.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Health Record Organizer API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(records.router)
app.include_router(timeline.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
