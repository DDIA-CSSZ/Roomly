import { createContext, useContext, useEffect, useState } from 'react'
import {
  login as apiLogin,
  getCurrentUser as apiGetCurrentUser,
} from '../api/auth'
import { getToken, setToken } from '../api/client'

const STORAGE_USER = 'roomly_user'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // User-ul îl persistăm și-l rehidratăm la refresh, ca să nu blochezi UI-ul
  // așteptând /auth/me la fiecare reîncărcare.
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(STORAGE_USER)
    try {
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const [token, setTokenState] = useState(() => getToken())

  // În paralel, dacă avem token la mount, îl re-validăm cu backend-ul.
  // Dacă token-ul a expirat → curățăm storage-ul și forțăm re-login.
  const [bootstrapping, setBootstrapping] = useState(() => !!getToken())

  useEffect(() => {
    if (!token) {
      setBootstrapping(false)
      return
    }
    let cancelled = false
    apiGetCurrentUser()
      .then((fresh) => {
        if (cancelled) return
        setUser(fresh)
        localStorage.setItem(STORAGE_USER, JSON.stringify(fresh))
      })
      .catch(() => {
        if (cancelled) return
        // Token invalid / expirat → logout silențios
        localStorage.removeItem(STORAGE_USER)
        setToken(null)
        setTokenState(null)
        setUser(null)
      })
      .finally(() => {
        if (!cancelled) setBootstrapping(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function login(email, password) {
    const { access_token } = await apiLogin(email, password)
    setToken(access_token)
    setTokenState(access_token)

    const fresh = await apiGetCurrentUser()
    localStorage.setItem(STORAGE_USER, JSON.stringify(fresh))
    setUser(fresh)
    return fresh
  }

  function logout() {
    setToken(null)
    setTokenState(null)
    localStorage.removeItem(STORAGE_USER)
    setUser(null)
  }

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    bootstrapping,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth trebuie folosit în interiorul <AuthProvider>')
  return ctx
}
