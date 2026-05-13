import StatusBadge from './StatusBadge'

function formatDate(value) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function RequestTable({ requests, role, loading, error }) {
  if (loading) {
    return <div className="requests-empty">Se încarcă cererile...</div>
  }

  if (error) {
    return <div className="requests-empty requests-empty--error">{error}</div>
  }

  if (!requests.length) {
    return <div className="requests-empty">Nu există cereri momentan.</div>
  }

  return (
    <div className="request-table-wrap">
      <table className="request-table">
        <thead>
          <tr>
            <th>Serviciu</th>
            <th>Descriere</th>
            <th>Status</th>
            <th>Camera</th>
            <th>{role === 'staff' ? 'Oaspete' : 'Asignat'}</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id}>
              <td>
                <strong>{request.service_category?.name || 'Serviciu'}</strong>
                <span>#{request.id}</span>
              </td>
              <td>{request.description}</td>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
