# ROOMLY 🏨

**Platformă web pentru gestionarea cererilor și serviciilor hoteliere**

---

## 📖 Descrierea Proiectului
ROOMLY este o soluție software completă, concepută pentru a facilita comunicarea în timp real dintre oaspeți și personalul hotelului. Această aplicație digitalizează și automatizează procesul de gestionare a cererilor de servicii, eliminând întârzierile și erorile de comunicare apărute în sistemele tradiționale.

## ✨ Funcționalități Principale
* **Autentificare și Autorizare:** Sistem securizat bazat pe tokeni JWT, cu 4 roluri distincte: GUEST, RECEPTIONIST, STAFF și ADMIN.
* **Dashboard Personalizat:** Interfețe dinamice și diferențiate în funcție de rolul utilizatorului (ex: oaspeții văd serviciile disponibile, recepția vede toate cererile, iar staff-ul doar pe cele alocate lor).
* **Gestionarea Cererilor:** Sistem complet pentru crearea, alocarea, prioritizarea (low, normal, urgent) și urmărirea cererilor (Room Service, Housekeeping, Mentenanță, Consumabile).
* **Sistem de Comunicare:** Jurnal de evenimente și secțiune de comentarii atașate fiecărei cereri pentru trasabilitate completă.
* **Administrare:** Module dedicate pentru gestionarea camerelor și a utilizatorilor de către personalul autorizat.

## 🛠️ Tehnologii Utilizate

**Frontend**
* **React 19 & Vite 8:** Pentru o interfață de utilizator extrem de rapidă și optimizată.
* **React Router DOM v7:** Pentru navigare client-side fluidă (fără reîncărcarea paginii).
* **CSS Modules:** Pentru o stilizare modulară și o separare clară a elementelor vizuale.

**Backend**
* **FastAPI:** Framework Python modern, asincron și de înaltă performanță pentru construirea API-ului RESTful.
* **SQLAlchemy 2.0 & SQLite:** ORM declarativ pentru gestionarea și persistența datelor.
* **Pydantic v2:** Pentru validarea strictă și automată a datelor de intrare.
* **PyJWT & Passlib (bcrypt):** Pentru autentificare securizată și hashing-ul parolelor.

## ⚙️ Arhitectură
Aplicația este construită pe o arhitectură client-server modernă, asigurând o decuplare clară între interfață și logica de business. Comunicarea între Frontend (care rulează pe portul 5173) și Backend (portul 8000) se realizează exclusiv prin cereri HTTP securizate cu Bearer Token.

## 🚀 Setup local

### Backend
1. `pip install -r requirements.txt`
2. Copiază `.env.example` → `.env` și completează `SECRET_KEY`
3. `python seed.py`        # creează tabele + date demo
4. `uvicorn main:app --reload`
5. Deschide http://localhost:8000/docs

### Frontend
1. Deschide un terminal nou și navighează în directorul de frontend (`cd frontend`)
2. `npm install`
3. `npm run dev`