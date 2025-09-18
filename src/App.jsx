import { useState } from 'react'

import Card from './components/Card';
import {ScheduleIcon, PunchIcon, InvoiceIcon} from './icons';


function App() {

  //Menu de opciones 
  const menuOptions = [
    { title: 'Ver tabla', icon: <ScheduleIcon /> },
    { title: 'Marcar asistencia', icon: <PunchIcon /> },
    { title: 'Mis Facturas', icon: <InvoiceIcon /> },
  ]

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4 sm:p-6">

      {/* Header */}
      <header className="w-full max-w-2xl mx-auto flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Bienvenido, Geancarlo</h1>
          <p className="text-gray-500">¿Qué te gustaría hacer hoy?</p>
        </div>
        <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
          GA
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-2xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Usamos .map() para crear una Card por cada opción del menú */}
          {menuOptions.map((option) => (
            <Card
              key={option.title} // 'key' es un prop especial que React necesita
              title={option.title}
              icon={option.icon}
              color={option.color}
            />
          ))}
        </div>
      </main>

    </div>
  )
}

export default App
