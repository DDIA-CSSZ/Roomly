import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/useAuth'
import './DashboardPage.css'
import './ProfilePage.css'

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

function formatAccountStatus(value) {
  if (value === true) return 'Activ'
  if (value === false) return 'Inactiv'
  return '-'
}

function getUserRoomNumber(user) {
  return user?.room?.room_number || user?.room_id
}

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const roomNumber = getUserRoomNumber(user)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="dashboard-shell">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="profile-main">
        <section className="profile-card">
          <div className="profile-card__header">
            <p>Profil Roomly</p>
            <h1>Profil utilizator</h1>
            <span>Informațiile contului autentificat în Roomly.</span>
          </div>

          <div className="profile-identity">
            <div className="profile-avatar" aria-hidden="true">
              {(user?.full_name || user?.email || 'R').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2>{user?.full_name || 'Utilizator Roomly'}</h2>
              <p>{user?.email || '-'}</p>
            </div>
          </div>

          <dl className="profile-details">
            <div>
              <dt>Nume complet</dt>
              <dd>{user?.full_name || '-'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user?.email || '-'}</dd>
            </div>
            <div>
              <dt>Rol</dt>
              <dd className="profile-role">{user?.role || '-'}</dd>
            </div>
            {roomNumber && (
              <div>
                <dt>Camera</dt>
                <dd>#{roomNumber}</dd>
              </div>
            )}
            {'is_active' in (user || {}) && (
              <div>
                <dt>Status cont</dt>
                <dd>{formatAccountStatus(user?.is_active)}</dd>
              </div>
            )}
            {user?.created_at && (
              <div>
                <dt>Data creării contului</dt>
                <dd>{formatDate(user.created_at)}</dd>
              </div>
            )}
          </dl>

          <div className="profile-actions">
            <button type="button" onClick={handleLogout}>
              Deconectare
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
