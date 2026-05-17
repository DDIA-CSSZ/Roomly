import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, bootstrapping } = useAuth()
  const location = useLocation()

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
