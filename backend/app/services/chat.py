import os
import requests
import json
from typing import Optional

GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash:generateContent"
)


def _get_api_key() -> str | None:
    return os.environ.get("GEMINI_API_KEY")


def _fallback_local_response(user_message: str, report: dict | None) -> str:
    """Smart deterministic grounded fallback if Gemini API is unreachable."""
    msg = user_message.lower().strip()

    if report:
        scoring = report.get("scoring", {})
        gap = report.get("skill_gap", {})
        missing_skills = [
            m.get("skill", "") if isinstance(m, dict) else str(m)
            for m in gap.get("missing_skills", [])
        ]
        matched_skills = gap.get("matched_skills", [])
        score = scoring.get("overall_score", 0)
        verdict = scoring.get("verdict", "N/A")
        coverage = scoring.get("skill_coverage_pct", 0)

        if any(w in msg for w in ["missing", "gap", "lack", "missed"]):
            if missing_skills:
                skills_str = ", ".join(f"**{s}**" for s in missing_skills)
                return (
                    f"Based on your latest analysis, the job description requires {len(missing_skills)} skills "
                    f"that were not detected on your resume: {skills_str}.\n\n"
                    "You can find curated tutorials for each of these in the **Gaps** tab!"
                )
            return "Great news! Your resume has 100% skill coverage with no missing required skills."

        if any(w in msg for w in ["score", "result", "analysis", "last analysis", "report", "match"]):
            matched_str = ", ".join(f"**{s}**" for s in matched_skills) or "None"
            return (
                f"In your analysis, your overall ATS score is **{score}%** (**{verdict}**).\n\n"
                f"- **Skill Coverage:** {coverage}% ({len(matched_skills)} skills matched: {matched_str})\n"
                f"- **Semantic Similarity:** {scoring.get('semantic_score_pct', 0)}%\n"
                f"- **Missing Skills:** {len(missing_skills)} remaining to cover."
            )

        if any(w in msg for w in ["improve", "boost", "better", "tips", "advice"]):
            if missing_skills:
                top_3 = ", ".join(f"**{s}**" for s in missing_skills[:3])
                return (
                    f"To improve your match score from **{score}%**, prioritize closing your biggest skill gaps. "
                    f"Specifically, adding or demonstrating experience in {top_3} will significantly raise your score. "
                    "Also check the weakest-covered JD requirements in your report to align your bullet points."
                )
            return "Your skills match very well! Focus on quantifying achievements with measurable metrics (e.g. % improvements, latency reductions)."

    if any(w in msg for w in ["algorithm", "model", "how it works", "calculate", "tfidf", "word2vec", "logic"]):
        return (
            "ResumePerfecto uses a self-contained, hybrid evaluation engine without external pre-trained checkpoints:\n\n"
            "1. **Word2Vec (Skip-gram):** Trained from scratch on 8,000 real resume-JD pairs (`cnamuangtoun/resume-job-description-fit`).\n"
            "2. **TF-IDF + Cosine Similarity:** Quantifies keyword specificity on-the-fly.\n"
            "3. **TF-IDF Weighted Average Pooling:** Prevents generic filler words from skewing document similarity.\n"
            "4. **80/20 ATS Ensemble:** 80% Skill Coverage + 20% Calibrated Semantic Fit, with a strict qualification gate for low-coverage resumes."
        )

    return (
        "I'm here to help with your resume match! You can ask me:\n"
        "- *What are my missing skills?*\n"
        "- *Explain my overall score and verdict*\n"
        "- *How can I improve my resume for this job?*\n"
        "- *What algorithms are used to evaluate my resume?*"
    )


