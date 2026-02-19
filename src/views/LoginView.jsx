import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import PinPad from '../components/PinPad';
import { supabase } from '../supabaseClient';

// --- Selector con Búsqueda (Sin cambios lógicos) ---
const SearchableEmployeeSelect = ({ employees, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const wrapperRef = useRef(null);

  const filteredEmployees = employees.filter(emp => 
    `${emp.name} ${emp.surname}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleSelect = (employee) => {
    setSelectedName(`${employee.name} ${employee.surname}`);
    setSearchTerm(''); 
    setIsOpen(false);
    onSelect(employee); 
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative group">
        <input
          type="text"
          className="w-full p-4 pl-5 border-2 border-gray-200 rounded-2xl text-lg font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all bg-gray-50/50 hover:bg-white"
          placeholder="Busca tu nombre..."
          value={isOpen ? searchTerm : selectedName}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            if(e.target.value === '') setSelectedName(''); 
          }}
          onClick={() => setIsOpen(true)} 
        />
        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400 group-hover:text-indigo-500 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>

      {isOpen && (
        <ul className="absolute z-20 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] max-h-60 overflow-auto divide-y divide-gray-50">
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((emp) => (
              <li
                key={emp.id}
                className="px-5 py-4 hover:bg-indigo-50 cursor-pointer transition-colors flex items-center gap-3"
                onClick={() => handleSelect(emp)}
              >
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    {emp.name.charAt(0)}{emp.surname.charAt(0)}
                </div>
                <div>
                    <span className="font-bold text-gray-900">{emp.name}</span> <span className="text-gray-600">{emp.surname}</span>
                </div>
              </li>
            ))
          ) : (
            <li className="px-5 py-6 text-gray-500 text-center font-medium">No se encontraron empleados.</li>
          )}
        </ul>
      )}
    </div>
  );
};

// --- VISTA 1: Selección de Nombre ---
const SelectNameView = ({ employees, onSelectEmployee, onNext, selectedEmployee }) => (
  <div className="space-y-8 animate-fade-in-up w-full flex flex-col items-center">
     
     {/* Logo / Marca visual */}
     <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-3xl shadow-lg shadow-indigo-200 flex items-center justify-center mb-2">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
     </div>

     <div className="text-center w-full mb-1.5">
         <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">ZARA Cleaners</h1>
         <p className="text-gray-500 font-medium">Portal de Gestión de facturas y personal</p>
     </div>
    
    <div className="w-full mt-4">
        <SearchableEmployeeSelect employees={employees} onSelect={onSelectEmployee} />
    </div>

    <button 
      onClick={onNext}
      disabled={!selectedEmployee} 
      className={`w-full font-bold py-4 px-4 rounded-2xl transition-all duration-200 text-lg shadow-md flex items-center justify-center gap-2 ${
        selectedEmployee 
          ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 hover:scale-[1.02]' 
          : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
      }`}
    >
      {selectedEmployee?.role === 'admin' ? 'Continuar como Admin' : 'Acceder al Portal'}
      {selectedEmployee && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>}
    </button>
  </div>
);

// --- VISTA 2: PIN (Solo Admins) ---
const PinView = ({ title, subTitle, onSubmit, pin, setPin, buttonText, onBack, isChecking }) => (
    <div className="animate-fade-in-up w-full">
        <div className="flex justify-start mb-6">
            <button onClick={onBack} className="text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full hover:bg-indigo-50">
                ← Volver al inicio
            </button>
        </div>
        
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔒</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">{title}</h2>
            <p className="text-gray-500 font-medium">{subTitle}</p>
        </div>
        
        <PinPad pin={pin} setPin={setPin} />
        
        <button 
            onClick={onSubmit} 
            disabled={isChecking || pin.length !== 4}
            className={`w-full mt-10 font-bold py-4 px-4 rounded-2xl transition-all duration-200 text-lg shadow-md flex justify-center items-center ${
                pin.length === 4 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 hover:scale-[1.02]' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
            }`}
        >
            {isChecking ? (
                <span className="animate-pulse">Verificando...</span>
            ) : (
                buttonText
            )}
        </button>
    </div>
);

// --- VISTA PRINCIPAL (Sin cambios lógicos) ---
function LoginView() {
  const [view, setView] = useState('select_name');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingPin, setIsCheckingPin] = useState(false);
  const { login } = useAuth();

  const [feedback, setFeedback] = useState({ isOpen: false, title: '', message: '', type: 'error' });

  const showFeedback = (title, message, type = 'error') => {
      setFeedback({ isOpen: true, title, message, type });
  };

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('id, name, surname, role') 
          .eq('active', true)
          .order('name'); 
        
        if (error) throw error;
        setEmployees(data);
      } catch (err) {
        console.error("Error cargando empleados:", err);
        showFeedback('Error de Conexión', 'No se pudieron cargar los empleados. Revisa tu conexión a internet.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const handleNext = async () => {
      if (!selectedEmployee) return;

      if (selectedEmployee.role === 'admin') {
          setPin('');
          setView('enter_pin');
      } else {
          login(selectedEmployee);
      }
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 4) return;
    setIsCheckingPin(true);
    
    try {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('id', selectedEmployee.id)
            .eq('pin', pin)
            .single();

        if (error || !data) throw new Error('PIN incorrecto');
        login(data);
    } catch (err) {
        console.error(err);
        showFeedback('Acceso Denegado', 'El PIN ingresado es incorrecto. Por favor, inténtalo de nuevo.');
        setPin(''); 
    } finally {
        setIsCheckingPin(false);
    }
  };

  const renderContent = () => {
      switch(view) {
          case 'enter_pin':
              return (
                <PinView 
                    title={`Hola, ${selectedEmployee.name}`} 
                    subTitle="Ingresa tu PIN de seguridad" 
                    onSubmit={handlePinSubmit} 
                    pin={pin} 
                    setPin={setPin} 
                    buttonText="Desbloquear"
                    onBack={() => { setView('select_name'); setPin(''); }} 
                    isChecking={isCheckingPin}
                />
              );
          case 'select_name':
          default:
              return (
                <SelectNameView 
                    employees={employees} 
                    selectedEmployee={selectedEmployee}
                    onSelectEmployee={setSelectedEmployee} 
                    onNext={handleNext} 
                />
              );
      }
  }

  return (
    // Fondo sutil con degradado para aspecto premium
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50 flex items-center justify-center p-4 sm:p-6">
      {/* QUITAMOS EL overflow-hidden DE ESTE DIV PRINCIPAL y movimos el padding */}
      <div className="w-full max-w-[420px] bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100 relative">
        
        {/* CONTENEDOR DE LUCES DECORATIVAS (Aislamos el overflow-hidden aquí) */}
        <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
        </div>

        {/* CONTENIDO DEL LOGIN (Libre para sobresalir) */}
        <div className="relative z-10 flex flex-col items-center p-8 sm:p-10">
            {isLoading ? (
                <div className="text-center p-8 w-full">
                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6"></div>
                    <p className="text-gray-500 font-bold animate-pulse">Conectando...</p>
                </div>
            ) : (
                renderContent()
            )}
        </div>
      </div>

      {/* MODAL DE FEEDBACK (Sin cambios lógicos) */}
      {feedback.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all animate-fade-in-up">
                  <div className={`p-8 text-center ${feedback.type === 'error' ? 'bg-red-50/50' : 'bg-blue-50/50'}`}>
                      <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-5 shadow-sm ${feedback.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                          <span className="text-3xl">{feedback.type === 'error' ? '❌' : 'ℹ️'}</span>
                      </div>
                      <h3 className="text-xl font-black text-gray-900 mb-2">{feedback.title}</h3>
                      <p className="text-sm text-gray-600 font-medium leading-relaxed">{feedback.message}</p>
                  </div>
                  <div className="p-4 bg-white flex justify-center border-t border-gray-100">
                      <button 
                          onClick={() => setFeedback({ ...feedback, isOpen: false })}
                          className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black w-full shadow-lg hover:shadow-xl transition-all"
                      >
                          Intentar de nuevo
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default LoginView;