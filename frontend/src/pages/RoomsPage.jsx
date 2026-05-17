import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { checkInGuest, checkOutGuest, createRoom, getRoomOccupancy } from '../api/rooms'
import { getUsers } from '../api/users'
import { useAuth } from '../context/useAuth'
import './DashboardPage.css'
import './RoomsPage.css'

function sortRooms(rooms) {
  return [...rooms].sort((a, b) => a.room_number.localeCompare(b.room_number, 'ro-RO', { numeric: true }))
}

export default function RoomsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const role = user?.role || 'guest'
  const canManageRooms = role === 'receptionist' || role === 'admin'
  const isAdmin = role === 'admin'
  const [rooms, setRooms] = useState([])
  const [users, setUsers] = useState([])
  const [selectedGuests, setSelectedGuests] = useState({})
  const [newRoom, setNewRoom] = useState({ room_number: '', floor: '' })
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionLoading, setActionLoading] = useState('')
  const [pendingCheckOutRoom, setPendingCheckOutRoom] = useState(null)

  const availableGuests = useMemo(
    () => users.filter((account) => account.role === 'guest' && account.is_active && !account.room_id),
    [users],
  )

  const filteredRooms = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('ro-RO')
    return sortRooms(rooms)
      .filter((room) => {
        if (filter === 'occupied') return Boolean(room.occupied_by)
        if (filter === 'free') return !room.occupied_by && room.is_active
        if (filter === 'attention') return room.active_requests_count > 0
        return true
      })
      .filter((room) => {
        if (!normalizedSearch) return true
        return [
          room.room_number,
          room.floor,
          room.occupied_by?.full_name,
          room.occupied_by?.email,
        ].some((value) => String(value || '').toLocaleLowerCase('ro-RO').includes(normalizedSearch))
      })
  }, [filter, rooms, search])

  const loadData = useCallback(() => {
    setLoading(true)
    setError('')
    return Promise.all([getRoomOccupancy(), getUsers()])
      .then(([roomData, userData]) => {
        setRooms(Array.isArray(roomData) ? roomData : [])
        setUsers(Array.isArray(userData) ? userData : [])
      })
      .catch((err) => {
        setRooms([])
        setUsers([])
        setError(err?.message || 'Nu am putut încărca camerele.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (canManageRooms) loadData()
  }, [canManageRooms, loadData])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  async function handleCreateRoom(event) {
    event.preventDefault()
    if (!newRoom.room_number.trim()) {
      setActionError('Completează numărul camerei.')
      setMessage('')
      return
    }

    setActionLoading('create-room')
    setActionError('')
    setMessage('')
    try {
      await createRoom({
        room_number: newRoom.room_number.trim(),
        floor: newRoom.floor ? Number(newRoom.floor) : null,
      })
      setNewRoom({ room_number: '', floor: '' })
      setMessage('Camera a fost creată.')
      await loadData()
    } catch (err) {
      setActionError(err?.message || 'Nu am putut crea camera.')
    } finally {
      setActionLoading('')
    }
  }

  async function handleCheckIn(roomId) {
    const guestId = selectedGuests[roomId]
    if (!guestId) return

    setActionLoading(`check-in-${roomId}`)
    setActionError('')
    setMessage('')
    try {
      await checkInGuest(roomId, guestId)
      setSelectedGuests((current) => ({ ...current, [roomId]: '' }))
      setMessage('Check-in realizat.')
      await loadData()
    } catch (err) {
      setActionError(err?.message || 'Nu am putut face check-in.')
    } finally {
      setActionLoading('')
    }
  }

  async function handleCheckOut(roomId) {
    setActionLoading(`check-out-${roomId}`)
    setActionError('')
    setMessage('')
    try {
      await checkOutGuest(roomId)
      setMessage('Check-out realizat.')
      setPendingCheckOutRoom(null)
      await loadData()
    } catch (err) {
      setActionError(err?.message || 'Nu am putut face check-out.')
    } finally {
      setActionLoading('')
    }
  }

  if (!canManageRooms) return <Navigate to="/dashboard" replace />

  return (
    <div className="dashboard-shell">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="rooms-main">
        <header className="rooms-hero">
          <div>
            <p>Administrare camere</p>
            <h1>Camere</h1>
            <span>Vezi ocuparea camerelor, cererile active și gestionează check-in/check-out.</span>
          </div>
          <div className="rooms-summary">
            <strong>{rooms.length}</strong>
            <span>camere totale</span>
          </div>
        </header>

        <section className="rooms-panel">
          <div className="rooms-panel__header">
            <div>
              <p>Operațiuni</p>
              <h2>Ocupare camere</h2>
            </div>
            <div className="rooms-tools">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Caută cameră sau guest..."
              />
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="all">Toate camerele</option>
                <option value="free">Libere</option>
                <option value="occupied">Ocupate</option>
                <option value="attention">Cu cereri active</option>
              </select>
            </div>
          </div>

          {isAdmin && (
            <form className="rooms-create-form" onSubmit={handleCreateRoom}>
              <label>
                <span>Număr cameră</span>
                <input
                  value={newRoom.room_number}
                  onChange={(event) => setNewRoom((current) => ({ ...current, room_number: event.target.value }))}
                  placeholder="Ex: 301"
                />
              </label>
              <label>
                <span>Etaj</span>
                <input
                  type="number"
                  value={newRoom.floor}
                  onChange={(event) => setNewRoom((current) => ({ ...current, floor: event.target.value }))}
                  placeholder="3"
                />
              </label>
              <button type="submit" disabled={actionLoading === 'create-room'}>
                Creează cameră
              </button>
            </form>
          )}

          {(message || actionError) && (
            <div className={`rooms-alert ${actionError ? 'rooms-alert--error' : ''}`}>
              {actionError || message}
            </div>
          )}

          {loading && <div className="rooms-state">Se încarcă camerele...</div>}
          {!loading && error && <div className="rooms-state rooms-state--error">{error}</div>}

          {!loading && !error && (
            <div className="rooms-grid">
              {filteredRooms.map((room) => (
                <article key={room.id} className="room-card">
                  <div className="room-card__header">
                    <div>
                      <p>Camera</p>
                      <h3>#{room.room_number}</h3>
                    </div>
                    <span className={room.occupied_by ? 'room-status room-status--occupied' : 'room-status'}>
                      {room.occupied_by ? 'Ocupată' : 'Liberă'}
                    </span>
                  </div>

                  <dl>
                    <div>
                      <dt>Etaj</dt>
                      <dd>{room.floor ?? '-'}</dd>
                    </div>
                    <div>
                      <dt>Cereri active</dt>
                      <dd>{room.active_requests_count}</dd>
                    </div>
                    <div>
                      <dt>Guest</dt>
                      <dd>{room.occupied_by?.full_name || '-'}</dd>
                    </div>
                  </dl>

                  {room.occupied_by ? (
                    <button
                      type="button"
                      className="room-card__danger"
                      onClick={() => setPendingCheckOutRoom(room)}
                      disabled={actionLoading === `check-out-${room.id}`}
                    >
                      Check-out
                    </button>
                  ) : (
                    <div className="room-checkin">
                      <select
                        value={selectedGuests[room.id] || ''}
                        onChange={(event) =>
                          setSelectedGuests((current) => ({ ...current, [room.id]: event.target.value }))
                        }
                      >
                        <option value="">Alege guest</option>
                        {availableGuests.map((guest) => (
                          <option key={guest.id} value={guest.id}>
                            {guest.full_name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleCheckIn(room.id)}
                        disabled={!selectedGuests[room.id] || actionLoading === `check-in-${room.id}`}
                      >
                        Check-in
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {pendingCheckOutRoom && (
          <div className="app-confirm-backdrop" role="presentation">
            <div className="app-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
              <p>Confirmare check-out</p>
              <h2 id="checkout-title">Eliberezi camera #{pendingCheckOutRoom.room_number}?</h2>
              <span>
                Guestul {pendingCheckOutRoom.occupied_by?.full_name || 'selectat'} va fi scos din cameră, iar camera
                va apărea ca liberă. Cererile rămân în istoric.
              </span>
              <div>
                <button
                  type="button"
                  className="app-confirm-secondary"
                  onClick={() => setPendingCheckOutRoom(null)}
                  disabled={actionLoading === `check-out-${pendingCheckOutRoom.id}`}
                >
                  Renunță
                </button>
                <button
                  type="button"
                  className="app-confirm-danger"
                  onClick={() => handleCheckOut(pendingCheckOutRoom.id)}
                  disabled={actionLoading === `check-out-${pendingCheckOutRoom.id}`}
                >
                  {actionLoading === `check-out-${pendingCheckOutRoom.id}` ? 'Se salvează...' : 'Confirmă check-out'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