def generate_chat_response(
    user_message: str,
    report: Optional[dict],
    conversation: Optional[list] = None
) -> str:
    report_context = ""
    if report:
        scoring = report.get("scoring", {})
        gap = report.get("skill_gap", {})
        matched = ", ".join(gap.get("matched_skills", [])) or "None"
        missing_items = [
            m.get("skill", "") if isinstance(m, dict) else str(m)
            for m in gap.get("missing_skills", [])
        ]
        missing = ", ".join(missing_items) or "None (100% skill coverage!)"
        partial_items = []
        for p in gap.get("partial_matches", []):
            if isinstance(p, dict):
                skill = p.get("skill", "")
                via = ", ".join(p.get("related_skill_found", []))
                partial_items.append(f"{skill} (related found: {via})")
            else:
                partial_items.append(str(p))
        partial = "; ".join(partial_items) or "None"
        weak_sections = report.get("weakest_covered_jd_sections", [])
        weak_text = "\n".join(
            f"- \"{w.get('jd_chunk', '')}\" (reflectance: {w.get('similarity', 0)*100:.0f}%)"
            for w in weak_sections[:3]
        ) or "None identified."

        report_context = f"""
Candidate's Active Match Report Data:
- Overall Score: {scoring.get('overall_score', 'N/A')}%
- Verdict: {scoring.get('verdict', 'N/A')}
- Skill Coverage: {scoring.get('skill_coverage_pct', 'N/A')}%
- Semantic Fit: {scoring.get('semantic_score_pct', 'N/A')}% (TF-IDF: {scoring.get('tfidf_score_pct', 'N/A')}%, Word2Vec: {scoring.get('word2vec_score_pct', 'N/A')}%)
- Directly Matched Skills ({len(gap.get('matched_skills', []))}): {matched}
- Partially Matched Skills (0.5 credit): {partial}
- Missing Required Skills ({len(missing_items)}): {missing}
- Top Weakly Covered JD Requirements:
{weak_text}
"""
    else:
        report_context = "No specific match report has been run yet. The user is on the main dashboard."

    system_instruction = f"""You are the official AI Assistant for ResumePerfecto.
Your mission is to provide helpful, intelligent, actionable career guidance strictly grounded in the candidate's actual match report and the project's real architecture.

{report_context}

Project Knowledge & Technical Architecture (Refer to these when asked about methodology or algorithms):
- **Project Name:** ResumePerfecto
- **Zero Pretrained Weights:** We never download pre-trained checkpoints (no BERT, no SpaCy models).
- **Word2Vec (Skip-gram, 100-dim):** Trained completely from scratch on the `cnamuangtoun/resume-job-description-fit` Hugging Face dataset (8,000 real resume-JD pairs) using Gensim.
- **TF-IDF + Cosine Similarity:** Computed on-the-fly dynamically for the candidate resume and job description.
- **TF-IDF Weighted Average Pooling:** Combines Word2Vec embeddings weighted by TF-IDF scores so technical keywords dominate over common stop words.
- **Final ATS Score Formula:** 80% Skill Coverage + 20% Calibrated Semantic Fit. Features an ATS Qualification Gate that scales down semantic fit when skill coverage is below 50%.
- **Skill Extraction:** Uses regex word boundary lookarounds (`(?<![a-zA-Z0-9])skill(?![a-zA-Z0-9])`) against a curated taxonomy, with a synonym graph that awards 0.5 partial credit for related skills.
- **Google Gemini 2.5 Flash:** Used strictly downstream for natural AI career advice and actionable resume bullet suggestions.

Guidelines:
- Answer directly and conversationally in 2-4 concise paragraphs or clear bullet points.
- If asked about "my last analysis", "my score", or "my missing skills", refer directly to the Candidate's Active Match Report Data above (list the actual missing skills, actual score, etc.).
- Never output generic robotic fallbacks like "I don't know that one yet".
- Keep the tone encouraging, technical, and grounded.
"""

    api_key = _get_api_key()
    if not api_key:
        return _fallback_local_response(user_message, report)

    history_prompt = ""
    if conversation:
        for turn in conversation[-4:]:
            role = "User" if turn.get("role") == "user" else "Assistant"
            history_prompt += f"{role}: {turn.get('text', '')}\n"

    full_prompt = (
        f"{system_instruction}\n\n"
        f"Conversation History:\n{history_prompt}\n"
        f"User Question: {user_message}\n"
        f"Assistant:"
    )

    try:
        response = requests.post(
            f"{GEMINI_API_URL}?key={api_key}",
            json={
                "contents": [{"parts": [{"text": full_prompt}]}],
                "generationConfig": {
                    "temperature": 0.4,
                    "maxOutputTokens": 1200,
                },
            },
            timeout=25,
        )
        if response.status_code == 200:
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception:
        pass

    return _fallback_local_response(user_message, report)
