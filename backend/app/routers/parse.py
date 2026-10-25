from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.parser import parse_document, ParsingError

router = APIRouter(prefix="/api/parse", tags=["parse"])


@router.post("/")
async def parse_uploaded_file(file: UploadFile = File(...)):
    """Parse an uploaded PDF/DOCX/TXT file and return extracted plain text."""
    file_bytes = await file.read()
    try:
        text = parse_document(file.filename, file_bytes)
    except ParsingError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"filename": file.filename, "text": text, "char_count": len(text)}
