"""
Trains a Word2Vec model FROM SCRATCH (no pretrained weights, no downloaded
vectors) using gensim on:
  1. the bundled synthetic corpus (app/data/training_corpus.txt),
  2. any real Kaggle resume/JD data you've ingested via
     scripts/ingest_kaggle_data.py (app/data/external_corpus.txt), and
  3. any real resume/JD text accumulated in the database so far
     (so the model improves the more the app is used).

Run this once before starting the server, and re-run any time you want
to retrain on newly accumulated data:

    python scripts/generate_corpus.py     # (re)generate the synthetic corpus
    python scripts/ingest_kaggle_data.py --file ... --column ...   # optional, real data
    python scripts/train_embeddings.py    # train the model

Output: app/data/word2vec.model
"""
import re
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from gensim.models import Word2Vec

DATA_DIR = Path(__file__).resolve().parent.parent / "app" / "data"
CORPUS_PATH = DATA_DIR / "training_corpus.txt"
EXTERNAL_CORPUS_PATH = DATA_DIR / "external_corpus.txt"
MODEL_OUTPUT_PATH = DATA_DIR / "word2vec.model"


def tokenize(text: str) -> list:
    text = text.lower()
    text = re.sub(r"[^a-z0-9+.#\s]", " ", text)
    return [t for t in text.split() if t]


def load_bundled_corpus() -> list:
    if not CORPUS_PATH.exists():
        raise FileNotFoundError(
            f"{CORPUS_PATH} not found. Run scripts/generate_corpus.py first."
        )
    sentences = []
    with open(CORPUS_PATH) as f:
        for line in f:
            tokens = tokenize(line)
            if tokens:
                sentences.append(tokens)
    return sentences


def load_external_corpus() -> list:
    """Load real Kaggle resume/JD lines ingested via ingest_kaggle_data.py,
    if any. Absent until you choose to add real data — that's fine."""
    if not EXTERNAL_CORPUS_PATH.exists():
        return []
    sentences = []
    with open(EXTERNAL_CORPUS_PATH, encoding="utf-8", errors="ignore") as f:
        for line in f:
            tokens = tokenize(line)
            if tokens:
                sentences.append(tokens)
    return sentences


def load_accumulated_documents() -> list:
    """Pull previously analyzed resume/JD text from the database, if any,
    so the model keeps improving as real usage data accumulates."""
    sentences = []
    try:
        from app.models.db import SessionLocal, AnalysisRecord
        db = SessionLocal()
        records = db.query(AnalysisRecord).all()
        for r in records:
            for text in (r.resume_text, r.jd_text):
                if text:
                    for para in text.split("\n"):
                        tokens = tokenize(para)
                        if len(tokens) >= 3:
                            sentences.append(tokens)
        db.close()
    except Exception as e:
        print(f"(No accumulated DB data used: {e})")
    return sentences


def train():
    print("Loading bundled synthetic corpus...")
    sentences = load_bundled_corpus()
    print(f"  {len(sentences)} sentences from bundled corpus")

    external = load_external_corpus()
    if external:
        print(f"  + {len(external)} sentences from ingested Kaggle data")
        sentences.extend(external)
    else:
        print("  (no ingested Kaggle data found — run scripts/ingest_kaggle_data.py to add real data)")

    accumulated = load_accumulated_documents()
    if accumulated:
        print(f"  + {len(accumulated)} sentences from accumulated resume/JD data")
        sentences.extend(accumulated)

    print("Training Word2Vec model from scratch...")
    model = Word2Vec(
        sentences=sentences,
        vector_size=100,
        window=5,
        min_count=1,
        workers=4,
        sg=1,        # skip-gram
        epochs=20,
    )

    model.save(str(MODEL_OUTPUT_PATH))
    print(f"Model trained. Vocabulary size: {len(model.wv)}")
    print(f"Saved to {MODEL_OUTPUT_PATH}")


if __name__ == "__main__":
    train()