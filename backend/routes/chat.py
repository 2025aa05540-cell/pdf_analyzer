from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.llm_service import call_llm

router = APIRouter()

# So BaseModel means: "This class should behave like a validated request/response model."
class ChatRequest(BaseModel):
    question: str

@router.post("/chat")
def chat(request : ChatRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    answer = call_llm(request.question)
    return {
        "response" : answer
    }
