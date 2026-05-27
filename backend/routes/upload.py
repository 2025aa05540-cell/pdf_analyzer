from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel
from services import pdf_service, vector_service


router = APIRouter()
MAX_PDF_SIZE_MB = 5
MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024

class UploadTextRequest(BaseModel):
    text : str

@router.post("/text")
def text_upload(request : UploadTextRequest):
    if(request.text.strip() =="" or len(request.text)>20000):
        raise HTTPException(status_code=400, detail="Correct the text size before you request further")

    generated_id = vector_service.save_document(request.text)

    return {
        "message" : "Text accepted!!",
        "document_id" : generated_id
    }

@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400,detail="Only PDF files are allowed")

    contents = await file.read()

    if len(contents) > MAX_PDF_SIZE_BYTES:
        raise HTTPException(status_code=400,detail=f"PDF is too large. Maximum allowed size is {MAX_PDF_SIZE_MB} MB")
    
    unique_filename = f"{uuid4()}.pdf"
    file_path = f"uploaded_files/{unique_filename}"

    with open(file_path, "wb") as buffer:
        buffer.write(contents)

    text = pdf_service.extract_text_from_pdf(file_path)
    document_id = vector_service.save_document(text)

    return {"filename": file.filename,"content_type": file.content_type, "document_id": document_id}
