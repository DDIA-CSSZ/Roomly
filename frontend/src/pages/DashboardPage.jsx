import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import ServiceCard from '../components/ServiceCard'
import RequestTable from '../components/RequestTable'
import { useAuth } from '../context/useAuth'
import {
  assignRequest,
  getRequestsForRole,
  updateRequestPriority,
  updateRequestStatus,
} from '../api/requests'
import { getStaffUsers } from '../api/users'
import './DashboardPage.css'

const SERVICES = [
  {
    title: 'Room Service',
    description: 'Comenzi rapide pentru mâncare, băuturi și servicii în cameră.',
    icon: 'RS',
    tone: 'sage',
  },
  {
    title: 'Housekeeping',
    description: 'Curățenie, schimbare lenjerie și pregătirea camerei.',
    icon: 'HK',
    tone: 'blue',
  },
  {
    title: 'Maintenance',
    description: 'Sesizări tehnice pentru instalații, mobilier sau echipamente.',
    icon: 'MT',
    tone: 'amber',
  },
  {
    title: 'Consumables/Amenities',
    description: 'Prosoape, săpun, apă, papuci și alte consumabile.',
    icon: 'AM',
    tone: 'rose',
  },
]

const ROLE_COPY = {
  guest: {
    eyebrow: 'Dashboard guest',
    title: 'Servicii pentru sejurul tău',
    description: 'Alege un serviciu și urmărește statusul cererilor trimise.',
    panelTitle: 'Cererile tale recente',
    rolePanel: 'Cameră și servicii',
    roleText: 'Ai acces la servicii hoteliere și la istoricul cererilor tale.',
  },
  receptionist: {
    eyebrow: 'Dashboard recepție',
    title: 'Gestionare cereri hotel',
    description: 'Monitorizează cererile primite și alocă-le către staff.',
    panelTitle: 'Cereri recente',
    rolePanel: 'Zona recepție',
    roleText: 'Asignează cereri către staff și urmărește fluxul operațional.',
  },
  staff: {
    eyebrow: 'Dashboard staff',
    title: 'Cererile asignate ție',
    description: 'Prioritizează cererile primite și actualizează statusul lucrărilor.',
    panelTitle: 'Task-uri asignate',
    rolePanel: 'Zona staff',
    roleText: 'Lista este filtrată la cererile alocate contului tău.',
  },
  admin: {
    eyebrow: 'Dashboard admin',
    title: 'Administrare Roomly',
    description: 'Ai vizibilitate asupra cererilor și a fluxului operațional.',
    panelTitle: 'Toate cererile recente',
    rolePanel: 'Zona administrare',
    roleText: 'Asignează cereri și monitorizează statusurile operaționale.',
  },
}

function countByStatus(requests, status) {
  return requests.filter((request) => request.status === status).length
}

