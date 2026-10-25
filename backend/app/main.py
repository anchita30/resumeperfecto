from dotenv import load_dotenv
load_dotenv()  # reads backend/.env so GEMINI_API_KEY etc. are available via os.environ

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models.db import init_db
from app.routers import parse, analyze, history, suggestions, chat

app = FastAPI(
    title="Resume-JD Semantic Matcher API",
    description="Parses resumes/JDs, extracts skills, and computes semantic "
                 "match + skill gap analysis using self-trained models (no "
                 "pretrained weights).",
    version="1.0.0",
)

# Allow the Next.js frontend (dev + configurable prod origin) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your deployed frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parse.router)
app.include_router(analyze.router)
app.include_router(history.router)
app.include_router(suggestions.router)
app.include_router(chat.router)



@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "resume-jd-matcher-backend",
        "docs": "/docs",
    }


@app.get("/api/health")
def health():
    import os
    from app.services.matcher import get_word2vec_model
    model = get_word2vec_model()
    return {
        "status": "ok",
        "word2vec_trained": model is not None,
        "word2vec_vocab_size": len(model.wv) if model is not None else 0,
        "gemini_api_key_configured": bool(os.environ.get("GEMINI_API_KEY")),
    }