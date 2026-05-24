import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()


api_key = os.getenv("GEMINI_API_KEY")
model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable is not set. Please set it before running this script.")


genai.configure(api_key=api_key)
model = genai.GenerativeModel(model_name)

def call_llm(messages: list) -> str:

    response = model.generate_content(
        config={"temperature": 0.3, "top_p": 0.9, "max_output_tokens": 512},
        contents=messages
    )

    return response.text


