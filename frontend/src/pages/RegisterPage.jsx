import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import { getRooms } from '../api/rooms'
import './RegisterPage.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegisterPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [roomId, setRoomId] = useState('')
  const [rooms, setRooms] = useState([])
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [roomsMessage, setRoomsMessage] = useState('')
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    getRooms()
      .then((data) => {
        if (!cancelled) setRooms(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) {
          setRooms([])
          setRoomsMessage('Camera poate fi alocata ulterior la receptie.')
        }
      })
      .finally(() => {
        if (!cancelled) setRoomsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const canSelectRoom = useMemo(() => rooms.length > 0, [rooms.length])

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
      nextErrors.email = 'Adresa de email nu pare valida.'
    }

    if (!password) {
      nextErrors.password = 'Parola este obligatorie.'
    } else if (password.length < 8) {
      nextErrors.password = 'Parola trebuie sa aiba minimum 8 caractere.'
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Confirma parola.'
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

    const payload = {
      full_name: fullName.trim(),
      email: email.trim(),
      password,
    }

    if (roomId) {
      payload.room_id = Number(roomId)
    }

    setSubmitting(true)
    try {
      await register(payload)
      setFullName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setRoomId('')
      setErrors({})
      setSuccessMessage('Contul a fost creat cu succes.')
    } catch (err) {
      if (err.status === 409) {
        setSubmitError('Exista deja un cont cu acest email.')
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
          <p>
            Creeaza un cont pentru a trimite cereri catre echipa hotelului.
          </p>
        </div>
      </aside>

      <main className="register__panel">
        <section className="register__card">
          <div className="register__mobile-brand">Roomly</div>

          <header className="register__header">
            <p>Cont nou</p>
            <h1>Creeaza cont</h1>
            <span>Completeaza datele de mai jos. Rolul va fi setat automat ca guest.</span>
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
              <span>Parola</span>
              <input
                type="password"
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
              <span>Confirma parola</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeta parola"
                autoComplete="new-password"
                disabled={submitting}
                aria-invalid={!!errors.confirmPassword}
              />
              {errors.confirmPassword && <small>{errors.confirmPassword}</small>}
            </label>

            <label>
              <span>Camera</span>
              <select
                value={roomId}
                onChange={(event) => setRoomId(event.target.value)}
                disabled={submitting || roomsLoading || !canSelectRoom}
              >
                <option value="">
                  {roomsLoading ? 'Se incarca camerele...' : 'Fara camera selectata'}
                </option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    Camera #{room.room_number}
                  </option>
                ))}
              </select>
              {roomsMessage && <small className="register__hint">{roomsMessage}</small>}
            </label>

            <button type="submit" disabled={submitting}>
              {submitting ? 'Se creeaza contul...' : 'Creeaza cont'}
            </button>
          </form>

          <p className="register__footer">
            Ai deja cont? <Link to="/login">Autentifica-te</Link>
          </p>
        </section>
      </main>
    </div>
  )
}
