const PRIORITY_LABELS = {
  low: 'Scăzută',
  normal: 'Normală',
  urgent: 'Urgentă',
}

export default function PriorityBadge({ priority }) {
  const normalized = priority || 'normal'

  return (
    <span className={`priority-badge priority-badge--${normalized}`}>
      {PRIORITY_LABELS[normalized] || normalized}
    </span>
  )
}
