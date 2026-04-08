import { useSocket } from './hooks/useSocket'
import { Header } from './components/Header'
import { RoomCard } from './components/RoomCard'
import './App.css'

function App() {
  const { cuartos, conectado, alarmasActivas } = useSocket()

  return (
    <div className="app">
      <Header conectado={conectado} alarmasActivas={alarmasActivas} />
      
      <main className="dashboard">
        <div className="room-grid">
          {[1, 2, 3, 4, 5].map(id => (
            <RoomCard 
              key={id} 
              cuartoId={id} 
              datos={cuartos[id]} 
            />
          ))}
        </div>
      </main>
    </div>
  )
}

export default App
