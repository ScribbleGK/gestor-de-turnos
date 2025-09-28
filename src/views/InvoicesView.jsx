import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth'; 
import { BackIcon, DownloadIcon } from '../icons';
import { getFortnightStartDate } from '../utils/date';

function InvoicesView({ onBack }) {
  const { currentUser } = useAuth(); 

  const [invoiceData, setInvoiceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  // NUEVO ESTADO para el número de factura editable
  const [invoiceNumber, setInvoiceNumber] = useState('');

  useEffect(() => {
    const fetchInvoiceData = async () => {
      const startDate = getFortnightStartDate();
      const employeeId = currentUser.id;
      setIsLoading(true);
      try {
        const response = await fetch(`http://localhost:3001/api/invoices/preview?employeeId=${employeeId}&startDate=${startDate}`);
        if (!response.ok) throw new Error('Error al obtener la factura');
        const data = await response.json();
        setInvoiceData(data);
        // Establecemos el número de factura inicial que viene del preview
        setInvoiceNumber(data.invoiceNumber);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInvoiceData();
  }, []);

  const handleDownload = async () => {
    if (!invoiceNumber) {
        alert('Por favor, introduce un número de factura.');
        return;
    }
    const startDate = getFortnightStartDate();
    const employeeId = currentUser.id;
    setIsDownloading(true);
    try {
      const response = await fetch('http://localhost:3001/api/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // AHORA ENVIAMOS EL NÚMERO DE FACTURA DEL ESTADO
        body: JSON.stringify({ employeeId, startDate, invoiceNumber }),
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
  
  if (isLoading) return <div className="p-4">Cargando factura...</div>;
  if (!invoiceData) return <div className="p-4">Error al cargar la factura.</div>;

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
            <label htmlFor="invoice-date" className="block text-sm font-medium text-gray-600 mb-1">Quincena</label>
            <input type="text" id="invoice-date" readOnly value={invoiceData.terms} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100" />
          </div>
          <div>
            <label htmlFor="invoice-number" className="block text-sm font-medium text-gray-600 mb-1">Número de Factura</label>
            {/* CAMBIO: El input ahora es editable y está controlado por el estado */}
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
              disabled={isDownloading}
              className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center justify-center transition-colors disabled:bg-indigo-300"
            >
              <DownloadIcon />
              <span className="ml-2">{isDownloading ? 'Generando...' : 'Descargar PDF'}</span>
            </button>
          </div>
        </div>
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
                <tr><td colSpan="4"></td><td className="p-3 text-right text-gray-600">Subtotal</td><td className="p-3 text-right">${invoiceData.subtotal.toFixed(2)}</td></tr>
                <tr><td colSpan="4"></td><td className="p-3 text-right text-lg text-gray-800">TOTAL</td><td className="p-3 text-right text-lg text-indigo-600">${invoiceData.total.toFixed(2)}</td></tr>
              </tfoot>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default InvoicesView;
