import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import PriorityBadge from '../components/PriorityBadge'
import StatusBadge from '../components/StatusBadge'
import {
  cancelMyRequest,
  createRequestComment,
  getRequestComments,
  getRequestEvents,
  getRequestByIdForRole,
  updateMyRequest,
} from '../api/requests'
import { getServiceCategories } from '../api/serviceCategories'
import { useAuth } from '../context/useAuth'
import './DashboardPage.css'
import './RequestDetailsPage.css'

function formatDate(value) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getBackPath(role) {
  return role === 'guest' ? '/my-requests' : '/dashboard'
}

function getBackLabel(role) {
  return role === 'guest' ? 'Înapoi la Cererile mele' : 'Înapoi la dashboard'
}

const EVENT_MESSAGE_REPLACEMENTS = [
  ['pending', 'În așteptare'],
  ['assigned', 'Asignată'],
  ['in_progress', 'În lucru'],
  ['completed', 'Finalizată'],
  ['cancelled', 'Anulată'],
  ['low', 'Scăzută'],
  ['normal', 'Normală'],
  ['urgent', 'Urgentă'],
]

function formatEventMessage(message) {
  return EVENT_MESSAGE_REPLACEMENTS.reduce(
    (current, [technical, label]) => current.replaceAll(technical, label),
    message || '',
  )
}

