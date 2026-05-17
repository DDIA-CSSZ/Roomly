import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import NewRequestPage from './pages/NewRequestPage'
import MyRequestsPage from './pages/MyRequestsPage'
import RequestDetailsPage from './pages/RequestDetailsPage'
import ProfilePage from './pages/ProfilePage'
import UsersPage from './pages/UsersPage'
import RoomsPage from './pages/RoomsPage'
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
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/new-request"
            element={
              <ProtectedRoute>
                <NewRequestPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-requests"
            element={
              <ProtectedRoute>
                <MyRequestsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/requests/:id"
            element={
              <ProtectedRoute>
                <RequestDetailsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <UsersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/rooms"
            element={
              <ProtectedRoute>
                <RoomsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
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
