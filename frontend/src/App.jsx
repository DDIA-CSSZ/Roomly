import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardPlaceholder from './pages/DashboardPlaceholder'
import ProtectedRoute from './components/ProtectedRoute'

/**
 * Wrapper care decide unde duci utilizatorul când lovește "/".
 * Dacă e autentificat → /dashboard. Altfel → /login.
 */
function RootRedirect() {
  const { isAuthenticated, bootstrapping } = useAuth()
  if (bootstrapping) return null // ProtectedRoute oricum afișează loading state
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPlaceholder />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
