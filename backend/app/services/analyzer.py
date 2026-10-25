"""
Analysis orchestrator: combines skill extraction, semantic similarity,
and skill gap analysis into a single report, with an overall match score.
"""
from app.services import skill_extractor, matcher


def compute_skill_gap(resume_skills: list, jd_skills: list) -> dict:
    resume_names = {s["name"] for s in resume_skills}
    jd_names = {s["name"] for s in jd_skills}
    jd_category_by_name = {s["name"]: s["category"] for s in jd_skills}

    matched = sorted(jd_names & resume_names)

    missing = []
    partial = []
    for jd_skill in sorted(jd_names - resume_names):
        related = skill_extractor.related_skills(jd_skill)
        category = jd_category_by_name.get(jd_skill, "other")
        if related & resume_names:
            partial.append({
                "skill": jd_skill,
                "category": category,
                "related_skill_found": sorted(related & resume_names),
            })
        else:
            # category is included so the frontend can pick relevant
            # "learn this skill" sources — e.g. a coding-tutorial site
            # like freeCodeCamp has nothing for soft skills like
            # "communication", so it should only be offered for
            # technical categories.
            missing.append({"skill": jd_skill, "category": category})

    extra = sorted(resume_names - jd_names)

    # Calculate effective coverage (giving 0.5 partial credit for related skills)
    partial_credit = 0.5 * len(partial)
    effective_matched = len(matched) + partial_credit
    coverage = min(1.0, effective_matched / len(jd_names)) if jd_names else 1.0

    return {
        "matched_skills": matched,
        "partial_matches": partial,
        "missing_skills": missing,
        "extra_resume_skills": extra,
        "skill_coverage_pct": round(coverage * 100, 1),
        "jd_skill_count": len(jd_names),
        "matched_count": len(matched),
    }


def compute_overall_score(semantic_result: dict, skill_coverage_pct: float) -> dict:
    """
    Weighted blend: 75% skill coverage (direct skill overlap + partial match credit),
    25% semantic similarity (TF-IDF + TF-IDF-weighted Word2Vec). Skill coverage is the
    dominant criterion in ATS match scoring so candidates missing most required skills
    properly score low, while semantic similarity provides a secondary phrasing fit signal.
    """
    semantic_pct = semantic_result["combined_score"] * 100
    overall = round(0.75 * skill_coverage_pct + 0.25 * semantic_pct, 1)

    if overall >= 80:
        verdict = "Strong match"
    elif overall >= 60:
        verdict = "Good match, some gaps"
    elif overall >= 40:
        verdict = "Moderate match, notable gaps"
    else:
        verdict = "Weak match"

    return {
        "overall_score": overall,
        "semantic_score_pct": round(semantic_pct, 1),
        "tfidf_score_pct": round(semantic_result["tfidf_score"] * 100, 1),
        "word2vec_score_pct": (
            round(semantic_result["word2vec_score"] * 100, 1)
            if semantic_result["word2vec_score"] is not None
            else None
        ),
        "skill_coverage_pct": skill_coverage_pct,
        "verdict": verdict,
        "note": semantic_result["note"],
    }


def analyze(resume_text: str, jd_text: str) -> dict:
    # For SKILL EXTRACTION only, scope to the resume's actual skills section
    # if we can find one — otherwise a taxonomy word that merely appears in
    # a project title (e.g. "... Mentoring Platform") gets wrongly tagged
    # as a personal skill. Semantic matching below still uses the FULL
    # resume_text, since project descriptions genuinely matter there.
    resume_skills_section = skill_extractor.extract_resume_skills_section(resume_text)
    resume_skill_data = skill_extractor.extract_skills(resume_skills_section or resume_text)
    jd_skill_data = skill_extractor.extract_skills(jd_text)

    gap = compute_skill_gap(resume_skill_data["skills"], jd_skill_data["skills"])

    semantic_result = matcher.overall_similarity(resume_text, jd_text)
    weak_sections = matcher.section_level_similarity(resume_text, jd_text)

    scoring = compute_overall_score(semantic_result, gap["skill_coverage_pct"])

    return {
        "scoring": scoring,
        "skill_gap": gap,
        "resume_skills_by_category": resume_skill_data["by_category"],
        "jd_skills_by_category": jd_skill_data["by_category"],
        "weakest_covered_jd_sections": weak_sections,
    }