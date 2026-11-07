from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
# SAFE: Explicit origin whitelist
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.proofforge.ai"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
