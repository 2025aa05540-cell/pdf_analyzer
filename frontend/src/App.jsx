import { useRef, useState } from "react";

import { askQuestion, uploadPdf, uploadText } from "./api/pdfApi.js";

const MAX_PDF_SIZE_MB = 5;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;
const MAX_TEXT_CHARACTERS = 20000;

function App() {
  const fileInputRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const [inputMode, setInputMode] = useState("pdf");
  const [file, setFile] = useState(null);
  const [textTitle, setTextTitle] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("Choose a PDF or paste text to begin.");
  const [toast, setToast] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);

  function showToast(type, message) {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToast({ type, message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  }

  async function handleDocumentSubmit(event) {
    event.preventDefault();

    if (inputMode === "pdf" && !file) {
      setStatus("Please choose a PDF file first.");
      showToast("error", "Choose a PDF before uploading.");
      return;
    }

    if (inputMode === "pdf" && file.size > MAX_PDF_SIZE_BYTES) {
      setStatus(`PDF is too large. Keep it under ${MAX_PDF_SIZE_MB} MB.`);
      showToast("error", `PDF must be under ${MAX_PDF_SIZE_MB} MB.`);
      return;
    }

    if (inputMode === "text" && !pastedText.trim()) {
      setStatus("Paste some text first.");
      showToast("error", "Paste text before saving.");
      return;
    }

    if (inputMode === "text" && pastedText.trim().length > MAX_TEXT_CHARACTERS) {
      setStatus(`Text is too long. Keep it under ${MAX_TEXT_CHARACTERS.toLocaleString()} characters.`);
      showToast("error", "Text is longer than the allowed limit.");
      return;
    }

    try {
      setIsUploading(true);
      setStatus(inputMode === "pdf" ? "Uploading PDF..." : "Saving pasted text...");
      const result =
        inputMode === "pdf"
          ? await uploadPdf(file)
          : await uploadText(textTitle.trim() || "Pasted text", pastedText.trim());
      setDocumentId(result.document_id);
      setMessages([]);
      setStatus(
        `${result.filename || result.title || file?.name || "Document"} is ready for questions.`,
      );
      showToast("success", "Document is ready for questions.");
    } catch (error) {
      setStatus(error.message);
      showToast("error", error.message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleQuestion(event) {
    event.preventDefault();

    if (!documentId) {
      setStatus("Upload a PDF before asking questions.");
      showToast("error", "Add a document before asking.");
      return;
    }

    if (!question.trim()) {
      setStatus("Type a question first.");
      showToast("error", "Type a question first.");
      return;
    }

    const userQuestion = question.trim();
    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: userQuestion,
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setQuestion("");

    try {
      setIsAsking(true);
      setStatus("Finding an answer...");
      const result = await askQuestion(documentId, userQuestion);
      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: result.answer,
      };
      setMessages((currentMessages) => [...currentMessages, assistantMessage]);
      setStatus("Answer generated.");
    } catch (error) {
      const errorMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: error.message,
      };
      setMessages((currentMessages) => [...currentMessages, errorMessage]);
      setStatus(error.message);
      showToast("error", error.message);
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <main className="app-shell">
      {toast && (
        <div className={`toast toast-${toast.type}`} role="status">
          {toast.message}
          <button type="button" onClick={() => setToast(null)} aria-label="Close toast">
            x
          </button>
        </div>
      )}

      <section className="workspace">
        <header className="page-header">
          <p className="eyebrow">AI PDF Analyzer</p>
          <h1>Upload a PDF and ask questions from its content.</h1>
        </header>

        <section className="upload-area">
          <section className="panel upload-panel">
            <div className="panel-heading">
              <h2>Document</h2>
              <div className="mode-switch" aria-label="Document input type">
                <button
                  type="button"
                  className={inputMode === "pdf" ? "active" : ""}
                  onClick={() => setInputMode("pdf")}
                >
                  PDF
                </button>
                <button
                  type="button"
                  className={inputMode === "text" ? "active" : ""}
                  onClick={() => setInputMode("text")}
                >
                  Text
                </button>
              </div>
            </div>

            <form onSubmit={handleDocumentSubmit} className="stack">
              {inputMode === "pdf" ? (
                <div className="pdf-picker">
                  <button
                    type="button"
                    className="browse-button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select PDF from folder
                  </button>
                  <span className="selected-file">
                    {file ? file.name : "No PDF selected"}
                  </span>
                  <span className="limit-note">
                    Maximum PDF size: {MAX_PDF_SIZE_MB} MB
                  </span>
                  <input
                    ref={fileInputRef}
                    className="file-input"
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => {
                      const selectedFile = event.target.files[0] || null;
                      setFile(selectedFile);

                      if (selectedFile && selectedFile.size > MAX_PDF_SIZE_BYTES) {
                        setStatus(`PDF is too large. Keep it under ${MAX_PDF_SIZE_MB} MB.`);
                        showToast("error", `PDF must be under ${MAX_PDF_SIZE_MB} MB.`);
                        return;
                      }

                      if (selectedFile) {
                        setStatus(`${selectedFile.name} selected.`);
                        showToast("success", "PDF selected.");
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="text-document">
                  <input
                    type="text"
                    value={textTitle}
                    onChange={(event) => setTextTitle(event.target.value)}
                    placeholder="Title, optional"
                  />
                  <textarea
                    value={pastedText}
                    onChange={(event) => {
                      setPastedText(event.target.value);

                      if (event.target.value.length > MAX_TEXT_CHARACTERS) {
                        setStatus(`Text is too long. Keep it under ${MAX_TEXT_CHARACTERS.toLocaleString()} characters.`);
                        showToast("error", "Text is longer than the allowed limit.");
                      }
                    }}
                    placeholder="Paste text here..."
                    rows="8"
                  />
                  <span className="limit-note">
                    {pastedText.length.toLocaleString()} / {MAX_TEXT_CHARACTERS.toLocaleString()} characters
                  </span>
                </div>
              )}

              <button type="submit" disabled={isUploading}>
                {isUploading ? "Saving..." : "Use this document"}
              </button>
            </form>
          </section>
        </section>

        <section className="chat-panel">
          <header className="chat-header">
            <h2>Chat</h2>
            <p className="status">{status}</p>
          </header>

          <div className="message-list">
            {messages.length === 0 ? (
              <div className="empty-chat">
                Add a PDF or paste text, then ask as many questions as you want.
              </div>
            ) : (
              messages.map((message) => (
                <article
                  key={message.id}
                  className={`message message-${message.role}`}
                >
                  <span>{message.role === "user" ? "You" : "AI"}</span>
                  <p>{message.text}</p>
                </article>
              ))
            )}
          </div>

          <form onSubmit={handleQuestion} className="chat-form">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask a question about the uploaded PDF..."
              rows="3"
            />

            <button type="submit" disabled={isAsking}>
              {isAsking ? "Thinking..." : "Send"}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}

export default App;
