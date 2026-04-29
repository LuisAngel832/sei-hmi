import { useState, useCallback } from 'react'
import { Header } from '../components/Header'
import { TablaHistorial } from '../components/TablaHistorial'
import { obtenerHistorial, descargarCsvHistorial } from '../api/historial'
import './HistorialPanel.css'

const CUARTOS = [1, 2, 3, 4, 5]
const RANGOS = [
  { valor: '24h', etiqueta: 'Ultimas 24 h' },
  { valor: '7d',  etiqueta: 'Ultimos 7 dias' },
  { valor: '30d', etiqueta: 'Ultimos 30 dias' }
]

export function HistorialPanel() {
  const [cuartoId, setCuartoId]     = useState(1)
  const [rango, setRango]           = useState('24h')
  const [lecturas, setLecturas]     = useState([])
  const [pagina, setPagina]         = useState(1)
  const [cargando, setCargando]     = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [error, setError]           = useState(null)
  const [buscado, setBuscado]       = useState(false)

  const buscar = useCallback(async () => {
    setCargando(true)
    setError(null)
    setPagina(1)
    try {
      const resultado = await obtenerHistorial(cuartoId, rango)
      setLecturas(resultado.lecturas ?? [])
      setBuscado(true)
    } catch (err) {
      setError(err?.response?.status === 401
        ? 'Sesion expirada. Recarga la pagina e inicia sesion de nuevo.'
        : 'No se pudo cargar el historial. Verifica que el backend este disponible.')
      setLecturas([])
    } finally {
      setCargando(false)
    }
  }, [cuartoId, rango])

  const exportarCsv = useCallback(async () => {
    setDescargando(true)
    try {
      await descargarCsvHistorial(cuartoId, rango)
    } catch {
      setError('No se pudo exportar el CSV. Intenta de nuevo.')
    } finally {
      setDescargando(false)
    }
  }, [cuartoId, rango])

  return (
    <div className="historial-page">
      <Header />

      <main className="historial-main">
        <div className="historial-card">
          <h2 className="historial-card__titulo">Historial de Temperatura</h2>
          <p className="historial-card__subtitulo">
            Consulta y exporta lecturas de temperatura por cuarto. Disponible para operador y supervisor.
          </p>

          {/* Controles de busqueda */}
          <div className="historial-filtros">
            <div className="historial-filtros__grupo">
              <label className="historial-filtros__label" htmlFor="sel-cuarto">Cuarto</label>
              <select
                id="sel-cuarto"
                className="historial-filtros__select"
                value={cuartoId}
                onChange={e => setCuartoId(Number(e.target.value))}
              >
                {CUARTOS.map(id => (
                  <option key={id} value={id}>Cuarto {id}</option>
                ))}
              </select>
            </div>

            <div className="historial-filtros__grupo">
              <span className="historial-filtros__label">Rango</span>
              <div className="historial-filtros__radios" role="radiogroup" aria-label="Rango de tiempo">
                {RANGOS.map(r => (
                  <label key={r.valor} className="historial-filtros__radio-label">
                    <input
                      type="radio"
                      name="rango"
                      value={r.valor}
                      checked={rango === r.valor}
                      onChange={() => setRango(r.valor)}
                      className="historial-filtros__radio-input"
                    />
                    <span className={`historial-filtros__radio-btn${rango === r.valor ? ' historial-filtros__radio-btn--activo' : ''}`}>
                      {r.etiqueta}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="historial-filtros__acciones">
              <button
                className="historial-btn historial-btn--buscar"
                onClick={buscar}
                disabled={cargando}
              >
                {cargando ? 'Cargando...' : 'Consultar'}
              </button>
              {buscado && lecturas.length > 0 && (
                <button
                  className="historial-btn historial-btn--csv"
                  onClick={exportarCsv}
                  disabled={descargando}
                >
                  {descargando ? 'Generando...' : 'Exportar CSV'}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="historial-error" role="alert">{error}</div>
          )}

          {buscado && !cargando && !error && (
            <div className="historial-resultado">
              <p className="historial-resultado__meta">
                Cuarto {cuartoId} · {RANGOS.find(r => r.valor === rango)?.etiqueta} · {lecturas.length} registros
              </p>
              <TablaHistorial
                lecturas={lecturas}
                pagina={pagina}
                onCambiarPagina={setPagina}
              />
            </div>
          )}

          {!buscado && !cargando && (
            <div className="historial-vacio">
              Selecciona un cuarto y un rango, luego haz click en <strong>Consultar</strong>.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
