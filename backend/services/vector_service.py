from uuid import uuid4

# This dictionary will store all uploaded documents while the server is running.
documents = {}


def save_document(text: str) -> str:
    """
    Save uploaded text and return a unique document_id.
    """
    document_id = str(uuid4())
    documents[document_id] = text
    return document_id


def get_document(document_id: str) -> str | None:
    """
    Find document text by document_id.
    """
    if(document_id in documents):
        return documents[document_id]
    else:
        return None


def delete_document(document_id: str) -> bool:
    """
    Delete a document by document_id.
    """
    if(document_id in documents): 
        del(documents[document_id])
        return True
    else:
        return False