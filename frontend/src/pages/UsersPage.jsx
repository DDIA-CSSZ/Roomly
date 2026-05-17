import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { getRooms } from '../api/rooms'
import { createUser, deactivateUser, getUsers, updateUser } from '../api/users'
import { useAuth } from '../context/useAuth'
import './DashboardPage.css'
import './UsersPage.css'

function sortByName(accounts) {
  return [...accounts].sort((a, b) => a.full_name.localeCompare(b.full_name))
}

function matchesAccountSearch(account, normalizedSearch) {
  if (!normalizedSearch) return true

  const searchableValues = [
    account.full_name,
    account.email,
    account.role,
    account.is_active ? 'activ' : 'inactiv',
    account.room?.room_number,
    account.room?.room_number ? `#${account.room.room_number}` : '',
    account.room_id ? `#${account.room_id}` : 'fara camera',
  ]

  return searchableValues.some((value) =>
    String(value || '').toLocaleLowerCase('ro-RO').includes(normalizedSearch),
  )
}

export default function UsersPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState([])
  const [rooms, setRooms] = useState([])
  const [selectedRooms, setSelectedRooms] = useState({})
  const [editedNames, setEditedNames] = useState({})
  const [selectedRoles, setSelectedRoles] = useState({})
  const [selectedStatuses, setSelectedStatuses] = useState({})
  const [newAccount, setNewAccount] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'staff',
    room_id: '',
  })
  const [activeCategory, setActiveCategory] = useState('guest')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionLoading, setActionLoading] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [pendingDeactivateAccount, setPendingDeactivateAccount] = useState(null)

  const role = user?.role || 'guest'
  const canManageUsers = role === 'receptionist' || role === 'admin'
  const isAdmin = role === 'admin'

  const groupedAccounts = useMemo(() => {
    const guests = accounts.filter((account) => account.role === 'guest')
    const staff = accounts.filter((account) => account.role !== 'guest')
    return {
      guest: sortByName(guests),
      staff: sortByName(staff),
    }
  }, [accounts])

  const categoryAccounts = groupedAccounts[activeCategory]
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase('ro-RO')
  const visibleAccounts = useMemo(
    () => categoryAccounts.filter((account) => matchesAccountSearch(account, normalizedSearch)),
    [categoryAccounts, normalizedSearch],
  )
  const newGuestsCount = groupedAccounts.guest.filter((account) => account.is_active && !account.room_id).length

  const loadData = useCallback(() => {
    setLoading(true)
    setError('')
    setActionError('')

    return Promise.all([getUsers(), getRooms()])
      .then(([usersData, roomsData]) => {
        const userList = Array.isArray(usersData) ? usersData : []
        setAccounts(userList)
        setRooms(Array.isArray(roomsData) ? roomsData : [])
        setSelectedRooms(
          userList.reduce((acc, account) => {
            acc[account.id] = account.room_id ? String(account.room_id) : ''
            return acc
          }, {}),
        )
        setEditedNames(
          userList.reduce((acc, account) => {
            acc[account.id] = account.full_name
            return acc
          }, {}),
        )
        setSelectedRoles(
          userList.reduce((acc, account) => {
            acc[account.id] = account.role
            return acc
          }, {}),
        )
        setSelectedStatuses(
          userList.reduce((acc, account) => {
            acc[account.id] = account.is_active ? 'active' : 'inactive'
            return acc
          }, {}),
        )
      })
      .catch((err) => {
        setAccounts([])
        setRooms([])
        setError(err?.message || 'Nu am putut încărca utilizatorii.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (canManageUsers) loadData()
  }, [canManageUsers, loadData])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function handleSelectRoom(userId, roomId) {
    setSelectedRooms((current) => ({ ...current, [userId]: roomId }))
  }

  function handleEditName(userId, fullName) {
    setEditedNames((current) => ({ ...current, [userId]: fullName }))
  }

  function handleSelectRole(userId, nextRole) {
    setSelectedRoles((current) => ({ ...current, [userId]: nextRole }))
  }

  function handleSelectStatus(userId, nextStatus) {
    setSelectedStatuses((current) => ({ ...current, [userId]: nextStatus }))
  }

  function handleNewAccountChange(field, value) {
    setNewAccount((current) => ({ ...current, [field]: value }))
  }

  async function handleCreateAccount(event) {
    event.preventDefault()
    const createRole = activeCategory === 'guest' ? 'guest' : newAccount.role

    const payload = {
      full_name: newAccount.full_name.trim(),
      email: newAccount.email.trim(),
      password: newAccount.password,
      role: createRole,
      ...(createRole === 'guest' && newAccount.room_id ? { room_id: Number(newAccount.room_id) } : {}),
    }

    if (!payload.full_name || !payload.email || !payload.password) {
      setActionError('Completează numele, emailul și parola.')
      setActionMessage('')
      return
    }

    setActionLoading('create-account')
    setActionError('')
    setActionMessage('')
    try {
      await createUser(payload)
      setActionMessage(createRole === 'guest' ? 'Contul de guest a fost creat.' : 'Contul de staff a fost creat.')
      setNewAccount({
        full_name: '',
        email: '',
        password: '',
        role: 'staff',
        room_id: '',
      })
      setShowNewPassword(false)
      await loadData()
    } catch (err) {
      setActionError(err?.message || 'Nu am putut crea contul.')
    } finally {
      setActionLoading('')
    }
  }

  async function handleAssignRoom(accountId) {
    const roomId = selectedRooms[accountId]

    setActionLoading(`room-${accountId}`)
    setActionError('')
    setActionMessage('')
    try {
      await updateUser(accountId, {
        room_id: roomId ? Number(roomId) : null,
      })
      setActionMessage('Camera a fost actualizată.')
      await loadData()
    } catch (err) {
      setActionError(err?.message || 'Nu am putut actualiza camera.')
    } finally {
      setActionLoading('')
    }
  }

  async function handleSaveAccount(account) {
    const nextName = (editedNames[account.id] || '').trim()
    const nextRole = selectedRoles[account.id] || account.role
    const nextStatus = selectedStatuses[account.id] || (account.is_active ? 'active' : 'inactive')

    if (!nextName) {
      setActionError('Numele nu poate fi gol.')
      setActionMessage('')
      return
    }

    setActionLoading(`account-${account.id}`)
    setActionError('')
    setActionMessage('')
    try {
      await updateUser(account.id, {
        full_name: nextName,
        role: nextRole,
        is_active: nextStatus === 'active',
      })
      setActionMessage('Contul a fost actualizat.')
      await loadData()
    } catch (err) {
      setActionError(err?.message || 'Nu am putut actualiza contul.')
    } finally {
      setActionLoading('')
    }
  }

  async function handleDeactivateAccount(account) {
    setActionLoading(`delete-${account.id}`)
    setActionError('')
    setActionMessage('')
    try {
      await deactivateUser(account.id)
      setActionMessage('Contul a fost dezactivat.')
      setPendingDeactivateAccount(null)
      await loadData()
    } catch (err) {
      setActionError(err?.message || 'Nu am putut dezactiva contul.')
    } finally {
      setActionLoading('')
    }
  }

  if (!canManageUsers) return <Navigate to="/dashboard" replace />

  return (
    <div className="dashboard-shell">
      <Sidebar user={user} onLogout={handleLogout} usersBadgeCount={newGuestsCount} />

      <main className="users-main">
        <header className="users-hero">
          <div>
            <p>Administrare conturi</p>
            <h1>Utilizatori</h1>
            <span>Vezi conturile create și asignează camere pentru oaspeți.</span>
          </div>
          <div className="users-summary">
            <strong>{accounts.length}</strong>
            <span>conturi totale</span>
          </div>
        </header>

        <section className="users-panel">
          <div className="users-panel__header">
            <div>
              <p>Categorii</p>
              <h2>{activeCategory === 'guest' ? 'Guest' : 'Staff'}</h2>
            </div>
            <div className="users-panel__tools">
              <div className="users-tabs" role="tablist" aria-label="Categorii utilizatori">
                <button
                  type="button"
                  className={activeCategory === 'guest' ? 'is-active' : ''}
                  onClick={() => setActiveCategory('guest')}
                >
                  Guest <span>{groupedAccounts.guest.length}</span>
                </button>
                <button
                  type="button"
                  className={activeCategory === 'staff' ? 'is-active' : ''}
                  onClick={() => setActiveCategory('staff')}
                >
                  Staff <span>{groupedAccounts.staff.length}</span>
                </button>
              </div>
              <label className="users-search" htmlFor="users-search">
                <span>Caută utilizatori</span>
                <input
                  id="users-search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={activeCategory === 'guest' ? 'Caută guest...' : 'Caută staff...'}
                />
              </label>
            </div>
          </div>

          {isAdmin && (
            <form className="users-create-form" onSubmit={handleCreateAccount}>
              <div>
                <label htmlFor="new-account-name">Nume</label>
                <input
                  id="new-account-name"
                  value={newAccount.full_name}
                  onChange={(event) => handleNewAccountChange('full_name', event.target.value)}
                  disabled={actionLoading === 'create-account'}
                  placeholder="Nume complet"
                />
              </div>
              <div>
                <label htmlFor="new-account-email">Email</label>
                <input
                  id="new-account-email"
                  type="email"
                  value={newAccount.email}
                  onChange={(event) => handleNewAccountChange('email', event.target.value)}
                  disabled={actionLoading === 'create-account'}
                  placeholder="email@roomly.com"
                />
              </div>
              <div>
                <div className="users-create-label-row">
                  <label htmlFor="new-account-password">Parolă</label>
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((current) => !current)}
                    tabIndex={-1}
                  >
                    {showNewPassword ? 'Ascunde' : 'Arată'}
                  </button>
                </div>
                <input
                  id="new-account-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newAccount.password}
                  onChange={(event) => handleNewAccountChange('password', event.target.value)}
                  disabled={actionLoading === 'create-account'}
                  placeholder="Minim 8 caractere"
                />
              </div>
              {activeCategory === 'guest' ? (
                <div>
                  <label htmlFor="new-account-room">Camera</label>
                  <select
                    id="new-account-room"
                    value={newAccount.room_id}
                    onChange={(event) => handleNewAccountChange('room_id', event.target.value)}
                    disabled={actionLoading === 'create-account'}
                  >
                    <option value="">Fără cameră</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        #{room.room_number}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label htmlFor="new-account-role">Rol</label>
                  <select
                    id="new-account-role"
                    value={newAccount.role}
                    onChange={(event) => handleNewAccountChange('role', event.target.value)}
                    disabled={actionLoading === 'create-account'}
                  >
                    <option value="staff">staff</option>
                    <option value="receptionist">receptionist</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
              )}
              <button type="submit" disabled={actionLoading === 'create-account'}>
                Creează cont
              </button>
            </form>
          )}

          {(actionMessage || actionError) && (
            <div className={`users-alert ${actionError ? 'users-alert--error' : ''}`}>
              {actionError || actionMessage}
            </div>
          )}

          {loading && <div className="users-state">Se încarcă utilizatorii...</div>}

          {!loading && error && <div className="users-state users-state--error">{error}</div>}

          {!loading && !error && (
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Nume</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Status</th>
                    <th>Camera</th>
                    {isAdmin && <th>Acțiuni admin</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="users-empty">
                        {searchQuery.trim()
                          ? 'Nu există rezultate pentru căutarea curentă.'
                          : 'Nu există utilizatori în această categorie.'}
                      </td>
                    </tr>
                  ) : (
                    visibleAccounts.map((account) => {
                      const selectedRoom = selectedRooms[account.id] ?? ''
                      const unchanged = String(account.room_id || '') === selectedRoom
                      const isCurrentUser = account.id === user?.id
                      const accountChanged =
                        (editedNames[account.id] || '').trim() !== account.full_name ||
                        (selectedRoles[account.id] || account.role) !== account.role ||
                        (selectedStatuses[account.id] || (account.is_active ? 'active' : 'inactive')) !==
                          (account.is_active ? 'active' : 'inactive')
                      return (
                        <tr key={account.id}>
                          <td>
                            {isAdmin ? (
                              <input
                                className="users-name-input"
                                value={editedNames[account.id] ?? account.full_name}
                                onChange={(event) => handleEditName(account.id, event.target.value)}
                                disabled={actionLoading === `account-${account.id}`}
                                aria-label={`Nume pentru ${account.email}`}
                              />
                            ) : (
                              <strong>{account.full_name}</strong>
                            )}
                          </td>
                          <td>{account.email}</td>
                          <td>
                            {isAdmin ? (
                              <select
                                className="users-admin-select"
                                value={selectedRoles[account.id] ?? account.role}
                                onChange={(event) => handleSelectRole(account.id, event.target.value)}
                                disabled={isCurrentUser || actionLoading === `account-${account.id}`}
                                aria-label={`Rol pentru ${account.full_name}`}
                              >
                                <option value="guest">guest</option>
                                <option value="staff">staff</option>
                                <option value="receptionist">receptionist</option>
                                <option value="admin">admin</option>
                              </select>
                            ) : (
                              <span className="users-role">{account.role}</span>
                            )}
                          </td>
                          <td>
                            {isAdmin ? (
                              <select
                                className="users-admin-select"
                                value={selectedStatuses[account.id] ?? (account.is_active ? 'active' : 'inactive')}
                                onChange={(event) => handleSelectStatus(account.id, event.target.value)}
                                disabled={isCurrentUser || actionLoading === `account-${account.id}`}
                                aria-label={`Status pentru ${account.full_name}`}
                              >
                                <option value="active">Activ</option>
                                <option value="inactive">Inactiv</option>
                              </select>
                            ) : (
                              account.is_active ? 'Activ' : 'Inactiv'
                            )}
                          </td>
                          <td>
                            {account.role === 'guest' ? (
                              <div className="users-room-actions">
                                <select
                                  value={selectedRoom}
                                  onChange={(event) => handleSelectRoom(account.id, event.target.value)}
                                  disabled={actionLoading === `room-${account.id}`}
                                  aria-label={`Camera pentru ${account.full_name}`}
                                >
                                  <option value="">Fără cameră</option>
                                  {rooms.map((room) => (
                                    <option key={room.id} value={room.id}>
                                      #{room.room_number}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleAssignRoom(account.id)}
                                  disabled={unchanged || actionLoading === `room-${account.id}`}
                                >
                                  Salvează
                                </button>
                              </div>
                            ) : (
                              <span className="users-room-muted">Nu se aplică</span>
                            )}
                          </td>
                          {isAdmin && (
                            <td>
                              <div className="users-admin-actions">
                                <button
                                  type="button"
                                  onClick={() => handleSaveAccount(account)}
                                  disabled={!accountChanged || actionLoading === `account-${account.id}`}
                                >
                                  Salvează
                                </button>
                                <button
                                  type="button"
                                  className="users-danger-button"
                                  onClick={() => setPendingDeactivateAccount(account)}
                                  disabled={isCurrentUser || !account.is_active || actionLoading === `delete-${account.id}`}
                                >
                                  Șterge
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {pendingDeactivateAccount && (
          <div className="app-confirm-backdrop" role="presentation">
            <div className="app-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="deactivate-title">
              <p>Confirmare cont</p>
              <h2 id="deactivate-title">Dezactivezi contul?</h2>
              <span>
                Contul {pendingDeactivateAccount.full_name} nu va mai putea fi folosit la autentificare. Istoricul
                cererilor rămâne păstrat în aplicație.
              </span>
              <div>
                <button
                  type="button"
                  className="app-confirm-secondary"
                  onClick={() => setPendingDeactivateAccount(null)}
                  disabled={actionLoading === `delete-${pendingDeactivateAccount.id}`}
                >
                  Renunță
                </button>
                <button
                  type="button"
                  className="app-confirm-danger"
                  onClick={() => handleDeactivateAccount(pendingDeactivateAccount)}
                  disabled={actionLoading === `delete-${pendingDeactivateAccount.id}`}
                >
                  {actionLoading === `delete-${pendingDeactivateAccount.id}` ? 'Se salvează...' : 'Dezactivează'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
