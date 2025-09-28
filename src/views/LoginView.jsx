import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import PinPad from '../components/PinPad';
import apiUrl from '../apiConfig';

const SelectNameView = ({ employees, onSelect, onNext }) => (
  <form onSubmit={onNext} className="space-y-6">
     <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Hola</h1>
     <p className="text-center text-gray-500 mb-6">Por favor, selecciona tu nombre para continuar.</p>
    <select
      onChange={(e) => onSelect(e.target.value)}
      defaultValue=""
      className="w-full p-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <option value="" disabled>Selecciona tu nombre...</option>
      {employees.map(employee =>
        employee.active = 1 ? (
          <option key={employee.id} value={employee.id}>
            {employee.surname}, {employee.name}
          </option>
        ) : null
      )}
    </select>
    <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors text-lg">
      Siguiente
    </button>
  </form>
);

const PinView = ({ title, subTitle, onSubmit, pin, setPin, error, buttonText }) => (
    <div className="transition-opacity duration-300 ease-in-out">
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
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { login } = useAuth();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch(`${apiUrl}/auth/active-employees`);
        if (!response.ok) throw new Error('Error de red');
        const data = await response.json();
        setEmployees(data);
      } catch (err) {
        setError("No se pudieron cargar los empleados.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmployees();
  }, []);
  
  const handleSelectName = (employeeId) => {
    const employee = employees.find(e => e.id == employeeId);
    setSelectedEmployee(employee);
  };
  
  const handleNextFromSelect = (e) => {
      e.preventDefault();
      if (!selectedEmployee) {
          alert('Por favor, selecciona tu nombre.');
          return;
      }
      setError('');
      if (selectedEmployee.has_pin) setView('enter_pin');
      else setView('set_pin_step1');
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 4) {
        setError('El PIN debe tener 4 dígitos.');
        return;
    }
    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedEmployee.id, pin }),
      });
      if (!response.ok) throw new Error('PIN incorrecto');
      login(selectedEmployee);
    } catch (err) {
      setError('PIN incorrecto. Inténtalo de nuevo.');
      setPin('');
    }
  };
  
  const handleSetPinSubmit = async () => {
    if (pin.length !== 4) {
      setError('El PIN debe tener 4 dígitos.');
      return;
    }
    if (pin !== confirmPin) {
      setError('Los PINs no coinciden.');
      return;
    }
    try {
      await fetch(`${apiUrl}/auth/set-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedEmployee.id, pin }),
      });
      login(selectedEmployee);
    } catch (err) {
      setError('Error al guardar el PIN.');
    }
  };
  
  const renderContent = () => {
      switch(view) {
          case 'enter_pin':
              return <PinView title={`Hola, ${selectedEmployee.name}`} subTitle="Introduce tu PIN" onSubmit={handlePinSubmit} pin={pin} setPin={setPin} error={error} buttonText="Entrar" />;
          case 'set_pin_step1':
              return <PinView title="Crea tu PIN" subTitle="Introduce un PIN de 4 dígitos" onSubmit={() => { setView('set_pin_step2'); setError(''); }} pin={pin} setPin={setPin} error={error} buttonText="Siguiente" />;
          case 'set_pin_step2':
              return <PinView title="Confirma tu PIN" subTitle="Vuelve a introducir tu PIN" onSubmit={handleSetPinSubmit} pin={confirmPin} setPin={setConfirmPin} error={error} buttonText="Guardar y Entrar" />;
          case 'select_name':
          default:
              return <SelectNameView employees={employees} onSelect={handleSelectName} onNext={handleNextFromSelect} />;
      }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-lg">
        {isLoading ? <p>Cargando...</p> : renderContent()}
      </div>
    </div>
  );
}
export default LoginView;
