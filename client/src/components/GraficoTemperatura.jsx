import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts'
import { obtenerHistorial } from '../api/historial'
import './GraficoTemperatura.css'

const RANGOS = [
  { id: '24h', label: '2 H', ventanaMs: 2 * 3600 * 1000 },
  { id: '24h', label: '24 H', ventanaMs: 24 * 3600 * 1000 },
  { id: '7d', label: '7 D', ventanaMs: 7 * 24 * 3600 * 1000 }
]

function colorPorEstado(estado) {
  if (estado === 'critica') return 'var(--color-critica)'
  if (estado === 'preventiva') return 'var(--color-preventiva)'
  return 'var(--text-cyan)'
}

function formatearHora(iso, ventanaMs) {
  const fecha = new Date(iso)
  if (ventanaMs <= 24 * 3600 * 1000) {
    return fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

export function GraficoTemperatura({ cuartoId, temperaturaActual, estadoAlarma }) {
  const [rangoIdx, setRangoIdx] = useState(0)
  const [lecturas, setLecturas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const rango = RANGOS[rangoIdx]

  useEffect(() => {
    let activo = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCargando(true)
    setError(null)
    obtenerHistorial(cuartoId, rango.id)
      .then(({ lecturas: data }) => {
        if (!activo) return
        const desde = Date.now() - rango.ventanaMs
        const filtradas = data.filter(l => new Date(l.timestamp).getTime() >= desde)
        setLecturas(filtradas)
      })
      .catch((err) => {
        if (!activo) return
        const msg = err?.response?.data?.mensaje || 'No se pudo obtener el historial'
        setError(msg)
        setLecturas([])
      })
      .finally(() => activo && setCargando(false))
    return () => { activo = false }
  }, [cuartoId, rango.id, rango.ventanaMs])

  const datos = useMemo(() => lecturas.map(l => ({
    timestamp: l.timestamp,
    horaLabel: formatearHora(l.timestamp, rango.ventanaMs),
    temperatura: l.temperatura,
    estado: l.estado_alarma
  })), [lecturas, rango.ventanaMs])

  const stats = useMemo(() => {
    if (datos.length === 0) return { pico: null, hace1h: null, hace2h: null }
    const ultimoMs = new Date(datos[datos.length - 1].timestamp).getTime()
    const masCercana = (objetivoMs) => {
      let mejor = null
      let mejorDiff = Infinity
      for (const d of datos) {
        const diff = Math.abs(new Date(d.timestamp).getTime() - objetivoMs)
        if (diff < mejorDiff) { mejor = d; mejorDiff = diff }
      }
      return mejor?.temperatura ?? null
    }
    return {
      pico: Math.max(...datos.map(d => d.temperatura)),
      hace1h: masCercana(ultimoMs - 3600 * 1000),
      hace2h: masCercana(ultimoMs - 2 * 3600 * 1000)
    }
  }, [datos])

  const colorLinea = colorPorEstado(estadoAlarma)
  const formatTemp = (t) => {
    if (typeof t !== 'number') return '—'
    const signo = t > 0 ? '+' : ''
    return `${signo}${t.toFixed(1)}°C`
  }

  return (
    <section className="grafico-temp">
      <div className="grafico-temp__col-actual">
        <span className="grafico-temp__label">TEMPERATURA ACTUAL</span>
        <div className="grafico-temp__valor" style={{ color: colorLinea }}>
          {formatTemp(temperaturaActual)}
        </div>
        <span
          className={`grafico-temp__estado grafico-temp__estado--${estadoAlarma}`}
        >
          <span className="grafico-temp__estado-dot" />
          {estadoAlarma.charAt(0).toUpperCase() + estadoAlarma.slice(1)}
        </span>
      </div>

      <div className="grafico-temp__col-grafico">
        <div className="grafico-temp__cabecera">
          <span className="grafico-temp__titulo">EVOLUCIÓN ÚLTIMAS {rango.label}</span>
          <div className="grafico-temp__rangos" role="tablist" aria-label="Ventana de tiempo">
            {RANGOS.map((r, i) => (
              <button
                key={r.label}
                type="button"
                role="tab"
                aria-selected={i === rangoIdx}
                onClick={() => setRangoIdx(i)}
                className={`grafico-temp__rango${i === rangoIdx ? ' grafico-temp__rango--activo' : ''}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grafico-temp__lienzo">
          {cargando && <div className="grafico-temp__estado-msg">Cargando…</div>}
          {error && <div className="grafico-temp__estado-msg grafico-temp__estado-msg--error">{error}</div>}
          {!cargando && !error && datos.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id={`fill-${cuartoId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colorLinea} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={colorLinea} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(99, 179, 237, 0.05)" vertical={false} />
                <XAxis
                  dataKey="horaLabel"
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  interval="preserveStartEnd"
                  minTickGap={40}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  domain={['auto', 'auto']}
                  width={40}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12
                  }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                  formatter={(v) => [`${v}°C`, 'Temp']}
                />
                <ReferenceLine
                  y={3}
                  stroke="var(--color-preventiva)"
                  strokeDasharray="4 4"
                  label={{ value: '3°C preventivo', position: 'insideTopRight', fill: 'var(--color-preventiva)', fontSize: 10 }}
                />
                <ReferenceLine
                  y={4}
                  stroke="var(--color-critica)"
                  strokeDasharray="4 4"
                  label={{ value: '4°C critico', position: 'insideTopRight', fill: 'var(--color-critica)', fontSize: 10 }}
                />
                <Area
                  type="monotone"
                  dataKey="temperatura"
                  stroke={colorLinea}
                  strokeWidth={2}
                  fill={`url(#fill-${cuartoId})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {!cargando && !error && datos.length === 0 && (
            <div className="grafico-temp__estado-msg">Sin datos en el rango seleccionado</div>
          )}
        </div>
      </div>

      <div className="grafico-temp__col-stats">
        <div className="grafico-temp__stat">
          <span className="grafico-temp__stat-label">Pico máximo</span>
          <span className="grafico-temp__stat-valor grafico-temp__stat-valor--critica">
            {formatTemp(stats.pico)}
          </span>
        </div>
        <div className="grafico-temp__stat">
          <span className="grafico-temp__stat-label">Hace 1h</span>
          <span className="grafico-temp__stat-valor grafico-temp__stat-valor--preventiva">
            {formatTemp(stats.hace1h)}
          </span>
        </div>
        <div className="grafico-temp__stat">
          <span className="grafico-temp__stat-label">Hace 2h</span>
          <span className="grafico-temp__stat-valor grafico-temp__stat-valor--cyan">
            {formatTemp(stats.hace2h)}
          </span>
        </div>
      </div>
    </section>
  )
}

GraficoTemperatura.propTypes = {
  cuartoId: PropTypes.number.isRequired,
  temperaturaActual: PropTypes.number,
  estadoAlarma: PropTypes.oneOf(['normal', 'preventiva', 'critica'])
}
