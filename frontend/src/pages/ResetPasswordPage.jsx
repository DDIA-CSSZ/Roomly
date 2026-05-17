import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/auth'
import './LoginPage.css'
import './PasswordResetPage.css'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const token = useMemo(() => searchParams.get('token') || '', [searchParams])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!token) {
      setError('Linkul de resetare lipsește sau este invalid.')
      return
    }
    if (password.length < 8) {
      setError('Parola trebuie să aibă minimum 8 caractere.')
      return
    }
    if (password !== confirmPassword) {
      setError('Parolele nu coincid.')
      return
    }

    setSubmitting(true)
    try {
      const response = await resetPassword(token, password)
      setMessage(response?.message || 'Parola a fost resetată cu succes.')
      setPassword('')
      setConfirmPassword('')
      window.setTimeout(() => navigate('/login', { replace: true }), 900)
    } catch (err) {
      setError(err?.message || 'Nu am putut reseta parola.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login password-reset">
      <main className="login__form-panel password-reset__panel">
        <div className="login__form-container">
          <div className="login__mobile-wordmark">Roomly</div>

          <header className="login__form-header">
            <h1>Resetare parolă</h1>
            <p>Alege o parolă nouă pentru contul tău.</p>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <div className="field__label-row">
                <label htmlFor="new-password">Parolă nouă</label>
                <button
                  type="button"
                  className="field__toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  tabIndex={-1}
                >
                  {showPassword ? 'Ascunde' : 'Arată'}
                </button>
              </div>
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 caractere"
                autoComplete="new-password"
                disabled={submitting}
              />
            </div>

            <div className="field">
              <div className="field__label-row">
                <label htmlFor="confirm-password">Confirmă parola</label>
                <button
                  type="button"
                  className="field__toggle"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? 'Ascunde' : 'Arată'}
                </button>
              </div>
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repetă parola"
                autoComplete="new-password"
                disabled={submitting}
              />
            </div>

            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}

            {message && (
              <div className="password-reset__message" role="status">
                <p>{message}</p>
              </div>
            )}

            <button type="submit" className="login__submit" disabled={submitting}>
              {submitting ? 'Se salvează...' : 'Resetează parola'}
            </button>
          </form>

          <p className="login__footer-link">
            <Link to="/login">Înapoi la login</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
