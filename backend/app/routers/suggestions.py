import json
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.models.db import get_db, AnalysisRecord
from app.services.suggestions import generate_suggestions, SuggestionsError

router = APIRouter(prefix="/api", tags=["suggestions"])


@router.post("/report/{report_id}/suggestions")
def get_or_generate_suggestions(report_id: int, db: Session = Depends(get_db)):
    """
    Returns cached suggestions if this report already has them, otherwise
    calls Gemini once and caches the result on the record so re-opening the
    same report (or re-downloading its PDF) doesn't call the API again.
    """
    record = db.query(AnalysisRecord).filter(AnalysisRecord.id == report_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Report not found.")

    if record.suggestions_text:
        return {"suggestions": record.suggestions_text, "cached": True}

    report = json.loads(record.result_json)

    try:
        suggestions = generate_suggestions(report)
    except SuggestionsError as e:
        raise HTTPException(status_code=502, detail=str(e))

    record.suggestions_text = suggestions
    db.commit()

    return {"suggestions": suggestions, "cached": False}