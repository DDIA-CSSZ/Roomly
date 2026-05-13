import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import StatusBadge from '../components/StatusBadge'
import { getRequestByIdForRole } from '../api/requests'
import { useAuth } from '../context/AuthContext'
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
  return role === 'guest' ? 'Inapoi la Cererile mele' : 'Inapoi la dashboard'
}

export default function RequestDetailsPage() {
  const { id } = useParams()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const role = user?.role || 'guest'
  const backPath = getBackPath(role)

  useEffect(() => {
    let cancelled = false

    getRequestByIdForRole(id, role)
      .then((data) => {
        if (cancelled) return

        if (!data) {
          setRequest(null)
          setError('Cererea nu a fost gasita sau nu ai acces la ea.')
          return
        }

        setRequest(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setRequest(null)
          setError(err?.message || 'Nu am putut incarca detaliile cererii.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, role])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="dashboard-shell">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="request-details-main">
        <section className="request-details-card">
          <div className="request-details-card__header">
            <Link to={backPath}>{getBackLabel(role)}</Link>
            <p>Request details</p>
            <h1>Detalii cerere</h1>
            <span>
              Vizualizeaza informatiile complete pentru cererea selectata si statusul ei curent.
            </span>
          </div>

          {loading && <div className="request-details-state">Se incarca detaliile cererii...</div>}

          {!loading && error && (
            <div className="request-details-state request-details-state--error">
              <p>{error}</p>
              <Link to={backPath}>{getBackLabel(role)}</Link>
            </div>
          )}

          {!loading && !error && request && (
            <>
              <div className="request-details-summary">
                <div>
                  <span>ID cerere</span>
                  <strong>#{request.id}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <StatusBadge status={request.status} />
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
                  <dt>Data crearii</dt>
                  <dd>{formatDate(request.created_at)}</dd>
                </div>
                <div>
                  <dt>Data actualizarii</dt>
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

              <article className="request-details-description">
                <h2>Descriere completa</h2>
                <p>{request.description}</p>
              </article>

              <div className="request-details-actions">
                <Link to={backPath}>{getBackLabel(role)}</Link>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
