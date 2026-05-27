from pypdf import PdfReader


def extract_text_from_pdf(file_path: str) -> str:
    full_text = ""
    reader = PdfReader(file_path)
    for page in reader.pages:
        text = page.extract_text()

        if text:
            full_text += text + "\n"
    
    return full_text
    