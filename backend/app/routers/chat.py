import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.db import get_db, AnalysisRecord
from app.services.chat import generate_chat_response

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatMessageTurn(BaseModel):
    role: str
    text: str


class ChatRequest(BaseModel):
    message: str
    report_id: Optional[int] = None
    conversation: Optional[List[ChatMessageTurn]] = None


@router.post("")
def chat_endpoint(req: ChatRequest, db: Session = Depends(get_db)):
    record = None
    if req.report_id:
        record = db.query(AnalysisRecord).filter(AnalysisRecord.id == req.report_id).first()

    # If no report_id was provided or not found, automatically load the latest analysis
    if not record:
        record = db.query(AnalysisRecord).order_by(desc(AnalysisRecord.created_at)).first()

    report_data = None
    if record:
        dict_rep = record.to_dict()
        report_data = dict_rep.get("result")

    conv_list = [t.dict() for t in req.conversation] if req.conversation else []
    reply = generate_chat_response(req.message, report_data, conv_list)

    return {
        "reply": reply,
        "report_id": record.id if record else None,
    }
