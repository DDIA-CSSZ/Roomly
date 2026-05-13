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

  useEffect(() => {
    let cancelled = false

    getMyRequests()
      .then((data) => {
        if (!cancelled) setRequests(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (!cancelled) {
          setRequests([])
          setError(err?.message || 'Nu am putut incarca cererile tale.')
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

  return (
    <div className="dashboard-shell">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="my-requests-main">
        <header className="my-requests-hero">
          <div>
            <p>Guest requests</p>
            <h1>Cererile mele</h1>
            <span>
              Urmareste solicitarile trimise catre echipa hotelului si statusul lor curent.
            </span>
          </div>
          <Link to="/new-request">Cerere noua</Link>
        </header>

        <section className="my-requests-panel">
          <div className="my-requests-panel__header">
            <div>
              <p>Istoric</p>
              <h2>Solicitari trimise</h2>
            </div>
            <span>{requests.length} total</span>
          </div>

          {loading && <div className="my-requests-state">Se incarca cererile...</div>}

          {!loading && error && (
            <div className="my-requests-state my-requests-state--error">{error}</div>
          )}

          {!loading && !error && requests.length === 0 && (
            <div className="my-requests-empty">
              <h2>Nu ai trimis nicio cerere momentan.</h2>
              <p>Poti trimite rapid o solicitare pentru room service, housekeeping sau mentenanta.</p>
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
                    <th>Data crearii</th>
                    <th>Personal asignat</th>
                    <th>Actiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <strong>#{request.id}</strong>
                      </td>
                      <td>{request.service_category?.name || 'Serviciu'}</td>
                      <td>
                        <span className="my-requests-description">
                          {truncate(request.description)}
                        </span>
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
                        <Link className="my-requests-details-link" to={`/requests/${request.id}`}>
                          Vezi detalii
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
