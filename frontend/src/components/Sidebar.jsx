import { NavLink } from 'react-router-dom'

const MENU_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', enabled: true },
  { label: 'Cerere nouă', to: '/new-request', enabled: true },
  { label: 'Cererile mele', to: '/dashboard', enabled: true },
  { label: 'Profil', to: '/profile', enabled: false },
]

export default function Sidebar({ user, onLogout }) {
  return (
    <aside className="dashboard-sidebar">
      <div>
        <div className="dashboard-sidebar__brand">
          <span className="dashboard-sidebar__mark">R</span>
          <span>Roomly</span>
        </div>

        <nav className="dashboard-sidebar__nav" aria-label="Dashboard">
          {MENU_ITEMS.map((item) =>
            item.enabled ? (
              <NavLink key={item.label} to={item.to}>
                {item.label}
              </NavLink>
            ) : (
              <button key={item.label} type="button" disabled>
                {item.label}
              </button>
            ),
          )}
        </nav>
      </div>

      <div className="dashboard-sidebar__footer">
        <div>
          <p>{user?.full_name || 'Utilizator Roomly'}</p>
          <span>{user?.role || 'guest'}</span>
        </div>
        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </aside>
  )
}
