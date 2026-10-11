import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import (
    admin_articles,
    admin_terms,
    articles,
    auth,
    compare,
    history,
    perspective,
    search,
    sources,
    topics,
)

app = FastAPI(title="News Perspective Explorer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# P1
app.include_router(auth.router)
app.include_router(topics.router)
app.include_router(search.router)
app.include_router(articles.router)
app.include_router(admin_articles.router)

# P2
app.include_router(sources.router)
app.include_router(perspective.router)
app.include_router(compare.router)
app.include_router(history.router)
app.include_router(admin_terms.router)


@app.get("/health")
def health():
    return {"status": "ok"}
