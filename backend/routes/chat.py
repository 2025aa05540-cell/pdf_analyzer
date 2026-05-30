from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services import vector_service
from services.llm_service import call_llm

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    text: str

# So BaseModel means: "This class should behave like a validated request/response model."
class ChatRequest(BaseModel):
    document_id: str
    question: str
    history: List[ChatMessage] = []


@router.post("/chat")
def chat(request: ChatRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    txt = vector_service.get_document(request.document_id)

    if txt is None:
        raise HTTPException(status_code=404, detail="Document not found")
    
    prompt = f"""
        You are answering questions based only on this document  and provided previous Conversation:

        {txt}

        Question:
        {request.question}

        Previous conversation:
        {request.history}

        Reply only from the document and refer previous conversation. If the question is outside the document, say it is out of context though previous conversation is also irrelevant.
    """

    answer = call_llm(prompt)

    return {
        "answer": answer
    }
