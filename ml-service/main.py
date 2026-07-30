from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from classifier import DocumentClassifier

app = FastAPI(title="Document Classifier ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:8082", "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

classifier = DocumentClassifier()


class ClassifyRequest(BaseModel):
    filename: str
    content: str = ""


class ClassifyResponse(BaseModel):
    type: str
    confidence: int
    matched_keywords: list


@app.get("/")
def root():
    return {
        "service": "Document Classifier ML Service",
        "version": "1.0.0",
        "endpoints": {
            "POST /classify": "Classify a document",
            "GET /health": "Health check"
        }
    }


@app.get("/favicon.ico")
def favicon():
    return JSONResponse(content={}, status_code=204)


@app.post("/classify", response_model=ClassifyResponse)
def classify_document(request: ClassifyRequest):
    try:
        result = classifier.classify(request.filename, request.content)
        return ClassifyResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health_check():
    categories = [k for k in classifier.CATEGORIES.keys() if k != "OTHER"]
    return {
        "status": "ok",
        "service": "document-classifier",
        "categories": categories,
        "keyword_count": sum(len(v) for v in classifier.CATEGORIES.values())
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
