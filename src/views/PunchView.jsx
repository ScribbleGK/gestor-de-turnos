// src/views/PunchView.jsx
import { useState, useEffect } from 'react';
import { BackIcon, ClockIcon, CheckCircleIcon, BlockedIcon } from '../icons';

// --- Lógica de Horarios (Pura, fuera del componente) ---
const checkPunchWindow = (date) => {
  const day = 6; // Domingo=0, Lunes=1, ..., Sábado=6
  const hour = 20;

  // Horario de Mañana: Lunes (1) a Viernes (5), de 7:00 a 9:59
  const isMorningShift = (day >= 1 && day <= 5) && (hour >= 7 && hour < 10);
  // Horario de Tarde: Viernes (5) y Sábado (6), de 18:00 a 21:59
  const isEveningShift = (day === 5 || day === 6) && (hour >= 18 && hour < 22);

  return isMorningShift || isEveningShift;
};

function PunchView({ onBack }) {
  const [hasPunched, setHasPunched] = useState(false);
  const [buttonState, setButtonState] = useState({
    status: 'loading',
    text: 'Calculando...',
    color: 'bg-gray-400',
    icon: <BlockedIcon />,
    disabled: true,
  });
  const [punchMessage, setPunchMessage] = useState("No has marcado asistencia hoy");

  useEffect(() => {
    const updateButtonState = () => {
        const now = new Date();
        const isWithinWindow = checkPunchWindow(now);

        if (hasPunched) {
            setButtonState({
                status: 'punched', 
                text: 'Asistencia Registrada', 
                color: 'bg-green-500', 
                icon: <CheckCircleIcon />, 
                disabled: true,
            });
        } else if (isWithinWindow) {
            setButtonState({
                status: 'ready', 
                text: 'Marcar Asistencia', 
                color: 'bg-red-500 hover:bg-red-600', 
                icon: <ClockIcon />, 
                disabled: false,
            });
        } else {
            setButtonState({
                status: 'blocked', 
                text: 'No disponible', 
                color: 'bg-gray-400 cursor-not-allowed', 
                icon: <BlockedIcon />, 
                disabled: true,
            });
        }
    };

    updateButtonState(); // La llamamos una vez para establecer el estado inicial
    const intervalId = setInterval(updateButtonState, 60000); // Repetimos la llamada cada minuto

    return () => clearInterval(intervalId); // Limpieza: cancelamos el intervalo si salimos de la página
    }, [hasPunched]); // El array de dependencias: este efecto se volverá a ejecutar si 'hasPunched' cambia.


    const handlePunch = () => {
        if (buttonState.status === 'ready') {
            const now = new Date();
            const timeString = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            setHasPunched(true); // ¡Marcamos! Esto hará que el useEffect se vuelva a ejecutar
            setPunchMessage(`Entrada marcada hoy a las ${timeString}`);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto flex flex-col h-full" style={{minHeight: '80vh'}}>
            <header className="flex items-center mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 mr-4">
                    <BackIcon />
                </button>
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Marcar Asistencia</h2>
                    <p className="text-gray-500">Marca tu entrada cuando estés en el horario correcto.</p>
                </div>
            </header>

            <main className="flex-grow flex flex-col items-center justify-center text-center">
                <div className="bg-white p-6 rounded-2xl shadow-md mb-8 w-full">
                    <p className="text-gray-600">{punchMessage}</p>
                </div>

                <button
                    onClick={handlePunch}
                    disabled={buttonState.disabled}
                    className={`w-48 h-48 rounded-full text-white flex flex-col items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-opacity-50 ${buttonState.color}`}
                >
                    {buttonState.icon}
                    <span className="mt-2 text-2xl font-bold">{buttonState.text}</span>
                </button>
            </main>
        </div>
    );

}

export default PunchView;