import json
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session

from app.services.parser import parse_document, clean_text, ParsingError
from app.services.analyzer import analyze
from app.models.db import get_db, AnalysisRecord

router = APIRouter(prefix="/api", tags=["analyze"])


def _is_real_upload(value) -> bool:
    """A real upload has a non-empty `.filename` and a `.read()` method.

    We deliberately avoid isinstance(value, UploadFile) here — depending on
    exact FastAPI/Starlette versions, the object returned by request.form()
    for a file field may or may not be an instance of whichever UploadFile
    class we import, and that mismatch has already caused false negatives
    once. Duck-typing on the actual attributes we need (filename + read)
    works regardless of which exact class is involved.
    """
    filename = getattr(value, "filename", None)
    has_read = callable(getattr(value, "read", None))
    return has_read and bool(filename) and bool(str(filename).strip())


@router.post("/analyze")
async def analyze_endpoint(request: Request, db: Session = Depends(get_db)):
    """
    Accepts EITHER uploaded files OR raw text for resume and JD (any
    combination — e.g. resume as a file, JD as pasted text).

    NOTE: this reads the raw multipart form directly via request.form()
    instead of declaring resume_file/jd_file as typed FastAPI parameters.
    Declaring those as Union[UploadFile, str, None] previously caused
    FastAPI/Pydantic to sometimes coerce a genuine file upload into
    something that failed `isinstance(value, UploadFile)`, making every
    upload look like "no file provided" even when one was attached.
    Parsing the form manually sidesteps that entirely.
    """
    form = await request.form()

    resume_file = form.get("resume_file")
    jd_file = form.get("jd_file")
    resume_text = form.get("resume_text")
    jd_text = form.get("jd_text")

    # TEMPORARY DEBUG — remove once the upload issue is confirmed fixed.
    # Prints exactly what type/value each field arrived as, so if this
    # still fails we know immediately instead of guessing again.
    print("=== /api/analyze debug ===")
    print(f"resume_file: type={type(resume_file)!r} value={resume_file!r}")
    print(f"jd_file:     type={type(jd_file)!r} value={jd_file!r}")
    print(f"resume_text: type={type(resume_text)!r} len={len(resume_text) if resume_text else 0}")
    print(f"jd_text:     type={type(jd_text)!r} len={len(jd_text) if jd_text else 0}")
    print(f"_is_real_upload(resume_file) = {_is_real_upload(resume_file)}")
    print("===========================")

    resume_filename = None
    jd_filename = None

    try:
        if _is_real_upload(resume_file):
            resume_bytes = await resume_file.read()
            resume_text = parse_document(resume_file.filename, resume_bytes)
            resume_filename = resume_file.filename
        elif resume_text and str(resume_text).strip():
            resume_text = clean_text(str(resume_text).strip())
        else:
            raise HTTPException(status_code=400, detail="No resume provided (file or text).")

        if _is_real_upload(jd_file):
            jd_bytes = await jd_file.read()
            jd_text = parse_document(jd_file.filename, jd_bytes)
            jd_filename = jd_file.filename
        elif jd_text and str(jd_text).strip():
            jd_text = clean_text(str(jd_text).strip())
        else:
            raise HTTPException(status_code=400, detail="No job description provided (file or text).")

    except ParsingError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not resume_text or not jd_text:
        raise HTTPException(status_code=400, detail="Resume or job description text is empty.")

    result = analyze(resume_text, jd_text)

    record = AnalysisRecord(
        resume_filename=resume_filename,
        jd_filename=jd_filename,
        resume_text=resume_text,
        jd_text=jd_text,
        result_json=json.dumps(result),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {"id": record.id, "created_at": record.created_at.isoformat(), **result}