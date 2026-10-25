# Resume–JD Matcher & Skill Gap Analyzer

A full-stack web app that compares a resume against a job description, predicts how well they fit (**Strong / Partial / Poor**), and shows which skills the candidate is missing.

The matching model is **trained from scratch** on resume–JD data. It does not use pretrained matching models.

## Features

- Upload or paste a resume and a job description
- Fit prediction: Strong / Partial / Poor, with a match score
- Skill gap analysis: skills the JD asks for that the resume lacks
- <Add any other feature: e.g. PDF parsing, matched-skills highlight>

## How it works

1. **Preprocessing**: text is cleaned and tokenized, and skills are extracted from both documents.
2. **Embeddings**: a Word2Vec model, trained on a custom corpus (`training_corpus.txt` + `external_corpus.txt`), converts text into vectors.
3. **Matching**: resume and JD vectors are compared (<cosine similarity / feature combination>) and passed to a <classifier name, e.g. Logistic Regression / Random Forest> trained on the Hugging Face resume–JD fit dataset.
4. **Skill gap**: the JD skills are compared against the resume skills to list what's missing.

## Tech stack

| Layer | Tools |
|---|---|
| Backend | Python, <Flask / FastAPI> |
| ML | Gensim (Word2Vec), scikit-learn, <spaCy / NLTK> |
| Frontend | <React / Vue / HTML-JS> |
