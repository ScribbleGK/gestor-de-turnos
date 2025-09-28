import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth'; 
import { BackIcon, ClockIcon, CheckCircleIcon, BlockedIcon } from '../icons';
import apiUrl from '../apiConfig';

// CAMBIO: La configuración ahora tiene una propiedad separada para la clase de animación.
const buttonConfig = {
  loading:  { tailwind: 'bg-gray-400', animation: '', icon: <BlockedIcon />, disabled: true },
  ready:    { tailwind: 'bg-red-500 hover:bg-red-600', animation: 'pulse-ring-manual', icon: <ClockIcon />, disabled: false },
  punched:  { tailwind: 'bg-green-500', animation: '', icon: <CheckCircleIcon />, disabled: true },
  blocked:  { tailwind: 'bg-gray-400 cursor-not-allowed', animation: '', icon: <BlockedIcon />, disabled: true },
  error:    { tailwind: 'bg-yellow-500', animation: '', icon: <BlockedIcon />, disabled: true },
};

const formatPunchTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

function PunchView({ onBack }) {
  const { currentUser } = useAuth(); 

  const [buttonStatus, setButtonStatus] = useState('loading');
  const [punchMessage, setPunchMessage] = useState("Verificando estado...");

  useEffect(() => {
    const fetchStatus = async () => {
      const employeeId = currentUser.id;
      try {
        const response = await fetch(`${apiUrl}/attendances/status?employeeId=${employeeId}`);
        if (!response.ok) throw new Error('Error de red');
        const data = await response.json();
        
        if (data.status === 'punched' && data.punchTime) {
            setPunchMessage(`Última marca: ${formatPunchTime(data.punchTime)}`);
        } else {
            setPunchMessage(data.message);
        }
        setButtonStatus(data.status);
      } catch (error) {
        console.error("Error al obtener estado:", error);
        setButtonStatus('error');
        setPunchMessage('No se pudo verificar el estado.');
      }
    };
    fetchStatus();
  }, []);

  const handlePunch = async () => {
    const employeeId = currentUser.id;
    setButtonStatus('loading');
    try {
      const response = await fetch(`${apiUrl}/attendances/punch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId }),
      });
      if (!response.ok) throw new Error('Error al marcar');
      
      const data = await response.json();
      
      if (data.success && data.punchTime) {
          setPunchMessage(`Última marca: ${formatPunchTime(data.punchTime)}`);
      } else {
          setPunchMessage(data.message);
      }
      setButtonStatus('punched');
    } catch (error) {
      console.error("Error al marcar:", error);
      setButtonStatus('error');
      setPunchMessage('Error al registrar la marca.');
    }
  };
  
  const currentButton = buttonConfig[buttonStatus];

  return (
    <div className="w-full max-w-md mx-auto flex flex-col h-full" style={{minHeight: '80vh'}}>
      <header className="flex items-center mb-6">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 mr-4">
          <BackIcon />
        </button>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Marcar Asistencia</h2>
          <p className="text-gray-500">Marca tu entrada una vez por turno.</p>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center text-center">
        <div className="bg-white p-6 rounded-2xl shadow-md mb-8 w-full">
          <p className="text-gray-600">{punchMessage}</p>
        </div>

        <button
          onClick={handlePunch}
          disabled={currentButton.disabled}
          // CAMBIO: Combinamos las clases de Tailwind con nuestra clase de animación manual.
          className={`w-48 h-48 rounded-full text-white flex items-center justify-center transform transition-transform duration-150 focus:outline-none focus:ring-4 focus:ring-opacity-50 active:scale-90 ${currentButton.tailwind} ${currentButton.animation}`}
        >
          {currentButton.icon}
        </button>
      </main>
    </div>
  );
}

export default PunchView;