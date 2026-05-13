const STATUS_LABELS = {
  pending: 'Pending',
  assigned: 'Assigned',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export default function StatusBadge({ status }) {
  const normalized = status || 'pending'

  return (
    <span className={`status-badge status-badge--${normalized}`}>
      {STATUS_LABELS[normalized] || normalized}
    </span>
  )
}
