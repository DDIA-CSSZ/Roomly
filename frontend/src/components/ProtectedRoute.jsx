import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Protejează o rută: dacă utilizatorul nu e autentificat, îl trimitem la /login,
 * dar păstrăm ruta originală în state.from ca să-l aducem înapoi după login.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, bootstrapping } = useAuth()
  const location = useLocation()

  // Cât timp re-validăm token-ul cu backend-ul la prima încărcare,
  // nu redirecționăm — altfel ai un flash de /login la fiecare refresh.
  if (bootstrapping) {
    return (
      <div
        style={{
          minHeight: '100svh',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text)',
          fontSize: 14,
        }}
      >
        Se încarcă...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}
