// Centralizează apelurile HTTP către backend.
// Toate fișierele din src/api/* trebuie să folosească helper-ele de aici,
// ca să nu împrăștiem fetch-uri prin componente.

export const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000'

const STORAGE_TOKEN = 'roomly_token'

export function getToken() {
  return localStorage.getItem(STORAGE_TOKEN)
}

export function setToken(token) {
  if (token) localStorage.setItem(STORAGE_TOKEN, token)
  else localStorage.removeItem(STORAGE_TOKEN)
}

/**
 * Eroare custom care păstrează statusul HTTP + detail-ul din FastAPI.
 * Asta ne permite în UI să decidem mesajul corect (401 vs 403 vs network).
 */
export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

/**
 * Wrapper peste fetch pentru endpoint-urile JSON ale backend-ului.
 * - Adaugă automat Authorization: Bearer <token>
 * - Trimite JSON dacă body-ul nu e deja FormData/URLSearchParams
 * - Aruncă ApiError dacă status >= 400
 */
export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) }

  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  // JSON implicit, exceptând form-data și URLSearchParams (folosite la /auth/login)
  const isForm =
    options.body instanceof FormData ||
    options.body instanceof URLSearchParams
  if (options.body && !isForm && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  let response
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch (networkErr) {
    // Backend oprit, CORS blocked, etc. — fetch aruncă TypeError fără response.
    throw new ApiError(
      'Nu mă pot conecta la server. Verifică dacă backend-ul rulează.',
      0,
      String(networkErr),
    )
  }

  if (!response.ok) {
    let detail = response.statusText || 'Eroare necunoscută'
    try {
      const data = await response.json()
      if (data?.detail) detail = data.detail
    } catch {
      // răspuns non-JSON, lăsăm statusText
    }
    throw new ApiError(detail, response.status, detail)
  }

  if (response.status === 204) return null
  return response.json()
}
