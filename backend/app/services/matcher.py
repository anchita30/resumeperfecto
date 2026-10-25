"""
Semantic matching service — NO pretrained models are used anywhere here.

Two complementary, self-trained similarity signals:
  1. Word2Vec embeddings trained from scratch by scripts/train_embeddings.py
     (gensim, skip-gram, trained on our own corpus — weights are never
     downloaded from anywhere).
  2. TF-IDF vectors, fit live on the resume+JD pair at request time
     (a classical statistical model with no external weights at all).

The final semantic score is an average of both signals, which makes the
system robust even while the Word2Vec vocabulary is still small.
"""
import re
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

MODEL_PATH = Path(__file__).resolve().parent.parent / "data" / "word2vec.model"

_W2V_MODEL = None
_W2V_LOAD_ATTEMPTED = False


def tokenize(text: str) -> list:
    text = text.lower()
    text = re.sub(r"[^a-z0-9+.#\s]", " ", text)
    return [t for t in text.split() if t]


def get_word2vec_model():
    
    global _W2V_MODEL, _W2V_LOAD_ATTEMPTED
    if _W2V_MODEL is None and not _W2V_LOAD_ATTEMPTED:
        _W2V_LOAD_ATTEMPTED = True
        if MODEL_PATH.exists():
            from gensim.models import Word2Vec
            _W2V_MODEL = Word2Vec.load(str(MODEL_PATH))
    return _W2V_MODEL


def doc_vector(tokens: list, model, weights: dict = None) -> np.ndarray:
    """
    Combine trained word vectors into one document vector.

    If `weights` (a token -> TF-IDF weight lookup) is given, this is a
    WEIGHTED average instead of a plain mean. Plain mean-pooling is a known
    weak point of word-embedding document similarity: common filler words
    ("the", "and", "experience", "team") dominate a simple average, drowning
    out the handful of words that actually distinguish one resume/JD from
    another — which is why plain-averaged Word2Vec was scoring almost any
    two tech documents as 85-95% similar regardless of actual skill overlap.
    Weighting each word by its TF-IDF importance in this specific pair fixes
    that: distinctive terms (specific skills, tools) count far more than
    generic words, giving a much more discriminative document vector.
    """
    if weights:
        vecs, wts = [], []
        for t in tokens:
            if t in model.wv:
                w = weights.get(t, 0.0)
                if w > 0:
                    vecs.append(model.wv[t] * w)
                    wts.append(w)
        if not vecs:
            return np.zeros(model.vector_size)
        return np.sum(vecs, axis=0) / sum(wts)

    vecs = [model.wv[t] for t in tokens if t in model.wv]
    if not vecs:
        return np.zeros(model.vector_size)
    return np.mean(vecs, axis=0)


def _tfidf_weight_lookups(resume_text: str, jd_text: str):
    """Fits ONE TF-IDF vectorizer on the resume+JD pair and returns
    (tfidf_score, resume_weights, jd_weights) — the same fitted weights are
    reused for both the TF-IDF similarity score AND the Word2Vec weighted
    pooling above, so both signals are grounded in the same notion of
    'what actually matters in this specific pair' rather than computed
    independently."""
    vectorizer = TfidfVectorizer(stop_words="english")
    try:
        tfidf_matrix = vectorizer.fit_transform([resume_text, jd_text])
    except ValueError:
        return 0.0, {}, {}

    score = float(cosine_similarity(tfidf_matrix[0], tfidf_matrix[1])[0][0])
    score = round(max(0.0, min(1.0, score)), 4)

    vocab = vectorizer.get_feature_names_out()
    resume_row = tfidf_matrix[0].toarray()[0]
    jd_row = tfidf_matrix[1].toarray()[0]
    resume_weights = {vocab[i]: resume_row[i] for i in range(len(vocab)) if resume_row[i] > 0}
    jd_weights = {vocab[i]: jd_row[i] for i in range(len(vocab)) if jd_row[i] > 0}

    return score, resume_weights, jd_weights


def word2vec_similarity(resume_text: str, jd_text: str, resume_weights: dict, jd_weights: dict):
    model = get_word2vec_model()
    if model is None:
        return None  # signals "not trained yet" to the caller

    resume_vec = doc_vector(tokenize(resume_text), model, resume_weights)
    jd_vec = doc_vector(tokenize(jd_text), model, jd_weights)

    if np.all(resume_vec == 0) or np.all(jd_vec == 0):
        return 0.0

    score = float(cosine_similarity([resume_vec], [jd_vec])[0][0])
    return round(max(0.0, min(1.0, score)), 4)


