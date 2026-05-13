export default function ServiceCard({ title, description, icon, tone }) {
  return (
    <article className={`service-card service-card--${tone}`}>
      <div className="service-card__icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </article>
  )
}
