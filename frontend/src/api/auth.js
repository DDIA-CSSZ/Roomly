import { API_URL, ApiError, apiFetch } from './client'

/**
 * POST /auth/login
 *
 * IMPORTANT: backend-ul folosește OAuth2PasswordRequestForm, deci așteaptă
 * application/x-www-form-urlencoded, NU JSON. Câmpul se numește `username`
 * dar conține adresa de email.
 *
 * @returns {Promise<{ access_token: string, token_type: string }>}
 */
export async function login(email, password) {
  const body = new URLSearchParams()
  body.append('username', email)
  body.append('password', password)

  let response
  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
  } catch (networkErr) {
    throw new ApiError(
      'Nu mă pot conecta la server. Verifică dacă backend-ul rulează.',
      0,
      String(networkErr),
    )
  }

  if (!response.ok) {
    let detail = response.statusText
    try {
      const data = await response.json()
      if (data?.detail) detail = data.detail
    } catch {
      // ignore — non-JSON response
    }
    throw new ApiError(detail, response.status, detail)
  }

  return response.json()
}

/**
 * GET /auth/me — returnează user-ul asociat token-ului curent.
 * Folosit imediat după login (token-ul nu conține user data, doar `sub`).
 */
export async function getCurrentUser() {
  return apiFetch('/auth/me')
}

export async function register(payload) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
