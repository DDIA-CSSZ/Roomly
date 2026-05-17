import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../api/auth'
import './LoginPage.css'
import './PasswordResetPage.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const resetLink = useMemo(() => {
    if (!resetToken) return ''
    return `${window.location.origin}/reset-password?token=${encodeURIComponent(resetToken)}`
  }, [resetToken])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setResetToken('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Introdu adresa de email.')
      return
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError('Adresa de email nu pare validă.')
      return
    }

    setSubmitting(true)
    try {
      const response = await requestPasswordReset(trimmedEmail)
      setMessage(response?.message || 'Dacă emailul există, vei primi instrucțiuni pentru resetarea parolei.')
      setResetToken(response?.reset_token || '')
    } catch (err) {
      setError(err?.message || 'Nu am putut genera resetarea parolei.')
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
            <h1>Ai uitat parola?</h1>
            <p>Introdu emailul contului, iar Roomly va genera un link de resetare.</p>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="reset-email">Adresă de email</label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nume@hotel.com"
                autoComplete="email"
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
                {resetLink && (
                  <Link to={`/reset-password?token=${encodeURIComponent(resetToken)}`}>
                    Deschide linkul de resetare
                  </Link>
                )}
              </div>
            )}

            <button type="submit" className="login__submit" disabled={submitting}>
              {submitting ? 'Se generează...' : 'Generează link'}
            </button>
          </form>

          {resetLink && (
            <div className="password-reset__token">
              <span>Link demo</span>
              <code>{resetLink}</code>
            </div>
          )}

          <p className="login__footer-link">
            Ți-ai amintit parola? <Link to="/login">Înapoi la login</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
