"""Skills loader for different article types."""
import os
from pathlib import Path

SKILLS_DIR = Path(__file__).parent

SKILL_FILES = {
    "SBLVO": "sblvo_skill.md",
    "SBONLY": "sbonly_skill.md",
    "干稿": "draft_skill.md",
    "SOT": "sot_skill.md",
    "LVO": "lvo_skill.md",
}

def load_skill(article_type: str) -> str:
    """Load skill content for given article type."""
    filename = SKILL_FILES.get(article_type)
    if not filename:
        return ""
    filepath = SKILLS_DIR / filename
    if not filepath.exists():
        return ""
    return filepath.read_text(encoding="utf-8")

def get_all_skills() -> dict[str, str]:
    """Load all skills."""
    return {t: load_skill(t) for t in SKILL_FILES}

# Pre-load all skills at module import
SKILLS_CACHE = get_all_skills()