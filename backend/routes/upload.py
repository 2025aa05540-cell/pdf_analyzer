import os
from pathlib import Path
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel
from services import pdf_service, vector_service


load_dotenv()

router = APIRouter()
MAX_PDF_SIZE_MB = int(os.getenv("MAX_PDF_SIZE_MB", 5))
MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024
MAX_TEXT_CHARACTERS = int(os.getenv("MAX_TEXT_CHARACTERS", 20000))
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploaded_files"
UPLOAD_DIR.mkdir(exist_ok=True)


class UploadTextRequest(BaseModel):
    text: str


@router.post("/text")
def text_upload(request: UploadTextRequest):
    if request.text.strip() == "" or len(request.text) > MAX_TEXT_CHARACTERS:
        raise HTTPException(
            status_code=400,
            detail=f"Text must not be empty and must be under {MAX_TEXT_CHARACTERS} characters",
        )

    generated_id = vector_service.save_document(request.text)

    return {
        "message": "Text accepted!!",
        "document_id": generated_id,
    }


@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    contents = await file.read()

    if len(contents) > MAX_PDF_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"PDF is too large. Maximum allowed size is {MAX_PDF_SIZE_MB} MB",
        )

    unique_filename = f"{uuid4()}.pdf"
    file_path = UPLOAD_DIR / unique_filename

    file_path.write_bytes(contents)

    try:
        text = pdf_service.extract_text_from_pdf(str(file_path))
    finally:
        file_path.unlink(missing_ok=True)

    if text.strip() == "":
        raise HTTPException(
            status_code=400,
            detail="No readable text was found in this PDF",
        )

    document_id = vector_service.save_document(text)

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "document_id": document_id,
    }
