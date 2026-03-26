from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Legatura frontend-backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def citeste_radacina():
    return {"mesaj": "Salutari din Backend-ul Roomly! API-ul functioneaza perfect."}