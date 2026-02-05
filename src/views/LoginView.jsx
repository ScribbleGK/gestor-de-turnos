import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import PinPad from '../components/PinPad';
import { supabase } from '../supabaseClient';

// --- Selector con Búsqueda (Combobox) ---
const SearchableEmployeeSelect = ({ employees, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const wrapperRef = useRef(null);

  // Filtrar empleados según lo que escribes
  const filteredEmployees = employees.filter(emp => 
    `${emp.name} ${emp.surname}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cerrar el menú si haces clic fuera
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
    setSearchTerm(''); // Limpiar búsqueda interna
    setIsOpen(false);
    onSelect(employee); // Comunicar al padre
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          className="w-full p-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Escribe para buscar..."
          value={isOpen ? searchTerm : selectedName}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            if(e.target.value === '') setSelectedName(''); // Reset si borra todo
          }}
          onClick={() => setIsOpen(true)} // Abrir al hacer clic
        />
        {/* Flechita visual */}
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>

      {/* Lista desplegable de resultados */}
      {isOpen && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((emp) => (
              <li
                key={emp.id}
                className="px-4 py-3 hover:bg-indigo-50 cursor-pointer text-gray-800 border-b border-gray-100 last:border-0"
                onClick={() => handleSelect(emp)}
              >
                <span className="font-bold">{emp.name}</span> {emp.surname}  
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-gray-500">No se encontraron empleados.</li>
          )}
        </ul>
      )}
    </div>
  );
};

// --- VISTA 1: Selección de Nombre ---
const SelectNameView = ({ employees, onSelectEmployee, onNext, selectedEmployee }) => (
  <div className="space-y-6">
     <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Bienvenido</h1>
     <p className="text-center text-gray-500 mb-4">Selecciona tu usuario para acceder.</p>
    
    {/* Usamos el nuevo componente de búsqueda */}
    <SearchableEmployeeSelect employees={employees} onSelect={onSelectEmployee} />

    <button 
      onClick={onNext}
      disabled={!selectedEmployee} // Deshabilitado si no hay nadie seleccionado
      className={`w-full font-bold py-3 px-4 rounded-lg transition-colors text-lg ${
        selectedEmployee 
          ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
      }`}
    >
      {selectedEmployee?.role === 'admin' ? 'Siguiente (Requiere PIN)' : 'Entrar'}
    </button>
  </div>
);

// --- VISTA 2: PIN (Solo Admins) ---
const PinView = ({ title, subTitle, onSubmit, pin, setPin, error, buttonText, onBack }) => (
    <div className="transition-opacity duration-300 ease-in-out">
        <div className="flex justify-start mb-2">
            <button onClick={onBack} className="text-sm text-gray-500 hover:text-indigo-600">← Volver</button>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-1">{title}</h2>
        <p className="text-center text-gray-500 mb-6">{subTitle}</p>
        <PinPad pin={pin} setPin={setPin} />
        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        <button onClick={onSubmit} className="w-full mt-6 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors text-lg">
            {buttonText}
        </button>
    </div>
);

function LoginView() {
  const [view, setView] = useState('select_name');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { login } = useAuth();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('id, name, surname, role') // Traemos el rol para saber si pedir PIN
          .eq('active', true)
          .order('surname');
        
        if (error) throw error;
        setEmployees(data);
      } catch (err) {
        console.error("Error cargando empleados:", err);
        setError("No se pudieron cargar los empleados.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const handleNext = async () => {
      if (!selectedEmployee) return;

      // --- LÓGICA CLAVE DE TU PETICIÓN ---
      if (selectedEmployee.role === 'admin') {
          // Si es Admin, vamos a la pantalla de PIN
          setError('');
          setPin('');
          setView('enter_pin');
      } else {
          // Si es Worker, login DIRECTO (sin PIN)
          login(selectedEmployee);
      }
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 4) {
        setError('El PIN debe tener 4 dígitos.');
        return;
    }
    
    try {
        // Verificamos PIN contra Supabase (Solo para Admins)
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('id', selectedEmployee.id)
            .eq('pin', pin)
            .single();

        if (error || !data) {
            throw new Error('PIN incorrecto');
        }

        login(data);
    } catch (err) {
        console.error(err);
        setError('PIN incorrecto. Acceso denegado.');
        setPin('');
    }
  };

  const renderContent = () => {
      switch(view) {
          case 'enter_pin':
              return (
                <PinView 
                    title={`Hola, ${selectedEmployee.name}`} 
                    subTitle="Acceso de Administrador" 
                    onSubmit={handlePinSubmit} 
                    pin={pin} 
                    setPin={setPin} 
                    error={error} 
                    buttonText="Verificar Acceso"
                    onBack={() => setView('select_name')} 
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-lg relative">
        {isLoading ? <div className="text-center p-4">Cargando directorio...</div> : renderContent()}
      </div>
    </div>
  );
}
export default LoginView;