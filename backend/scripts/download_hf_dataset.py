"""
Downloads the cnamuangtoun/resume-job-description-fit dataset from
Hugging Face (8,000 REAL resume <-> job description pairs, each labeled
by humans as No Fit / Potential Fit / Good Fit) and saves it as CSV files
you can feed into ingest_kaggle_data.py.

This is a genuinely paired dataset (unlike separately-sourced resume and
JD datasets), and the fit labels can also be used later to sanity-check
your own computed match scores against real human judgments.

Usage:
    python scripts/download_hf_dataset.py

Output:
    app/data/hf_resume_jd_fit.csv
    columns: resume_text, job_description_text, label
"""
from pathlib import Path
from datasets import load_dataset

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "app" / "data" / "hf_resume_jd_fit.csv"


def download():
    print("Downloading cnamuangtoun/resume-job-description-fit from Hugging Face...")
    ds = load_dataset("cnamuangtoun/resume-job-description-fit")

    # Combine all available splits (train/test) into one CSV — you can
    # filter/split later if you want to hold out data for evaluation.
    all_rows = []
    for split_name in ds.keys():
        df = ds[split_name].to_pandas()
        df["split"] = split_name
        all_rows.append(df)

    import pandas as pd
    combined = pd.concat(all_rows, ignore_index=True)
    combined.to_csv(OUTPUT_PATH, index=False)

    print(f"Saved {len(combined)} resume-JD pairs to {OUTPUT_PATH}")
    print(f"Columns: {list(combined.columns)}")
    if "label" in combined.columns:
        print("Label distribution:")
        print(combined["label"].value_counts())


if __name__ == "__main__":
    download()