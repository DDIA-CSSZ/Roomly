const STATUS_LABELS = {
  pending: 'În așteptare',
  assigned: 'Asignată',
  in_progress: 'În lucru',
  completed: 'Finalizată',
  cancelled: 'Anulată',
}

export default function StatusBadge({ status }) {
  const normalized = status || 'pending'

  return (
    <span className={`status-badge status-badge--${normalized}`}>
      {STATUS_LABELS[normalized] || normalized}
    </span>
  )
}
