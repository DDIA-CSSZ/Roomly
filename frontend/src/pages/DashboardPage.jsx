import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import ServiceCard from '../components/ServiceCard'
import RequestTable from '../components/RequestTable'
import { useAuth } from '../context/AuthContext'
import { getRequestsForRole } from '../api/requests'
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
    eyebrow: 'Guest dashboard',
    title: 'Servicii pentru sejurul tău',
    description: 'Alege un serviciu și urmărește statusul cererilor trimise.',
    panelTitle: 'Cererile tale recente',
    rolePanel: 'Cameră și servicii',
    roleText: 'Ai acces la servicii hoteliere și la istoricul cererilor tale.',
  },
  receptionist: {
    eyebrow: 'Reception dashboard',
    title: 'Gestionare cereri hotel',
    description: 'Monitorizează cererile primite și pregătește alocarea lor către staff.',
    panelTitle: 'Cereri recente',
    rolePanel: 'Zona receptie',
    roleText: 'Vezi toate cererile, camerele și statusurile operaționale.',
  },
  staff: {
    eyebrow: 'Staff dashboard',
    title: 'Cererile asignate ție',
    description: 'Prioritizează cererile primite și urmărește lucrările active.',
    panelTitle: 'Task-uri asignate',
    rolePanel: 'Zona staff',
    roleText: 'Lista este filtrată la cererile alocate contului tău.',
  },
  admin: {
    eyebrow: 'Admin dashboard',
    title: 'Administrare Roomly',
    description: 'Ai vizibilitate asupra cererilor și a fluxului operațional.',
    panelTitle: 'Toate cererile recente',
    rolePanel: 'Zona administrare',
    roleText: 'Pregătit pentru administrarea utilizatorilor, camerelor și serviciilor.',
  },
}

function countByStatus(requests, status) {
  return requests.filter((request) => request.status === status).length
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const role = user?.role || 'guest'
  const copy = ROLE_COPY[role] || ROLE_COPY.guest

  useEffect(() => {
    let cancelled = false

    getRequestsForRole(role)
      .then((data) => {
        if (!cancelled) setRequests(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (!cancelled) {
          setRequests([])
          setError(err?.message || 'Nu am putut încărca cererile.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [role])

  const stats = useMemo(
    () => [
      { label: 'Pending', value: countByStatus(requests, 'pending') },
      { label: 'Assigned', value: countByStatus(requests, 'assigned') },
      { label: 'In progress', value: countByStatus(requests, 'in_progress') },
      { label: 'Completed', value: countByStatus(requests, 'completed') },
    ],
    [requests],
  )

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
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
              {user?.room_id && <small>Camera #{user.room_id}</small>}
            </div>
          </div>
        </header>

        <section className="dashboard-toolbar" aria-label="Actiuni dashboard">
          <div>
            <h2>{copy.title}</h2>
            <p>{copy.roleText}</p>
          </div>
          <button type="button" disabled title="Pagina de creare cerere va fi adăugată ulterior">
            Cerere nouă
          </button>
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
            <span>{requests.length} total</span>
          </div>
          <RequestTable requests={requests} role={role} loading={loading} error={error} />
        </section>
      </main>
    </div>
  )
}
