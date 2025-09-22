import { useState, useEffect } from "react";
import { BackIcon } from '../icons';
import { getFortnightStartDate } from '../utils/date';


function TableView({ onBack }) {
  const [timesheetData, setTimesheetData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTimesheet = async () => {
      const startDate = getFortnightStartDate();
      try {
        const response = await fetch(`http://localhost:3001/api/employees/timesheet?startDate=${startDate}`);
        if (!response.ok) {
          throw new Error('Error al obtener los datos del timesheet');
        }
        const data = await response.json();
        setTimesheetData(data);
      } catch (error) {
        console.error(error);
        // Aquí podríamos poner un estado de error
      } finally {
        setIsLoading(false); // Ocurra lo que ocurra, dejamos de cargar
      }
    };

    fetchTimesheet();
  }, []); // El array vacío asegura que esto se ejecute solo una vez

  if (isLoading) {
    return <div>Cargando horarios...</div>;
  }

  if (!timesheetData) {
    return <div>Error al cargar los datos.</div>;
  }

  const { data } = { data: timesheetData }; // Renombramos para reusar el código
  const days = ['L', 'M', 'M', 'J', 'V', 'S'];

  const renderDayHeaders = () => {
    // ... (esta función no cambia)
    const headers = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(data.startDate);
      const offset = i + Math.floor(i / 6);
      date.setUTCDate(date.getUTCDate() + offset);
      const isLastDayOfWeek = (i + 1) % 6 === 0;
      headers.push(
        <th key={i} className={`p-2 border-l border-gray-300 text-center ${isLastDayOfWeek ? 'border-r-2 border-r-gray-300' : ''}`}>
          <span className="text-xs font-medium text-gray-500">{days[i % 6]}</span>
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

      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-200 border-b-2 border-gray-300">
              <tr>
                <th className="p-2 text-left font-semibold text-gray-700 sticky left-0 bg-gray-200 z-10 w-40">Empleado</th>
                {renderDayHeaders()}
                <th className="p-2 border-l border-gray-300 font-semibold text-gray-700 w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.employees.map((employee) => (
                <tr key={employee.name} className="border-b border-gray-200 last:border-b-0">
                  <td className="p-2 font-medium text-gray-800 sticky left-0 bg-gray-100 hover:bg-gray-200 z-10">{employee.name}</td>
                  {employee.hours.map((hour, index) => {
                    const isLastDayOfWeek = (index + 1) % 6 === 0;
                    return (
                      <td key={index} className={`p-2 text-center border-l border-gray-200 ${isLastDayOfWeek ? 'border-r-2 border-r-gray-300' : ''}`}>
                        {hour !== null ? hour.toFixed(1) : <span className="text-gray-400">-</span>}
                      </td>
                    )
                  })}
                  <td className="p-2 text-center border-l border-gray-200 font-bold text-indigo-600">{employee.total.toFixed(1)}</td>
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