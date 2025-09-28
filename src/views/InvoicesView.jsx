import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { BackIcon, DownloadIcon } from '../icons';
import { getFortnightOptions } from '../utils/date'; // <--- CAMBIO: Usamos esta función ahora
import apiUrl from '../apiConfig';

function InvoicesView({ onBack }) {
  const { currentUser } = useAuth();
  
  // Estados que ya tenías
  const [invoiceData, setInvoiceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // NUEVOS ESTADOS para el selector de quincenas
  const [fortnights, setFortnights] = useState([]);
  const [selectedFortnight, setSelectedFortnight] = useState('');
  
  // 1. Al montar el componente, llenamos las opciones del selector
  useEffect(() => {
    const options = getFortnightOptions();
    setFortnights(options);
    if (options.length > 0) {
      // Por defecto, seleccionamos el período más reciente
      setSelectedFortnight(options[0].value);
    }
  }, []);

  // 2. Tu useEffect original, ahora reacciona a los cambios de 'selectedFortnight'
  useEffect(() => {
    // Evita ejecuciones si no tenemos un período seleccionado o un usuario
    if (!selectedFortnight || !currentUser) return;

    const fetchInvoiceData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${apiUrl}/invoices/preview?employeeId=${currentUser.id}&startDate=${selectedFortnight}`);
        if (!response.ok) throw new Error('Error al obtener la factura');
        const data = await response.json();
        setInvoiceData(data);
        setInvoiceNumber(data.invoiceNumber);
      } catch (error) {
        console.error(error);
        setInvoiceData(null); // Limpiamos datos si hay error
      } finally {
        setIsLoading(false);
      }
    };
    fetchInvoiceData();
  }, [selectedFortnight, currentUser]); // Se ejecuta cuando estos valores cambian

  // Tu función de descarga, ahora usa 'selectedFortnight'
  const handleDownload = async () => {
    if (!invoiceNumber) {
      alert('Por favor, introduce un número de factura.');
      return;
    }
    const employeeId = currentUser.id;
    setIsDownloading(true);
    try {
      const response = await fetch(`${apiUrl}/invoices/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, startDate: selectedFortnight, invoiceNumber }), // <--- CAMBIO: Usa la quincena seleccionada
      });
      if (!response.ok) throw new Error('Error al generar el PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('No se pudo descargar la factura.');
    } finally {
      setIsDownloading(false);
    }
  };

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div>
            <label htmlFor="fortnight-select" className="block text-sm font-medium text-gray-600 mb-1">Quincena</label>
            {/* CAMBIO: Reemplazamos el input por un select */}
            <select
              id="fortnight-select"
              value={selectedFortnight}
              onChange={(e) => setSelectedFortnight(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg bg-white"
            >
              {fortnights.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="invoice-number" className="block text-sm font-medium text-gray-600 mb-1">Número de Factura</label>
            <input
              type="text"
              id="invoice-number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg" />
          </div>
          <div className="self-end">
            <button
              onClick={handleDownload}
              disabled={isDownloading || isLoading || !invoiceData}
              className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center justify-center transition-colors disabled:bg-indigo-300"
            >
              <DownloadIcon />
              <span className="ml-2">{isDownloading ? 'Generando...' : 'Descargar PDF'}</span>
            </button>
          </div>
        </div>
        
        {isLoading && <div className="p-4 text-center">Cargando factura...</div>}
        {!isLoading && !invoiceData && <div className="p-4 text-center">No hay datos de factura para este período.</div>}

        {/* Mantenemos tu tabla y lógica de renderizado originales */}
        {!isLoading && invoiceData && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left font-semibold text-gray-600">Fecha</th><th className="p-3 text-left font-semibold text-gray-600">Descripción</th><th className="p-3 text-left font-semibold text-gray-600">Clocked IN-OUT</th><th className="p-3 text-center font-semibold text-gray-600">Horas</th><th className="p-3 text-right font-semibold text-gray-600">Tarifa</th><th className="p-3 text-right font-semibold text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.shifts.map((shift, index) => (
                    <tr key={index} className="border-b last:border-b-0">
                      <td className="p-3 whitespace-nowrap">{shift.date}</td><td className="p-3">{shift.description}</td><td className="p-3 whitespace-nowrap">{shift.clockText}</td><td className="p-3 text-center">{shift.duration.toFixed(2)}</td><td className="p-3 text-right">${shift.rate.toFixed(2)}</td><td className="p-3 text-right font-medium text-gray-800">${shift.gross.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-bold">
                  <tr><td colSpan="4"></td><td className="p-3 text-right text-lg text-gray-800">TOTAL</td><td className="p-3 text-right text-lg text-gray-800">${invoiceData.total.toFixed(2)}</td></tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default InvoicesView;