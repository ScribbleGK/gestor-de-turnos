// src/views/TableView.jsx
import { BackIcon } from '../icons';

function TableView({ onBack, data }) {
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  // Función para generar las cabeceras de los días
  const renderDayHeaders = () => {
    const headers = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date(data.startDate);
      // Ojo: usamos setUTCDate para evitar problemas de zona horaria
      date.setUTCDate(date.getUTCDate() + i);
      headers.push(
        <th key={i} className="p-2 border-l text-center">
          <span className="text-xs font-medium text-gray-500">{days[i % 7]}</span>
          <span className="block text-sm font-semibold text-gray-800">{date.getUTCDate()}</span>
        </th>
      );
    }
    return headers;
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      <header className="flex items-center mb-6">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 mr-4">
          <BackIcon />
        </button>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Tabla de Horarios</h2>
          <p className="text-gray-500">Quincena del {new Date(data.startDate).toLocaleDateString('es-ES')}</p>
        </div>
      </header>

      {/* Contenedor de la tabla */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto"> {/* Permite scroll horizontal en móviles */}
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-2 text-left font-semibold sticky left-0 bg-gray-50 z-10 w-40">Empleado</th>
                {renderDayHeaders()}
                <th className="p-2 border-l font-semibold w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.employees.map((employee) => (
                <tr key={employee.name} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="p-2 font-medium sticky left-0 bg-white hover:bg-gray-50 z-10">{employee.name}</td>
                  {employee.hours.map((hour, index) => (
                    <td key={index} className="p-2 text-center border-l">
                      {hour || <span className="text-gray-400">-</span>}
                    </td>
                  ))}
                  <td className="p-2 text-center border-l font-bold text-indigo-600">{employee.total.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default TableView;