function normalizeSearchValue(value) {
  return String(value || '')
    .toLocaleLowerCase('ro-RO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function requestMatchesSearch(request, normalizedSearch) {
  if (!normalizedSearch) return true
  return normalizeSearchValue(request.service_category?.name).includes(normalizedSearch)
}

function getUserRoomNumber(user) {
  return user?.room?.room_number || user?.room_id
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [requestSearch, setRequestSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [roomFilter, setRoomFilter] = useState('')
  const [staffUsers, setStaffUsers] = useState([])
  const [selectedStaff, setSelectedStaff] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionLoading, setActionLoading] = useState('')

  const role = user?.role || 'guest'
  const copy = ROLE_COPY[role] || ROLE_COPY.guest
  const canAssign = role === 'receptionist' || role === 'admin'
  const normalizedRequestSearch = normalizeSearchValue(requestSearch.trim())
  const userRoomNumber = getUserRoomNumber(user)

  const loadRequests = useCallback(() => {
    setLoading(true)
    setError('')

    return getRequestsForRole(role)
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setRequests(list)
        setSelectedStaff((current) => {
          const next = { ...current }
          list.forEach((request) => {
            if (request.assigned_to?.id) {
              next[request.id] = String(request.assigned_to.id)
            }
          })
          return next
        })
      })
      .catch((err) => {
        setRequests([])
        setError(err?.message || 'Nu am putut încărca cererile.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [role])

  useEffect(() => {
    let cancelled = false

    loadRequests()

    if (canAssign) {
      getStaffUsers()
        .then((data) => {
          if (!cancelled) setStaffUsers(Array.isArray(data) ? data : [])
        })
        .catch(() => {
          if (!cancelled) setStaffUsers([])
        })
    } else {
      setStaffUsers([])
    }

    return () => {
      cancelled = true
    }
  }, [canAssign, loadRequests])

  const stats = useMemo(
    () => [
      { label: 'În așteptare', value: countByStatus(requests, 'pending') },
      { label: 'Asignate', value: countByStatus(requests, 'assigned') },
      { label: 'În lucru', value: countByStatus(requests, 'in_progress') },
      { label: 'Finalizate', value: countByStatus(requests, 'completed') },
    ],
    [requests],
  )

  const serviceOptions = useMemo(
    () => [...new Set(requests.map((request) => request.service_category?.name).filter(Boolean))].sort(),
    [requests],
  )

  const roomOptions = useMemo(
    () => [...new Set(requests.map((request) => request.room?.room_number).filter(Boolean))].sort(),
    [requests],
  )

  const filteredRequests = useMemo(() => {
    const priorityRank = { urgent: 0, normal: 1, low: 2 }

    return requests
      .filter((request) => requestMatchesSearch(request, normalizedRequestSearch))
      .filter((request) => (statusFilter ? request.status === statusFilter : true))
      .filter((request) => (priorityFilter ? (request.priority || 'normal') === priorityFilter : true))
      .filter((request) => (serviceFilter ? request.service_category?.name === serviceFilter : true))
      .filter((request) => (roomFilter ? request.room?.room_number === roomFilter : true))
      .sort((a, b) => {
        const priorityDiff = (priorityRank[a.priority || 'normal'] ?? 1) - (priorityRank[b.priority || 'normal'] ?? 1)
        if (priorityDiff !== 0) return priorityDiff
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      })
  }, [normalizedRequestSearch, priorityFilter, requests, roomFilter, serviceFilter, statusFilter])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function handleSelectStaff(requestId, staffId) {
    setSelectedStaff((current) => ({ ...current, [requestId]: staffId }))
  }

  async function handleAssignRequest(requestId) {
    const staffId = selectedStaff[requestId]
    if (!staffId) return

    setActionLoading(String(requestId))
    setActionError('')
    setActionMessage('')
    try {
      await assignRequest(requestId, staffId)
      setActionMessage('Cererea a fost asignată.')
      await loadRequests()
    } catch (err) {
      setActionError(err?.message || 'Nu am putut asigna cererea.')
    } finally {
      setActionLoading('')
    }
  }

  async function handleUpdateStatus(requestId, status) {
    setActionLoading(String(requestId))
    setActionError('')
    setActionMessage('')
    try {
      await updateRequestStatus(requestId, status)
      setActionMessage('Statusul cererii a fost actualizat.')
      await loadRequests()
    } catch (err) {
      setActionError(err?.message || 'Nu am putut actualiza statusul.')
    } finally {
      setActionLoading('')
    }
  }

  async function handleUpdatePriority(requestId, priority) {
    setActionLoading(String(requestId))
    setActionError('')
    setActionMessage('')
    try {
      await updateRequestPriority(requestId, priority)
      setActionMessage('Prioritatea cererii a fost actualizată.')
      await loadRequests()
    } catch (err) {
      setActionError(err?.message || 'Nu am putut actualiza prioritatea.')
    } finally {
      setActionLoading('')
    }
  }

  return (
    <div className="dashboard-shell">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="dashboard-main">
        <header className="dashboard-hero">
          <div>
            <p>{copy.eyebrow}</p>
            <h1>Bună, {user?.full_name?.split(' ')[0] || 'oaspete'}.</h1>
            <span>{copy.description}</span>
          </div>

          <div className="dashboard-user-card">
            <strong>{user?.full_name || 'Utilizator Roomly'}</strong>
            <span>{user?.email}</span>
            <div>
              <small>{role}</small>
              {userRoomNumber && <small>Camera #{userRoomNumber}</small>}
            </div>
          </div>
        </header>

        <section className="dashboard-toolbar" aria-label="Acțiuni dashboard">
          <div>
            <h2>{copy.title}</h2>
            <p>{copy.roleText}</p>
          </div>
          {role === 'guest' && (
            <Link className="dashboard-toolbar__button" to="/new-request">
              Cerere nouă
            </Link>
          )}
        </section>

        {role === 'guest' ? (
          <section className="services-grid" aria-label="Servicii Roomly">
            {SERVICES.map((service) => (
              <ServiceCard key={service.title} {...service} />
            ))}
          </section>
        ) : (
          <section className="operations-panel">
            <div>
              <p>{copy.rolePanel}</p>
              <h2>{requests.length}</h2>
              <span>Cereri vizibile pentru rolul tău</span>
            </div>
            <div className="stats-grid">
              {stats.map((stat) => (
                <article key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="requests-panel">
          <div className="requests-panel__header">
            <div>
              <p>Activitate</p>
              <h2>{copy.panelTitle}</h2>
            </div>
            <div className="requests-panel__tools">
              <span>
                {filteredRequests.length === requests.length
                  ? `${requests.length} total`
                  : `${filteredRequests.length} din ${requests.length}`}
              </span>
              <label className="requests-search" htmlFor="dashboard-request-search">
                <span>Caută cereri</span>
                <input
                  id="dashboard-request-search"
                  value={requestSearch}
                  onChange={(event) => setRequestSearch(event.target.value)}
                  placeholder="Caută după serviciu..."
                />
              </label>
              <div className="requests-filters" aria-label="Filtre cereri">
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
                <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}>
                  <option value="">Toate serviciile</option>
                  {serviceOptions.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
                <select value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)}>
                  <option value="">Toate camerele</option>
                  {roomOptions.map((roomNumber) => (
                    <option key={roomNumber} value={roomNumber}>
                      #{roomNumber}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {(actionMessage || actionError) && (
            <div className={`dashboard-action-alert ${actionError ? 'dashboard-action-alert--error' : ''}`}>
              {actionError || actionMessage}
            </div>
          )}

          <RequestTable
            requests={filteredRequests}
            role={role}
            loading={loading}
            error={error}
            staffUsers={staffUsers}
            selectedStaff={selectedStaff}
            actionLoading={actionLoading}
            onSelectStaff={handleSelectStaff}
            onAssignRequest={handleAssignRequest}
            onUpdateStatus={handleUpdateStatus}
            onUpdatePriority={handleUpdatePriority}
          />
        </section>
      </main>
    </div>
  )
}
