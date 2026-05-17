import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getRequestsForRole } from '../api/requests'
import { getUsers } from '../api/users'

const MENU_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', roles: ['guest', 'receptionist', 'staff', 'admin'] },
  { label: 'Cerere nouă', to: '/new-request', roles: ['guest'] },
  { label: 'Cererile mele', to: '/my-requests', roles: ['guest'] },
  { label: 'Utilizatori', to: '/users', roles: ['receptionist', 'admin'] },
  { label: 'Camere', to: '/rooms', roles: ['receptionist', 'admin'] },
  { label: 'Profil', to: '/profile', roles: ['guest', 'receptionist', 'staff', 'admin'] },
]

function countNewGuests(users) {
  return users.filter((account) => account.role === 'guest' && account.is_active && !account.room_id).length
}

function countRequestBadge(requests, role) {
  if (role === 'guest') {
    return requests.filter((request) => ['pending', 'assigned', 'in_progress', 'cancelled'].includes(request.status)).length
  }
  if (role === 'staff') {
    return requests.filter((request) => ['assigned', 'in_progress'].includes(request.status)).length
  }
  if (role === 'receptionist' || role === 'admin') {
    return requests.filter((request) => request.status === 'pending').length
  }
  return 0
}

export default function Sidebar({ user, onLogout, usersBadgeCount }) {
  const role = user?.role || 'guest'
  const visibleItems = MENU_ITEMS.filter((item) => item.roles.includes(role))
  const [fetchedBadgeCount, setFetchedBadgeCount] = useState(0)
  const [requestBadgeCount, setRequestBadgeCount] = useState(0)
  const canSeeUsersBadge = role === 'receptionist' || role === 'admin'
  const badgeCount = usersBadgeCount ?? fetchedBadgeCount

  useEffect(() => {
    if (!canSeeUsersBadge || usersBadgeCount !== undefined) return undefined

    let cancelled = false

    function loadBadgeCount() {
      getUsers()
        .then((data) => {
          if (!cancelled) setFetchedBadgeCount(Array.isArray(data) ? countNewGuests(data) : 0)
        })
        .catch(() => {
          if (!cancelled) setFetchedBadgeCount(0)
        })
    }

    loadBadgeCount()
    const intervalId = window.setInterval(loadBadgeCount, 30000)
    window.addEventListener('focus', loadBadgeCount)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', loadBadgeCount)
    }
  }, [canSeeUsersBadge, usersBadgeCount])

  useEffect(() => {
    let cancelled = false

    function loadRequestBadgeCount() {
      getRequestsForRole(role)
        .then((data) => {
          if (!cancelled) setRequestBadgeCount(Array.isArray(data) ? countRequestBadge(data, role) : 0)
        })
        .catch(() => {
          if (!cancelled) setRequestBadgeCount(0)
        })
    }

    loadRequestBadgeCount()
    const intervalId = window.setInterval(loadRequestBadgeCount, 30000)
    window.addEventListener('focus', loadRequestBadgeCount)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', loadRequestBadgeCount)
    }
  }, [role])

  return (
    <aside className="dashboard-sidebar">
      <div>
        <div className="dashboard-sidebar__brand">
          <span className="dashboard-sidebar__mark">R</span>
          <span>Roomly</span>
        </div>

        <nav className="dashboard-sidebar__nav" aria-label="Dashboard">
          {visibleItems.map((item) => (
            <NavLink key={item.label} to={item.to}>
              <span>{item.label}</span>
              {item.to === '/users' && badgeCount > 0 && (
                <strong className="dashboard-sidebar__badge" aria-label={`${badgeCount} utilizatori noi`}>
                  {badgeCount}
                </strong>
              )}
              {item.to === '/dashboard' && role !== 'guest' && requestBadgeCount > 0 && (
                <strong className="dashboard-sidebar__badge" aria-label={`${requestBadgeCount} cereri noi`}>
                  {requestBadgeCount}
                </strong>
              )}
              {item.to === '/my-requests' && role === 'guest' && requestBadgeCount > 0 && (
                <strong className="dashboard-sidebar__badge" aria-label={`${requestBadgeCount} actualizări cereri`}>
                  {requestBadgeCount}
                </strong>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="dashboard-sidebar__footer">
        <div>
          <p>{user?.full_name || 'Utilizator Roomly'}</p>
          <span>{role}</span>
        </div>
        <button type="button" onClick={onLogout}>
          Deconectare
        </button>
      </div>
    </aside>
  )
}
