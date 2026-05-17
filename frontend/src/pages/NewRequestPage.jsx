import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { createRequest } from '../api/requests'
import { getServiceCategories } from '../api/serviceCategories'
import { useAuth } from '../context/useAuth'
import './DashboardPage.css'
import './NewRequestPage.css'

const MIN_DESCRIPTION_LENGTH = 3

function getUserRoomNumber(user) {
  return user?.room?.room_number || user?.room_id
}

export default function NewRequestPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoryError, setCategoryError] = useState('')
  const [serviceCategoryId, setServiceCategoryId] = useState('')
  const [priority, setPriority] = useState('normal')
  const [description, setDescription] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isGuest = user?.role === 'guest'
  const hasRoom = Boolean(user?.room_id)
  const roomNumber = getUserRoomNumber(user)

  useEffect(() => {
    let cancelled = false

    getServiceCategories()
      .then((data) => {
        if (!cancelled) setCategories(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (!cancelled) {
          setCategories([])
          setCategoryError(err?.message || 'Nu am putut încărca tipurile de servicii.')
        }
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const roomMessage = useMemo(() => {
    if (!isGuest) return 'Pagina este pregătită pentru utilizatorii cu rol guest.'
    if (!hasRoom) return 'Contul tău nu are cameră asociată. Contactează recepția.'
    return `Camera asociată contului tău: #${roomNumber}`
  }, [hasRoom, isGuest, roomNumber])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  if (user?.role && user.role !== 'guest') {
    return <Navigate to="/dashboard" replace />
  }

  function validate() {
    const nextErrors = {}
    const trimmedDescription = description.trim()

    if (!serviceCategoryId) {
      nextErrors.serviceCategoryId = 'Alege tipul serviciului.'
    }

    if (!trimmedDescription) {
      nextErrors.description = 'Descrierea este obligatorie.'
    } else if (trimmedDescription.length < MIN_DESCRIPTION_LENGTH) {
      nextErrors.description = 'Descrierea trebuie să aibă minimum 3 caractere.'
    }

    if (!isGuest) {
      nextErrors.form = 'Doar utilizatorii guest pot trimite cereri.'
    } else if (!hasRoom) {
      nextErrors.form = 'Nu poți trimite o cerere fără cameră asociată.'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')
    setSuccessMessage('')

    if (!validate()) return

    setSubmitting(true)
    try {
      await createRequest({
        service_category_id: Number(serviceCategoryId),
        priority,
        description: description.trim(),
      })
      setServiceCategoryId('')
      setPriority('normal')
      setDescription('')
      setFieldErrors({})
      setSuccessMessage('Cererea a fost trimisă cu succes.')
    } catch (err) {
      setSubmitError(err?.message || 'Nu am putut trimite cererea.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dashboard-shell">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="new-request-main">
        <section className="new-request-card">
          <div className="new-request-card__header">
            <Link to="/dashboard">Înapoi la dashboard</Link>
            <p>Roomly guest services</p>
            <h1>Cerere nouă</h1>
            <span>
              Trimite o solicitare către echipa hotelului. Tipul serviciului și descrierea
              sunt suficiente; camera este dedusă automat de backend.
            </span>
          </div>

          <div className={`new-request-room ${hasRoom && isGuest ? '' : 'new-request-room--warning'}`}>
            <strong>{hasRoom && isGuest ? 'Camera' : 'Atenție'}</strong>
            <span>{roomMessage}</span>
          </div>

          {successMessage && (
            <div className="new-request-alert new-request-alert--success">
              <span>{successMessage}</span>
              <Link to="/dashboard">Vezi dashboard</Link>
            </div>
          )}

          {(submitError || fieldErrors.form) && (
            <div className="new-request-alert new-request-alert--error">
              {submitError || fieldErrors.form}
            </div>
          )}

          <form className="new-request-form" onSubmit={handleSubmit} noValidate>
            <label>
              <span>Tip serviciu</span>
              <select
                value={serviceCategoryId}
                onChange={(event) => setServiceCategoryId(event.target.value)}
                disabled={categoriesLoading || submitting}
              >
                <option value="">
                  {categoriesLoading ? 'Se încarcă serviciile...' : 'Alege un serviciu'}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {fieldErrors.serviceCategoryId && <small>{fieldErrors.serviceCategoryId}</small>}
              {categoryError && <small>{categoryError}</small>}
            </label>

            <label>
              <span>Prioritate</span>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                disabled={submitting}
              >
                <option value="low">Scăzută</option>
                <option value="normal">Normală</option>
                <option value="urgent">Urgentă</option>
              </select>
            </label>

            <label>
              <span>Descriere</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ex: Avem nevoie de prosoape suplimentare în cameră."
                rows={7}
                disabled={submitting}
              />
              {fieldErrors.description && <small>{fieldErrors.description}</small>}
            </label>

            <div className="new-request-actions">
              <Link to="/dashboard">Renunță</Link>
              <button
                type="submit"
                disabled={submitting || categoriesLoading || !isGuest || !hasRoom}
              >
                {submitting ? 'Se trimite...' : 'Trimite cerere'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}
