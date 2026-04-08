import { useSocket } from '../../hooks/useSocket'
import { RoomCard } from '../../components/RoomCard/RoomCard'
import './Dashboard.css'

export function Dashboard() {
  const { cuartos, conectado } = useSocket()

  const hora = new Date().toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  const alarmasCriticas = Object.values(cuartos).filter(
    c => c.estadoAlarma === 'critica'
  ).length

  return (
    <div className="dashboard">

      {/* Header */}
      <header className="dashboard__header">
        <div className="dashboard__header-left">
          <div className="dashboard__logo">SEI</div>
          <div>
            <h1 className="dashboard__titulo">Sistema de Enfriamiento Inteligente</h1>
            <span className="dashboard__subtitulo">HMI · Panel de Control Central · v1.0</span>
          </div>
        </div>
        <div className="dashboard__header-right">
          {alarmasCriticas > 0 && (
            <div className="dashboard__alarma-badge">
              <span className="dashboard__alarma-dot" />
              {alarmasCriticas} ALARMA{alarmasCriticas > 1 ? 'S' : ''} CRÍTICA{alarmasCriticas > 1 ? 'S' : ''}
            </div>
          )}
          <span className="dashboard__hora">{hora}</span>
          <div className="dashboard__estado">
            <span
              className="dashboard__estado-dot"
              style={{ background: conectado ? 'var(--color-normal)' : 'var(--color-critica)' }}
            />
            <span style={{ color: conectado ? 'var(--text-muted)' : 'var(--color-critica)' }}>
              {conectado ? 'En línea' : 'Sin conexión'}
            </span>
          </div>
        </div>
      </header>

      {/* Navbar */}
      <nav className="dashboard__nav">
        <button className="dashboard__nav-item dashboard__nav-item--active">
          Panel principal
        </button>
        <div className="dashboard__nav-divider" />
        <button className="dashboard__nav-item">
          Historial de temperatura
        </button>
        <div className="dashboard__nav-divider" />
        <button className="dashboard__nav-item">
          Intervenciones Manuales
        </button>
      </nav>

      {/* Contenido principal */}
      <main className="dashboard__main">

        {/* Grid de cuartos */}
        <div className="dashboard__grid">
          {Object.entries(cuartos).map(([id, datos]) => (
            <RoomCard
              key={id}
              cuartoId={Number(id)}
              datos={datos}
            />
          ))}
        </div>

        {/* Panel lateral derecho */}
        <aside className="dashboard__aside">

          {/* Resumen de cuartos */}
          <div className="dashboard__resumen">
            <h2 className="dashboard__resumen-titulo">Resumen de cuartos</h2>
            <div className="dashboard__resumen-header">
              <span>#</span>
              <span>TEMP</span>
              <span>ESTADO</span>
            </div>
            {Object.entries(cuartos).map(([id, datos]) => {
              const { temperatura, estadoAlarma = 'normal' } = datos

              const getTempColor = () => {
                if (temperatura === null) return 'var(--text-muted)'
                if (estadoAlarma === 'critica') return 'var(--color-critica)'
                if (estadoAlarma === 'preventiva') return 'var(--color-preventiva)'
                return 'var(--text-cyan)'
              }

              const getBadge = () => {
                if (estadoAlarma === 'critica') return {
                  bg: 'rgba(239,68,68,0.14)',
                  border: 'rgba(239,68,68,0.35)',
                  color: 'var(--color-critica)',
                  dot: 'var(--color-critica)',
                  label: 'Crítica'
                }
                if (estadoAlarma === 'preventiva') return {
                  bg: 'rgba(245,158,11,0.1)',
                  border: 'rgba(239,68,68,0.35)',
                  color: 'var(--color-preventiva)',
                  dot: 'var(--color-preventiva)',
                  label: 'Preventiva'
                }
                return {
                  bg: 'rgba(16,185,129,0.1)',
                  border: 'rgba(16,185,129,0.25)',
                  color: 'var(--color-normal)',
                  dot: 'var(--color-normal)',
                  label: 'Normal'
                }
              }

              const badge = getBadge()
              const signo = temperatura > 0 ? '+' : ''
              const tempStr = temperatura === null
                ? '—'
                : `${signo}${temperatura.toFixed(1)}°`

              return (
                <div key={id} className="dashboard__resumen-row">
                  <span className="dashboard__resumen-id">C{id}</span>
                  <span
                    className="dashboard__resumen-temp"
                    style={{ color: getTempColor() }}
                  >
                    {tempStr}
                  </span>
                  <div
                    className="dashboard__resumen-badge"
                    style={{
                      background: badge.bg,
                      border: `1px solid ${badge.border}`,
                      color: badge.color
                    }}
                  >
                    <span
                      className="dashboard__resumen-dot"
                      style={{ background: badge.dot }}
                    />
                    {badge.label}
                  </div>
                  <div className="dashboard__resumen-divider" />
                </div>
              )
            })}
          </div>

          {/* Log de eventos */}
          <div className="dashboard__log">
            <h2 className="dashboard__log-titulo">LOG DE EVENTOS</h2>
            <div className="dashboard__log-entries">
              <div className="dashboard__log-entry">
                <span className="dashboard__log-hora">--:--:--</span>
                <span style={{ color: 'var(--text-cyan)' }}>
                  Sistema iniciado — esperando datos
                </span>
              </div>
            </div>
          </div>

        </aside>
      </main>
    </div>
  )
}