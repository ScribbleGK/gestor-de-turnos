import { useState, useEffect } from 'react';
import { BackIcon, DownloadIcon } from '../icons';

// Función de ayuda para obtener el inicio de la quincena actual o pasada
const getFortnightStartDate = () => {
  // Por ahora, para que coincida con nuestros datos de prueba, usaremos una fecha fija.
  // Más adelante, podemos hacer esto dinámico.
  return '2025-09-15'; 
};

function InvoicesView({ onBack }) {
  const [invoiceData, setInvoiceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      const startDate = getFortnightStartDate();
      // NOTA: Aún no tenemos un sistema de login, así que pedimos la factura
      // para el empleado con id=1. Esto lo cambiaremos en el futuro.
      const employeeId = 1; 

      try {
        const response = await fetch(`http://localhost:3001/api/invoices/preview?employeeId=${employeeId}&startDate=${startDate}`);
        if (!response.ok) throw new Error('Error al obtener la factura');
        const data = await response.json();
        setInvoiceData(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoiceData();
  }, []);

  if (isLoading) return <div>Cargando factura...</div>;
  if (!invoiceData) return <div>Error al cargar la factura.</div>;

  const { data } = { data: invoiceData }; // Renombramos para reusar el JSX

  return (
    <div className="w-full max-w-4xl mx-auto">
      <header className="flex items-center mb-6">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 mr-4">
          <BackIcon />
        </button>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Mis Facturas</h2>
          <p className="text-gray-500">Consulta y descarga tus facturas</p>
        </div>
      </header>

      <main className="bg-white p-6 rounded-2xl shadow-md">
        {/* ... (El resto del JSX de la factura es el mismo de antes, lo pegamos aquí) ... */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div>
            <label htmlFor="invoice-date" className="block text-sm font-medium text-gray-600 mb-1">Quincena</label>
            <input type="text" id="invoice-date" readOnly value={data.terms} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100" />
          </div>
          <div>
            <label htmlFor="invoice-number" className="block text-sm font-medium text-gray-600 mb-1">Número de Factura</label>
            <input type="number" id="invoice-number" defaultValue={data.invoiceNumber} className="w-full p-2 border border-gray-300 rounded-lg" />
          </div>
          <div className="self-end">
            <button className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center justify-center transition-colors">
              <DownloadIcon />
              <span className="ml-2">Descargar PDF</span>
            </button>
          </div>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left font-semibold text-gray-600">Fecha</th>
                  <th className="p-3 text-left font-semibold text-gray-600">Descripción</th>
                  <th className="p-3 text-center font-semibold text-gray-600">Horas</th>
                  <th className="p-3 text-right font-semibold text-gray-600">Tarifa</th>
                  <th className="p-3 text-right font-semibold text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.shifts.map((shift, index) => (
                  <tr key={index} className="border-b last:border-b-0">
                    <td className="p-3 whitespace-nowrap">{shift.date}</td>
                    <td className="p-3">{shift.description}</td>
                    <td className="p-3 text-center">{shift.duration.toFixed(2)}</td>
                    <td className="p-3 text-right">${shift.rate.toFixed(2)}</td>
                    <td className="p-3 text-right font-medium text-gray-800">${shift.gross.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold">
                <tr><td colSpan="3"></td><td className="p-3 text-right text-lg text-gray-800">TOTAL</td><td className="p-3 text-right text-lg text-indigo-600">${data.total.toFixed(2)}</td></tr>
              </tfoot>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default InvoicesView;