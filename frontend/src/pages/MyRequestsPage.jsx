import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import PriorityBadge from '../components/PriorityBadge'
import StatusBadge from '../components/StatusBadge'
import { getMyRequests } from '../api/requests'
import { useAuth } from '../context/useAuth'
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

function normalizeSearchValue(value) {
  return String(value || '')
    .toLocaleLowerCase('ro-RO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function matchesRequestSearch(request, normalizedSearch) {
  if (!normalizedSearch) return true
  return normalizeSearchValue(request.service_category?.name).includes(normalizedSearch)
}

export default function MyRequestsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const normalizedSearch = normalizeSearchValue(searchQuery.trim())
  const filteredRequests = useMemo(
    () =>
      requests
        .filter((request) => matchesRequestSearch(request, normalizedSearch))
        .filter((request) => (statusFilter ? request.status === statusFilter : true))
        .filter((request) => (priorityFilter ? (request.priority || 'normal') === priorityFilter : true)),
    [normalizedSearch, priorityFilter, requests, statusFilter],
  )

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

  if (user?.role && user.role !== 'guest') {
    return <Navigate to="/dashboard" replace />
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
              <h2>Solicitări trimise</h2>
            </div>
            <div className="my-requests-panel__tools">
              <span>
                {filteredRequests.length === requests.length
                  ? `${requests.length} total`
                  : `${filteredRequests.length} din ${requests.length}`}
              </span>
              <label className="my-requests-search" htmlFor="my-requests-search">
                <span>Caută cereri</span>
                <input
                  id="my-requests-search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Caută după serviciu..."
                />
              </label>
              <div className="my-requests-filters" aria-label="Filtre cereri">
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="">Toate statusurile</option>
                  <option value="pending">În așteptare</option>
                  <option value="assigned">Asignate</option>
                  <option value="in_progress">În lucru</option>
                  <option value="completed">Finalizate</option>
                  <option value="cancelled">Anulate</option>
                </select>
                <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                  <option value="">Toate prioritățile</option>
                  <option value="urgent">Urgentă</option>
                  <option value="normal">Normală</option>
                  <option value="low">Scăzută</option>
                </select>
              </div>
            </div>
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
                    <th>Prioritate</th>
                    <th>Camera</th>
                    <th>Status</th>
                    <th>Data creării</th>
                    <th>Personal asignat</th>
                    <th>Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="my-requests-empty-row">
                        Nu există rezultate pentru căutarea curentă.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((request) => (
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
                          <PriorityBadge priority={request.priority} />
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
