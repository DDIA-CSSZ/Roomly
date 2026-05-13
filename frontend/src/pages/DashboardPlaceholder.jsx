import { useAuth } from '../context/AuthContext'

/**
 * Pagină placeholder de dashboard. Nu construim aici nimic real —
 * doar dovedim că login-ul a mers și că avem user-ul în context.
 * Va fi înlocuită complet în pașii următori (per rol).
 */
export default function DashboardPlaceholder() {
  const { user, logout } = useAuth()

  return (
    <div
      style={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '32px 36px',
        }}
      >
        <p
          style={{
            fontFamily: "'Geist', system-ui, sans-serif",
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: 'var(--text)',
            margin: 0,
          }}
        >
          Roomly
        </p>
        <h1
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontWeight: 500,
            fontSize: 30,
            letterSpacing: '-0.5px',
            color: 'var(--text-h)',
            margin: '8px 0 24px',
          }}
        >
          Bună, {user?.full_name?.split(' ')[0] || 'oaspete'}.
        </h1>

        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '8px 16px',
            fontSize: 14,
            color: 'var(--text)',
            margin: '0 0 28px',
          }}
        >
          <dt>Email</dt>
          <dd style={{ margin: 0, color: 'var(--text-h)' }}>{user?.email}</dd>
          <dt>Rol</dt>
          <dd style={{ margin: 0, color: 'var(--text-h)' }}>
            <code
              style={{
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 12,
                fontFamily: 'ui-monospace, Consolas, monospace',
              }}
            >
              {user?.role}
            </code>
          </dd>
          {user?.room_id && (
            <>
              <dt>Cameră</dt>
              <dd style={{ margin: 0, color: 'var(--text-h)' }}>#{user.room_id}</dd>
            </>
          )}
        </dl>

        <p style={{ fontSize: 13, color: 'var(--text)', margin: '0 0 20px' }}>
          Dashboard-ul real se construiește în pașii următori, per rol
          (guest / recepție / staff / admin).
        </p>

        <button
          onClick={logout}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-h)',
            padding: '8px 16px',
            borderRadius: 6,
            fontSize: 13,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>
    </div>
  )
}