export default function RequestDetailsPage() {
  const { id } = useParams()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [request, setRequest] = useState(null)
  const [comments, setComments] = useState([])
  const [events, setEvents] = useState([])
  const [categories, setCategories] = useState([])
  const [serviceCategoryId, setServiceCategoryId] = useState('')
  const [priority, setPriority] = useState('normal')
  const [description, setDescription] = useState('')
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [message, setMessage] = useState('')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const role = user?.role || 'guest'
  const backPath = getBackPath(role)
  const canEdit = role === 'guest' && request?.status === 'pending'
  const canCancel = role === 'guest' && ['pending', 'assigned'].includes(request?.status)

  function applyRequest(data) {
    setRequest(data)
    setServiceCategoryId(data?.service_category?.id ? String(data.service_category.id) : '')
    setPriority(data?.priority || 'normal')
    setDescription(data?.description || '')
  }

  function loadRequest() {
    setLoading(true)
    setError('')

    return Promise.all([getRequestByIdForRole(id, role), getRequestComments(id), getRequestEvents(id)])
      .then(([data, commentsData, eventsData]) => {
        if (!data) {
          applyRequest(null)
          setError('Cererea nu a fost găsită sau nu ai acces la ea.')
          return
        }

        applyRequest(data)
        setComments(Array.isArray(commentsData) ? commentsData : [])
        setEvents(Array.isArray(eventsData) ? eventsData : [])
      })
      .catch((err) => {
        applyRequest(null)
        setError(err?.message || 'Nu am putut încărca detaliile cererii.')
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    let cancelled = false

    loadRequest()

    if (role === 'guest') {
      getServiceCategories()
        .then((data) => {
          if (!cancelled) setCategories(Array.isArray(data) ? data : [])
        })
        .catch(() => {
          if (!cancelled) setCategories([])
        })
    }

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, role])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  async function handleSave(event) {
    event.preventDefault()
    setActionError('')
    setMessage('')

    if (!serviceCategoryId) {
      setActionError('Alege tipul serviciului.')
      return
    }

    if (description.trim().length < 3) {
      setActionError('Descrierea trebuie să aibă minimum 3 caractere.')
      return
    }

    setSaving(true)
    try {
      const updated = await updateMyRequest(request.id, {
        service_category_id: Number(serviceCategoryId),
        priority,
        description: description.trim(),
      })
      applyRequest(updated)
      setEditing(false)
      setMessage('Cererea a fost actualizată.')
    } catch (err) {
      setActionError(err?.message || 'Nu am putut actualiza cererea.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCancelRequest() {
    setSaving(true)
    setActionError('')
    setMessage('')
    try {
      const updated = await cancelMyRequest(request.id)
      applyRequest(updated)
      setEditing(false)
      setShowCancelConfirm(false)
      setMessage('Cererea a fost anulată.')
    } catch (err) {
      setActionError(err?.message || 'Nu am putut anula cererea.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddComment(event) {
    event.preventDefault()
    const body = newComment.trim()
    if (body.length < 2) {
      setActionError('Nota trebuie să aibă minimum 2 caractere.')
      setMessage('')
      return
    }

    setSaving(true)
    setActionError('')
    setMessage('')
    try {
      await createRequestComment(request.id, body)
      setNewComment('')
      setMessage('Nota a fost adăugată.')
      const [commentsData, eventsData] = await Promise.all([
        getRequestComments(request.id),
        getRequestEvents(request.id),
      ])
      setComments(Array.isArray(commentsData) ? commentsData : [])
      setEvents(Array.isArray(eventsData) ? eventsData : [])
    } catch (err) {
      setActionError(err?.message || 'Nu am putut adăuga nota.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dashboard-shell">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="request-details-main">
        <section className="request-details-card">
          <div className="request-details-card__header">
            <Link to={backPath}>{getBackLabel(role)}</Link>
            <p>Detalii solicitare</p>
            <h1>Detalii cerere</h1>
            <span>
              Vizualizează informațiile complete pentru cererea selectată și statusul ei curent.
            </span>
          </div>

          {loading && <div className="request-details-state">Se încarcă detaliile cererii...</div>}

          {!loading && error && (
            <div className="request-details-state request-details-state--error">
              <p>{error}</p>
              <Link to={backPath}>{getBackLabel(role)}</Link>
            </div>
          )}

          {!loading && !error && request && (
            <>
              {(message || actionError) && (
                <div className={`request-details-alert ${actionError ? 'request-details-alert--error' : ''}`}>
                  {actionError || message}
                </div>
              )}

              <div className="request-details-summary">
                <div>
                  <span>ID cerere</span>
                  <strong>#{request.id}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <StatusBadge status={request.status} />
                </div>
                <div>
                  <span>Prioritate</span>
                  <PriorityBadge priority={request.priority} />
                </div>
              </div>

              <dl className="request-details-list">
                <div>
                  <dt>Tip serviciu</dt>
                  <dd>{request.service_category?.name || 'Serviciu'}</dd>
                </div>
                <div>
                  <dt>Camera</dt>
                  <dd>{request.room?.room_number ? `#${request.room.room_number}` : '-'}</dd>
                </div>
                <div>
                  <dt>Data creării</dt>
                  <dd>{formatDate(request.created_at)}</dd>
                </div>
                <div>
                  <dt>Data actualizării</dt>
                  <dd>{formatDate(request.updated_at)}</dd>
                </div>
                <div>
                  <dt>Personal asignat</dt>
                  <dd>{request.assigned_to?.full_name || 'Neasignat'}</dd>
                </div>
                <div>
                  <dt>Oaspete</dt>
                  <dd>{request.guest?.full_name || user?.full_name || '-'}</dd>
                </div>
              </dl>

              {editing ? (
                <form className="request-edit-form" onSubmit={handleSave}>
                  <label>
                    <span>Tip serviciu</span>
                    <select
                      value={serviceCategoryId}
                      onChange={(event) => setServiceCategoryId(event.target.value)}
                      disabled={saving}
                    >
                      <option value="">Alege un serviciu</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Prioritate</span>
                    <select
                      value={priority}
                      onChange={(event) => setPriority(event.target.value)}
                      disabled={saving}
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
                      rows={6}
                      disabled={saving}
                    />
                  </label>

                  <div className="request-edit-actions">
                    <button type="button" onClick={() => setEditing(false)} disabled={saving}>
                      Renunță
                    </button>
                    <button type="submit" disabled={saving}>
                      {saving ? 'Se salvează...' : 'Salvează'}
                    </button>
                  </div>
                </form>
              ) : (
                <article className="request-details-description">
                  <h2>Descriere completă</h2>
                  <p>{request.description}</p>
                </article>
              )}

              <div className="request-details-actions">
                {canEdit && !editing && (
                  <button type="button" onClick={() => setEditing(true)} disabled={saving}>
                    Editează
                  </button>
                )}
                {canCancel && (
                  <button
                    type="button"
                    className="request-details-danger"
                    onClick={() => setShowCancelConfirm(true)}
                    disabled={saving}
                  >
                    {saving ? 'Se salvează...' : 'Anulează cererea'}
                  </button>
                )}
                <Link to={backPath}>{getBackLabel(role)}</Link>
              </div>

              <section className="request-notes">
                <div>
                  <h2>Note</h2>
                  <span>{comments.length} total</span>
                </div>
                <form onSubmit={handleAddComment}>
                  <textarea
                    value={newComment}
                    onChange={(event) => setNewComment(event.target.value)}
                    rows={3}
                    placeholder="Adaugă o notă pentru această cerere..."
                    disabled={saving}
                  />
                  <button type="submit" disabled={saving || newComment.trim().length < 2}>
                    Adaugă notă
                  </button>
                </form>
                {comments.length === 0 ? (
                  <p className="request-notes__empty">Nu există note încă.</p>
                ) : (
                  <ul>
                    {comments.map((comment) => (
                      <li key={comment.id}>
                        <strong>{comment.author?.full_name || 'Utilizator'}</strong>
                        <span>{formatDate(comment.created_at)}</span>
                        <p>{comment.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="request-timeline">
                <h2>Istoric</h2>
                {events.length === 0 ? (
                  <p>Nu există evenimente încă.</p>
                ) : (
                  <ol>
                    {events.map((event) => (
                      <li key={event.id}>
                        <span>{formatDate(event.created_at)}</span>
                        <strong>{formatEventMessage(event.message)}</strong>
                        {event.actor?.full_name && <small>{event.actor.full_name}</small>}
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              {showCancelConfirm && (
                <div className="request-confirm-backdrop" role="presentation">
                  <div className="request-confirm-dialog" role="dialog" aria-modal="true">
                    <h2>Anulezi cererea?</h2>
                    <p>
                      Cererea va rămâne în istoric cu statusul anulat. Această acțiune
                      nu șterge datele din sistem.
                    </p>
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowCancelConfirm(false)}
                        disabled={saving}
                      >
                        Renunță
                      </button>
                      <button
                        type="button"
                        className="request-details-danger"
                        onClick={handleCancelRequest}
                        disabled={saving}
                      >
                        {saving ? 'Se salvează...' : 'Confirmă anularea'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}
