"""
Generates personalized "how to improve your resume" suggestions using
Google's Gemini API (free tier, no credit card required — see
https://aistudio.google.com).

This is the ONE part of the app that calls an external AI model — everything
else (matching, skill extraction) is self-trained/classical NLP with no
external weights, by design. Suggestions genuinely benefit from a real
language model's ability to write natural, specific advice, which a
rule-based template can't do well.
"""
import os
import requests

GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash:generateContent"
)


def _get_api_key() -> str | None:
    return os.environ.get("GEMINI_API_KEY")


def _build_prompt(report: dict) -> str:
    scoring = report["scoring"]
    gap = report["skill_gap"]

    missing = ", ".join(m["skill"] for m in gap["missing_skills"]) or "none"
    matched = ", ".join(gap["matched_skills"]) or "none"
    partial = ", ".join(p["skill"] for p in gap["partial_matches"]) or "none"

    weak_sections = report.get("weakest_covered_jd_sections", [])
    weak_text = "\n".join(
        f"- JD requirement: \"{w['jd_chunk']}\" (only {w['similarity']*100:.0f}% reflected in the resume)"
        for w in weak_sections[:5]
    ) or "None identified."

    return f"""You are a career coach reviewing a resume-to-job-description match report.

Overall match score: {scoring['overall_score']}/100 ({scoring['verdict']})
Skill coverage: {scoring['skill_coverage_pct']}%

Matched skills (already on the resume): {matched}
Partially related skills found: {partial}
Missing skills (required by the JD, not found on the resume): {missing}

Weakest-covered JD requirements:
{weak_text}

Write 4-6 concise, specific, actionable bullet-point suggestions for how this
candidate could improve their resume for THIS specific job. Focus on:
- How to address the missing skills (learn them, or better surface existing
  related experience if it's likely they have it but phrased it differently)
- How to better reflect the weakest-covered JD requirements
- Keep each bullet to 1-2 sentences, no fluff, no generic advice like "tailor
  your resume" — be specific to the skills/requirements listed above.

Output ONLY the bullet points, one per line, starting each with "- ".
Do not include any preamble, headers, or closing remarks."""


class SuggestionsError(Exception):
    pass


def generate_suggestions(report: dict) -> str:
    api_key = _get_api_key()
    if not api_key:
        raise SuggestionsError(
            "GEMINI_API_KEY is not set. Create a .env file in the backend "
            "folder with GEMINI_API_KEY=your_key (see .env.example)."
        )

    prompt = _build_prompt(report)

    try:
        response = requests.post(
            f"{GEMINI_API_URL}?key={api_key}",
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=30,
        )
    except requests.RequestException as e:
        raise SuggestionsError(f"Could not reach Gemini API: {e}")

    if response.status_code != 200:
        raise SuggestionsError(
            f"Gemini API returned an error (status {response.status_code}): {response.text[:300]}"
        )

    data = response.json()
    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise SuggestionsError(f"Unexpected Gemini API response shape: {data}")

    return text.strip()