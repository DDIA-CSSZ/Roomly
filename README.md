## Setup local

1. `pip install -r requirements.txt`
2. Copiază `.env.example` → `.env` și completează `SECRET_KEY`
3. `python seed.py`         # creează tabele + date demo
4. `uvicorn main:app --reload`
5. Deschide http://localhost:8000/docs