import { Navigate, Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { HistorialPanel } from './pages/HistorialPanel'
import { CuartoDetalle } from './pages/CuartoDetalle'
import { ProtectedRoute } from './routes/ProtectedRoute'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cuarto/:id"
        element={
          <ProtectedRoute>
            <CuartoDetalle />
          </ProtectedRoute>
        }
      />
      <Route
        path="/historial"
        element={
          <ProtectedRoute>
            <HistorialPanel />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
