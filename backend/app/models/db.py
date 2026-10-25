"""
Database setup (SQLite via SQLAlchemy) for storing analysis history.
"""
import datetime
import json
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite:///./resume_matcher.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class AnalysisRecord(Base):
    __tablename__ = "analysis_records"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    resume_filename = Column(String, nullable=True)
    jd_filename = Column(String, nullable=True)
    resume_text = Column(Text)
    jd_text = Column(Text)
    result_json = Column(Text)  # full analysis report, serialized
    suggestions_text = Column(Text, nullable=True)  # cached AI-generated suggestions

    def to_dict(self):
        res = json.loads(self.result_json) if self.result_json else None
        if res and isinstance(res, dict) and "skill_gap" in res:
            gap = res["skill_gap"]
            if isinstance(gap, dict) and "missing_skills" in gap:
                gap["missing_skills"] = [
                    {"skill": m, "category": "other"} if isinstance(m, str)
                    else {
                        "skill": m.get("skill", "") if isinstance(m, dict) else str(m),
                        "category": (m.get("category") or "other") if isinstance(m, dict) else "other"
                    }
                    for m in gap["missing_skills"]
                ]
            if isinstance(gap, dict) and "partial_matches" in gap:
                gap["partial_matches"] = [
                    {
                        "skill": p.get("skill", "") if isinstance(p, dict) else str(p),
                        "category": (p.get("category") or "other") if isinstance(p, dict) else "other",
                        "related_skill_found": p.get("related_skill_found", []) if isinstance(p, dict) and isinstance(p.get("related_skill_found"), list) else [],
                    }
                    for p in gap["partial_matches"]
                ]
        return {
            "id": self.id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "resume_filename": self.resume_filename,
            "jd_filename": self.jd_filename,
            "result": res,
            "suggestions": self.suggestions_text,
        }


def init_db():
    Base.metadata.create_all(bind=engine)
    _ensure_suggestions_column()


def _ensure_suggestions_column():
    """Lightweight auto-migration: if you already have a resume_matcher.db
    from before this column existed, add it in place instead of requiring
    you to delete your history and start over."""
    inspector = inspect(engine)
    if "analysis_records" not in inspector.get_table_names():
        return
    columns = [c["name"] for c in inspector.get_columns("analysis_records")]
    if "suggestions_text" not in columns:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE analysis_records ADD COLUMN suggestions_text TEXT"))
            conn.commit()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()