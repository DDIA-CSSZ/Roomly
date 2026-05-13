import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import StatusBadge from '../components/StatusBadge'
import { getMyRequests } from '../api/requests'
import { useAuth } from '../context/AuthContext'
import './DashboardPage.css'
import './MyRequestsPage.css'

function formatDate(value) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function truncate(text, maxLength = 86) {
  if (!text) return '-'
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}...`
}

export default function MyRequestsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    let cancelled = false

    getMyRequests()
      .then((data) => {
        if (!cancelled) setRequests(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (!cancelled) {
          setRequests([])
          setError(err?.message || 'Nu am putut încărca cererile tale.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function toggleDetails(requestId) {
    setExpandedId((currentId) => (currentId === requestId ? null : requestId))
  }

  return (
    <div className="dashboard-shell">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="my-requests-main">
        <header className="my-requests-hero">
          <div>
            <p>Guest requests</p>
            <h1>Cererile mele</h1>
            <span>
              Urmărește solicitările trimise către echipa hotelului și statusul lor curent.
            </span>
          </div>
          <Link to="/new-request">Cerere nouă</Link>
        </header>

        <section className="my-requests-panel">
          <div className="my-requests-panel__header">
            <div>
              <p>Istoric</p>
              <h2>Solicitari trimise</h2>
            </div>
            <span>{requests.length} total</span>
          </div>

          {loading && <div className="my-requests-state">Se încarcă cererile...</div>}

          {!loading && error && (
            <div className="my-requests-state my-requests-state--error">{error}</div>
          )}

          {!loading && !error && requests.length === 0 && (
            <div className="my-requests-empty">
              <h2>Nu ai trimis nicio cerere momentan.</h2>
              <p>Poți trimite rapid o solicitare pentru room service, housekeeping sau mentenanță.</p>
              <Link to="/new-request">Trimite prima cerere</Link>
            </div>
          )}

          {!loading && !error && requests.length > 0 && (
            <div className="my-requests-table-wrap">
              <table className="my-requests-table">
                <thead>
                  <tr>
                    <th>ID cerere</th>
                    <th>Tip serviciu</th>
                    <th>Descriere</th>
                    <th>Camera</th>
                    <th>Status</th>
                    <th>Data creării</th>
                    <th>Personal asignat</th>
                    <th>Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => {
                    const isExpanded = expandedId === request.id

                    return (
                      <tr key={request.id}>
                        <td>
                          <strong>#{request.id}</strong>
                        </td>
                        <td>{request.service_category?.name || 'Serviciu'}</td>
                        <td>
                          <span className="my-requests-description">
                            {isExpanded ? request.description : truncate(request.description)}
                          </span>
                          {isExpanded && (
                            <dl className="my-requests-details">
                              <dt>Actualizată</dt>
                              <dd>{formatDate(request.updated_at)}</dd>
                              <dt>Finalizată</dt>
                              <dd>{request.completed_at ? formatDate(request.completed_at) : '-'}</dd>
                            </dl>
                          )}
                        </td>
                        <td>
                          {request.room?.room_number ? `#${request.room.room_number}` : '-'}
                        </td>
                        <td>
                          <StatusBadge status={request.status} />
                        </td>
                        <td>{formatDate(request.created_at)}</td>
                        <td>{request.assigned_to?.full_name || 'Neasignat'}</td>
                        <td>
                          <button type="button" onClick={() => toggleDetails(request.id)}>
                            {isExpanded ? 'Ascunde' : 'Vezi detalii'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
