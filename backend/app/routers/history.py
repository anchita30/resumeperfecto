from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.db import get_db, AnalysisRecord

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("/")
def list_history(limit: int = 20, db: Session = Depends(get_db)):
    records = (
        db.query(AnalysisRecord)
        .order_by(desc(AnalysisRecord.created_at))
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "created_at": r.created_at.isoformat(),
            "resume_filename": r.resume_filename,
            "jd_filename": r.jd_filename,
        }
        for r in records
    ]


@router.get("/{record_id}")
def get_history_item(record_id: int, db: Session = Depends(get_db)):
    record = db.query(AnalysisRecord).filter(AnalysisRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis record not found.")
    return record.to_dict()


@router.delete("/{record_id}")
def delete_history_item(record_id: int, db: Session = Depends(get_db)):
    record = db.query(AnalysisRecord).filter(AnalysisRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis record not found.")
    db.delete(record)
    db.commit()
    return {"status": "deleted", "id": record_id}