def overall_similarity(resume_text: str, jd_text: str) -> dict:
    tfidf_score, resume_weights, jd_weights = _tfidf_weight_lookups(resume_text, jd_text)
    w2v_score = word2vec_similarity(resume_text, jd_text, resume_weights, jd_weights)

    if w2v_score is None:
        combined = tfidf_score
        note = "Word2Vec model not trained yet — run scripts/train_embeddings.py. Using TF-IDF only."
    else:
        combined = round((tfidf_score + w2v_score) / 2, 4)
        note = None

    return {
        "combined_score": combined,
        "tfidf_score": tfidf_score,
        "word2vec_score": w2v_score,
        "note": note,
    }


_BULLET_RE = re.compile(r"[•▪◦‣∙]|(?:\n|^)\s*[-*]\s+")
# Matches a "Label:" style heading (e.g. "Programming Languages:",
# "Soft Skills:") so JDs/resumes that concatenate several requirement
# categories into one dense paragraph ("Education: ... Tools: ... Soft
# Skills: ...") still get split into one chunk PER category. Requires a
# non-letter before it (so we don't start mid-word) and whitespace after
# the colon (so we don't fire on incidental colons like times).
_LABEL_RE = re.compile(r"(?<![A-Za-z])[A-Z][A-Za-z0-9 /&\-]{1,30}:(?=\s)")
# Sentence boundary that does NOT require whitespace after the punctuation —
# real-world pasted JD text is frequently missing that space (e.g.
# "...experience).Programming Languages:..."), which silently broke the
# previous version of this splitter (it used \s+, so no space = no split =
# the entire JD collapsing into one giant "weak section").
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s*(?=[A-Z])")


def _split_keep_nonempty(pattern: re.Pattern, text: str) -> list:
    parts = [p.strip() for p in pattern.split(text) if p and p.strip()]
    return parts if len(parts) > 1 else [text]


def _split_by_labels(text: str) -> list:
    """Splits at the START of each 'Label:' match (position-based, not a
    regex-split with a lookahead) so a multi-word label like "Programming
    Languages:" is never itself broken apart mid-label."""
    matches = list(_LABEL_RE.finditer(text))
    if len(matches) < 2:
        return [text]
    starts = [m.start() for m in matches]
    pieces = []
    if starts[0] > 0:
        lead = text[:starts[0]].strip()
        if lead:
            pieces.append(lead)
    for i, s in enumerate(starts):
        end = starts[i + 1] if i + 1 < len(starts) else len(text)
        piece = text[s:end].strip()
        if piece:
            pieces.append(piece)
    return pieces if len(pieces) > 1 else [text]


def _hard_wrap(text: str, max_words: int) -> list:
    words = text.split()
    return [" ".join(words[i:i + max_words]) for i in range(0, len(words), max_words)]


def split_into_chunks(text: str, max_words: int = 60) -> list:
    """Split resume/JD text into meaningful chunks for section-level
    similarity. Applies progressively finer splitting strategies — blank
    lines, then bullet points, then "Label:" headings, then sentences,
    then a hard word-count wrap as a last resort — so a dense, unbroken
    block of text still ends up as several specific, comparable pieces
    instead of one giant blob."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [text.strip()]

    chunks = []
    for para in paragraphs:
        pieces = [para]
        for splitter in (
            lambda t: _split_keep_nonempty(_BULLET_RE, t),
            _split_by_labels,
            lambda t: _split_keep_nonempty(_SENTENCE_SPLIT_RE, t),
        ):
            next_pieces = []
            for piece in pieces:
                if len(piece.split()) > max_words:
                    next_pieces.extend(splitter(piece))
                else:
                    next_pieces.append(piece)
            pieces = next_pieces

        for piece in pieces:
            if len(piece.split()) > max_words:
                chunks.extend(_hard_wrap(piece, max_words))
            else:
                chunks.append(piece)

    return [c for c in chunks if c.strip()]


def section_level_similarity(resume_text: str, jd_text: str, top_k: int = 5) -> list:
    """For each JD chunk, find the most similar resume chunk (TF-IDF based,
    fit across all chunks together so vectors are comparable)."""
    jd_chunks = split_into_chunks(jd_text)
    resume_chunks = split_into_chunks(resume_text)

    if not jd_chunks or not resume_chunks:
        return []

    vectorizer = TfidfVectorizer(stop_words="english")
    try:
        all_vectors = vectorizer.fit_transform(jd_chunks + resume_chunks)
    except ValueError:
        return []

    jd_vectors = all_vectors[: len(jd_chunks)]
    resume_vectors = all_vectors[len(jd_chunks):]

    sim_matrix = cosine_similarity(jd_vectors, resume_vectors)

    results = []
    for i, jd_chunk in enumerate(jd_chunks):
        best_idx = int(np.argmax(sim_matrix[i]))
        best_score = float(sim_matrix[i][best_idx])
        results.append({
            "jd_chunk": jd_chunk,
            "best_matching_resume_chunk": resume_chunks[best_idx],
            "similarity": round(best_score, 4),
        })

    results.sort(key=lambda x: x["similarity"])
    return results[:top_k]