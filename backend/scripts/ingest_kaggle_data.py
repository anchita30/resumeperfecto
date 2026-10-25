"""
Ingests real resume/JD text from a downloaded Kaggle CSV into
app/data/external_corpus.txt, which train_embeddings.py will pick up
automatically alongside the synthetic corpus.

Usage:
    python scripts/ingest_kaggle_data.py --file path/to/Resume.csv --column Resume_str
    python scripts/ingest_kaggle_data.py --file path/to/postings.csv --column job_summary

Run it once per CSV you want to add (resumes, then job descriptions).
Each run APPENDS to the same external corpus file, so you can combine
multiple datasets before retraining.
"""
import argparse
import csv
import html
import re
import sys
from pathlib import Path

csv.field_size_limit(min(sys.maxsize, 2**31 - 1))

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "app" / "data" / "external_corpus.txt"


def clean_text(text: str) -> str:
    text = html.unescape(text)
    text = re.sub(r"<[^>]+>", " ", text)          # strip any HTML tags
    text = re.sub(r"http\S+|www\.\S+", " ", text)  # strip URLs
    text = re.sub(r"[\r\n]+", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def split_into_lines(text: str, max_words: int = 60) -> list:
    """Break a long resume/JD blob into shorter, sentence-ish chunks
    so Word2Vec gets many reasonably sized training lines instead of
    one giant line per document."""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    lines, current, current_len = [], [], 0
    for sent in sentences:
        w = len(sent.split())
        if w == 0:
            continue
        if current_len + w > max_words and current:
            lines.append(" ".join(current))
            current, current_len = [], 0
        current.append(sent)
        current_len += w
    if current:
        lines.append(" ".join(current))
    return lines


def ingest(file_path: str, column: str, max_rows: int = None,
           filter_column: str = None, filter_value: str = None):
    file_path = Path(file_path)
    if not file_path.exists():
        print(f"File not found: {file_path}")
        sys.exit(1)

    lines_written = 0
    rows_read = 0
    rows_matched = 0

    with open(file_path, newline="", encoding="utf-8", errors="ignore") as f_in, \
         open(OUTPUT_PATH, "a", encoding="utf-8") as f_out:

        reader = csv.DictReader(f_in)
        if column not in (reader.fieldnames or []):
            print(f"Column '{column}' not found. Available columns: {reader.fieldnames}")
            sys.exit(1)
        if filter_column and filter_column not in (reader.fieldnames or []):
            print(f"Filter column '{filter_column}' not found. Available columns: {reader.fieldnames}")
            sys.exit(1)

        for row in reader:
            if max_rows and rows_matched >= max_rows:
                break
            rows_read += 1

            if filter_column:
                row_value = (row.get(filter_column) or "").strip().lower()
                if row_value != filter_value.strip().lower():
                    continue
            rows_matched += 1

            raw_text = row.get(column, "")
            if not raw_text or not raw_text.strip():
                continue

            cleaned = clean_text(raw_text)
            for line in split_into_lines(cleaned):
                if len(line.split()) >= 4:  # skip near-empty fragments
                    f_out.write(line.lower() + "\n")
                    lines_written += 1

    print(f"Read {rows_read} total rows from {file_path.name}")
    if filter_column:
        print(f"Matched {rows_matched} rows where {filter_column} == '{filter_value}'")
    print(f"Wrote {lines_written} training lines to {OUTPUT_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest a Kaggle CSV into the training corpus.")
    parser.add_argument("--file", required=True, help="Path to the downloaded CSV file")
    parser.add_argument("--column", required=True, help="Name of the column containing resume/JD text")
    parser.add_argument("--max-rows", type=int, default=None, help="Optional cap on rows to read (for very large CSVs)")
    parser.add_argument("--filter-column", default=None, help="Optional column to filter rows by (e.g. Category)")
    parser.add_argument("--filter-value", default=None, help="Value that --filter-column must equal (e.g. Information-Technology)")
    args = parser.parse_args()

    if args.filter_column and not args.filter_value:
        parser.error("--filter-value is required when --filter-column is given")

    ingest(args.file, args.column, args.max_rows, args.filter_column, args.filter_value)
