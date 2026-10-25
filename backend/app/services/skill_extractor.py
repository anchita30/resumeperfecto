"""
Skill extraction service.
Matches known skills (from the taxonomy) against text using
word-boundary-aware phrase matching, handling multi-word skills
and common variants.
"""
import json
import re
from pathlib import Path
from functools import lru_cache

TAXONOMY_PATH = Path(__file__).resolve().parent.parent / "data" / "skills_taxonomy.json"


@lru_cache(maxsize=1)
def load_taxonomy() -> dict:
    with open(TAXONOMY_PATH, "r") as f:
        return json.load(f)


# Headers that commonly mark the start of a resume's dedicated skills
# section, and headers that mark the start of the NEXT section (so we know
# where the skills section ends). Used to avoid picking up skill-taxonomy
# words that merely appear inside a project title/description (e.g. a
# project called "... Mentoring Platform" wrongly tagging "mentoring" as
# a personal skill) rather than an actual declared skill.
_SKILLS_SECTION_START = [
    "technical skills", "core skills", "key skills", "skills",
    "technologies", "tech stack", "core competencies",
]
_SKILLS_SECTION_END = [
    "projects", "personal projects", "experience", "work experience",
    "professional experience", "education", "certifications",
    "certifications & internships", "internships", "achievements",
    "publications", "awards", "extracurricular",
]


def extract_resume_skills_section(text: str):
    """
    Try to isolate just the resume's dedicated skills section (e.g. the
    block under a "Technical Skills" heading), so skill matching doesn't
    pick up taxonomy words that merely appear inside a project title or
    description elsewhere in the resume.

    Returns the isolated section text, or None if no clear skills-section
    heading was found (caller should fall back to scanning the full text
    in that case, rather than risk under-extracting from a resume that
    doesn't use this heading style at all).
    """
    lines = text.split("\n")
    start_idx = None
    for i, line in enumerate(lines):
        clean = line.strip().strip(":").lower()
        if len(clean) <= 30 and clean in _SKILLS_SECTION_START:
            start_idx = i
            break

    if start_idx is None:
        return None

    end_idx = len(lines)
    for j in range(start_idx + 1, len(lines)):
        clean = lines[j].strip().strip(":").lower()
        if len(clean) <= 30 and clean in _SKILLS_SECTION_END:
            end_idx = j
            break

    section = "\n".join(lines[start_idx:end_idx]).strip()
    return section if section else None


@lru_cache(maxsize=1)
def flat_skill_list() -> list:
    """Flattened list of (skill, category) tuples, longest-first so multi-word
    skills are matched before their substrings (e.g. 'react native' before 'react')."""
    taxonomy = load_taxonomy()
    pairs = []
    for category, skills in taxonomy.items():
        for skill in skills:
            pairs.append((skill.lower(), category))
    pairs.sort(key=lambda x: len(x[0]), reverse=True)
    return pairs


def _build_pattern(skill: str) -> re.Pattern:
    """Build a word-boundary regex for a skill phrase, tolerant of
    punctuation like '.', '+', '#' inside the skill name (e.g. c++, node.js)."""
    escaped = re.escape(skill)
    return re.compile(rf"(?<![a-zA-Z0-9]){escaped}(?![a-zA-Z0-9])", re.IGNORECASE)


def extract_skills(text: str) -> dict:
    """
    Returns a dict:
    {
        "skills": [{"name": str, "category": str}, ...],
        "by_category": {category: [skill, ...]}
    }
    """
    text_lower = text.lower()
    found = []
    seen = set()

    for skill, category in flat_skill_list():
        if skill in seen:
            continue
        pattern = _build_pattern(skill)
        if pattern.search(text_lower):
            found.append({"name": skill, "category": category})
            seen.add(skill)

    by_category = {}
    for item in found:
        by_category.setdefault(item["category"], []).append(item["name"])

    return {"skills": found, "by_category": by_category}


# Simple synonym map to catch related-but-not-identical skills for
# "partial match" categorization during gap analysis.
SYNONYMS = {
    "react": {"react.js", "reactjs", "react native"},
    "react.js": {"react", "reactjs"},
    "reactjs": {"react", "react.js"},
    "node.js": {"nodejs", "express.js", "express"},
    "nodejs": {"node.js", "express.js", "express"},
    "postgresql": {"postgres"},
    "postgres": {"postgresql"},
    "machine learning": {"deep learning", "scikit-learn", "tensorflow", "pytorch"},
    "aws": {"amazon web services"},
    "amazon web services": {"aws"},
    "gcp": {"google cloud platform"},
    "google cloud platform": {"gcp"},
    "k8s": {"kubernetes"},
    "kubernetes": {"k8s"},
}


def related_skills(skill: str) -> set:
    return SYNONYMS.get(skill.lower(), set())