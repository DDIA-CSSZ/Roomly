import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import './LoginPage.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const redirectTo = location.state?.from?.pathname || '/dashboard'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Te rugăm să introduci adresa de email.')
      return
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Adresa de email nu pare validă.')
      return
    }
    if (!password) {
      setError('Te rugăm să introduci parola.')
      return
    }

    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      if (err.status === 401) {
        setError('Email sau parolă incorectă.')
      } else if (err.status === 403) {
        setError('Contul este inactiv. Contactează administratorul.')
      } else if (err.status === 0) {
        setError(err.message)
      } else {
        setError(err.message || 'A apărut o eroare. Încearcă din nou.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login">
      <aside className="login__brand" aria-hidden="true">
        <div className="login__brand-noise" />

        <header className="login__brand-header">
          <span className="login__wordmark">Roomly</span>
          <span className="login__est">EST. MMXXVI</span>
        </header>

        <div className="login__brand-art">
          <svg
            viewBox="0 0 320 320"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M160 24 C 160 48, 196 60, 196 92" opacity="0.55" />
            <g transform="rotate(8 196 200)">
              <rect x="116" y="92" width="160" height="216" rx="10" ry="10" />
              <circle cx="196" cy="108" r="4.5" />
              <rect x="132" y="140" width="128" height="2" opacity="0.6" />
              <text
                x="196"
                y="208"
                fontFamily="'Fraunces', serif"
                fontStyle="italic"
                fontWeight="500"
                fontSize="56"
                textAnchor="middle"
                fill="currentColor"
                stroke="none"
              >
                101
              </text>
              <text
                x="196"
                y="244"
                fontFamily="'Geist', sans-serif"
                fontSize="9"
                letterSpacing="3"
                textAnchor="middle"
                fill="currentColor"
                stroke="none"
                opacity="0.7"
              >
                CAMERĂ · ROOM
              </text>
              <path d="M148 282 L 244 282" opacity="0.5" />
            </g>
          </svg>
        </div>

        <footer className="login__brand-footer">
          <p className="login__pull-quote">
            Ospitalitate,
            <br />
            <em>fără efort.</em>
          </p>
          <span className="login__pull-attr">— Echipa Roomly</span>
        </footer>
      </aside>

      <main className="login__form-panel">
        <div className="login__form-container">
          <div className="login__mobile-wordmark">Roomly</div>

          <header className="login__form-header">
            <h1>Bine ai venit</h1>
            <p>Autentifică-te pentru a-ți accesa contul.</p>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Adresă de email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nume@hotel.com"
                autoComplete="email"
                autoFocus
                disabled={submitting}
                aria-invalid={!!error}
              />
            </div>

            <div className="field">
              <div className="field__label-row">
                <label htmlFor="password">Parolă</label>
                <button
                  type="button"
                  className="field__toggle"
                  onClick={() => setShowPassword((s) => !s)}
                  tabIndex={-1}
                >
                  {showPassword ? 'Ascunde' : 'Arată'}
                </button>
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={submitting}
                aria-invalid={!!error}
              />
            </div>

            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="login__submit" disabled={submitting}>
              {submitting ? 'Se autentifică...' : 'Autentificare'}
            </button>

            <Link className="login__forgot-link" to="/forgot-password">
              Am uitat parola
            </Link>
          </form>

          <p className="login__footer-link">
            Nu ai un cont? <Link to="/register">Creează contul aici →</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
