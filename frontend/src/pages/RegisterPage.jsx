import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import './RegisterPage.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegisterPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  function validate() {
    const nextErrors = {}
    const trimmedName = fullName.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName) {
      nextErrors.fullName = 'Numele este obligatoriu.'
    }

    if (!trimmedEmail) {
      nextErrors.email = 'Emailul este obligatoriu.'
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      nextErrors.email = 'Adresa de email nu pare validă.'
    }

    if (!password) {
      nextErrors.password = 'Parola este obligatorie.'
    } else if (password.length < 8) {
      nextErrors.password = 'Parola trebuie să aibă minimum 8 caractere.'
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Confirmă parola.'
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Parolele nu coincid.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')
    setSuccessMessage('')

    if (!validate()) return

    setSubmitting(true)
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
      })
      setFullName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setErrors({})
      setSuccessMessage('Contul a fost creat cu succes. Camera poate fi alocată ulterior la recepție.')
    } catch (err) {
      if (err.status === 409) {
        setSubmitError('Există deja un cont cu acest email.')
      } else if (err.status === 0) {
        setSubmitError(err.message)
      } else {
        setSubmitError(err?.message || 'Nu am putut crea contul.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="register">
      <aside className="register__brand" aria-hidden="true">
        <header>
          <span>Roomly</span>
          <small>Guest access</small>
        </header>
        <div>
          <p>Creează un cont pentru a trimite cereri către echipa hotelului.</p>
        </div>
      </aside>

      <main className="register__panel">
        <section className="register__card">
          <div className="register__mobile-brand">Roomly</div>

          <header className="register__header">
            <p>Cont nou</p>
            <h1>Creează cont</h1>
            <span>Completează datele de mai jos. Rolul va fi setat automat ca guest.</span>
          </header>

          {successMessage && (
            <div className="register__alert register__alert--success" role="status">
              <span>{successMessage}</span>
              <button type="button" onClick={() => navigate('/login')}>
                Mergi la login
              </button>
            </div>
          )}

          {submitError && (
            <div className="register__alert register__alert--error" role="alert">
              {submitError}
            </div>
          )}

          <form className="register__form" onSubmit={handleSubmit} noValidate>
            <label>
              <span>Nume complet</span>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Andrei Pop"
                autoComplete="name"
                disabled={submitting}
                aria-invalid={!!errors.fullName}
              />
              {errors.fullName && <small>{errors.fullName}</small>}
            </label>

            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nume@example.com"
                autoComplete="email"
                disabled={submitting}
                aria-invalid={!!errors.email}
              />
              {errors.email && <small>{errors.email}</small>}
            </label>

            <label>
              <div className="register__label-row">
                <span>Parolă</span>
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  tabIndex={-1}
                >
                  {showPassword ? 'Ascunde' : 'Arată'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 caractere"
                autoComplete="new-password"
                disabled={submitting}
                aria-invalid={!!errors.password}
              />
              {errors.password && <small>{errors.password}</small>}
            </label>

            <label>
              <div className="register__label-row">
                <span>Confirmă parola</span>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? 'Ascunde' : 'Arată'}
                </button>
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repetă parola"
                autoComplete="new-password"
                disabled={submitting}
                aria-invalid={!!errors.confirmPassword}
              />
              {errors.confirmPassword && <small>{errors.confirmPassword}</small>}
            </label>

            <p className="register__note">
              Camera se alocă de către recepție după crearea contului.
            </p>

            <button type="submit" disabled={submitting}>
              {submitting ? 'Se creează contul...' : 'Creează cont'}
            </button>
          </form>

          <p className="register__footer">
            Ai deja cont? <Link to="/login">Autentifică-te</Link>
          </p>
        </section>
      </main>
    </div>
  )
}
