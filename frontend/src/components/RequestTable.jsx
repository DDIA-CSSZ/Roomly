import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import PriorityBadge from './PriorityBadge'

function formatDate(value) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getNextStaffStatus(status) {
  if (status === 'assigned') return { value: 'in_progress', label: 'Începe lucrul' }
  if (status === 'in_progress') return { value: 'completed', label: 'Finalizează' }
  return null
}

export default function RequestTable({
  requests,
  role,
  loading,
  error,
  staffUsers = [],
  selectedStaff = {},
  actionLoading = '',
  onSelectStaff,
  onAssignRequest,
  onUpdateStatus,
  onUpdatePriority,
}) {
  if (loading) {
    return <div className="requests-empty">Se încarcă cererile...</div>
  }

  if (error) {
    return <div className="requests-empty requests-empty--error">{error}</div>
  }

  if (!requests.length) {
    return <div className="requests-empty">Nu există cereri momentan.</div>
  }

  const canAssign = role === 'receptionist' || role === 'admin'
  const canUpdateAsStaff = role === 'staff'

  return (
    <div className="request-table-wrap">
      <table className="request-table">
        <thead>
          <tr>
            <th>Serviciu</th>
            <th>Descriere</th>
            <th>Prioritate</th>
            <th>Status</th>
            <th>Camera</th>
            <th>{role === 'staff' ? 'Oaspete' : 'Asignat'}</th>
            <th>Data</th>
            <th>Acțiuni</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => {
            const selectedStaffId = selectedStaff[request.id] || request.assigned_to?.id || ''
            const isActionLoading = actionLoading === String(request.id)
            const nextStaffStatus = getNextStaffStatus(request.status)

            return (
              <tr key={request.id}>
                <td>
                  <strong>{request.service_category?.name || 'Serviciu'}</strong>
                  <span>#{request.id}</span>
                </td>
                <td>{request.description}</td>
                <td>
                  {canAssign ? (
                    <select
                      className="request-priority-select"
                      value={request.priority || 'normal'}
                      onChange={(event) => onUpdatePriority?.(request.id, event.target.value)}
                      disabled={isActionLoading || request.status === 'completed' || request.status === 'cancelled'}
                      aria-label={`Prioritate pentru cererea ${request.id}`}
                    >
                      <option value="low">Scăzută</option>
                      <option value="normal">Normală</option>
                      <option value="urgent">Urgentă</option>
                    </select>
                  ) : (
                    <PriorityBadge priority={request.priority} />
                  )}
                </td>
                <td>
                  <StatusBadge status={request.status} />
                </td>
                <td>{request.room?.room_number ? `#${request.room.room_number}` : '-'}</td>
                <td>
                  {role === 'staff'
                    ? request.guest?.full_name || '-'
                    : request.assigned_to?.full_name || 'Neasignat'}
                </td>
                <td>{formatDate(request.created_at)}</td>
                {canAssign && (
                  <td>
                    <div className="request-actions">
                      <select
                        value={selectedStaffId}
                        onChange={(event) => onSelectStaff?.(request.id, event.target.value)}
                        disabled={isActionLoading || request.status === 'completed' || request.status === 'cancelled'}
                      >
                        <option value="">Alege staff</option>
                        {staffUsers.map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.full_name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => onAssignRequest?.(request.id)}
                        disabled={
                          isActionLoading ||
                          !selectedStaffId ||
                          request.status === 'completed' ||
                          request.status === 'cancelled'
                        }
                      >
                        {isActionLoading ? 'Se salvează...' : 'Asignează'}
                      </button>
                      <Link className="request-action-link" to={`/requests/${request.id}`}>
                        Detalii
                      </Link>
                    </div>
                  </td>
                )}
                {canUpdateAsStaff && (
                  <td>
                    <div className="request-actions">
                      {nextStaffStatus ? (
                        <button
                          type="button"
                          className="request-action-button"
                          onClick={() => onUpdateStatus?.(request.id, nextStaffStatus.value)}
                          disabled={isActionLoading}
                        >
                          {isActionLoading ? 'Se salvează...' : nextStaffStatus.label}
                        </button>
                      ) : (
                        <span className="request-action-muted">Fără acțiuni</span>
                      )}
                      <Link className="request-action-link" to={`/requests/${request.id}`}>
                        Detalii
                      </Link>
                    </div>
                  </td>
                )}
                {!canAssign && !canUpdateAsStaff && (
                  <td>
                    <Link className="request-action-link" to={`/requests/${request.id}`}>
                      Detalii
                    </Link>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
