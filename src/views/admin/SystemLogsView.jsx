import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { format, parseISO } from 'date-fns';
import { BackIcon } from '../../icons';

function SystemLogsView({ onBack }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // Traemos los últimos 200 registros para no saturar la memoria
            const { data, error } = await supabase
                .from('system_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200);

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error("Error cargando logs:", error);
            alert("Error al cargar el historial del sistema.");
        } finally {
            setLoading(false);
        }
    };

    // Función para darle un color y nombre bonito a cada acción
    const getActionBadge = (action) => {
        switch (action) {
            case 'UPDATE_TIMESHEET':
                return { text: 'Edición de Turnos', classes: 'bg-blue-100 text-blue-800 border-blue-200' };
            case 'CLOSE_PERIOD':
                return { text: 'Cierre de Periodo', classes: 'bg-purple-100 text-purple-800 border-purple-200' };
            case 'CREATE_EMPLOYEE':
                return { text: 'Alta Empleado', classes: 'bg-green-100 text-green-800 border-green-200' };
            case 'UPDATE_EMPLOYEE':
                return { text: 'Edición Empleado', classes: 'bg-orange-100 text-orange-800 border-orange-200' };
            case 'UPDATE_INVOICE_CONFIG':
                return { text: 'Configuración', classes: 'bg-gray-100 text-gray-800 border-gray-300' };
            case 'DOWNLOAD_INVOICE': // <--- Preparado para cuando los empleados descarguen
                return { text: 'Descarga Factura', classes: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
            default:
                return { text: action, classes: 'bg-gray-100 text-gray-600 border-gray-200' };
        }
    };

    // Filtrar los logs en pantalla
    const filteredLogs = logs.filter(log => {
        if (filter === 'ALL') return true;
        if (filter === 'USERS' && log.action.includes('EMPLOYEE')) return true;
        if (filter === 'INVOICES' && (log.action === 'CLOSE_PERIOD' || log.action === 'DOWNLOAD_INVOICE')) return true;
        if (filter === 'TIMESHEETS' && log.action === 'UPDATE_TIMESHEET') return true;
        return false;
    });

    return (
        <div className="w-full max-w-full mx-auto px-4 pb-10">
            {/* Header de Controles */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                        <BackIcon />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Historial de Auditoría</h2>
                        <p className="text-gray-500 text-sm">Registro inmutable de actividades del sistema</p>
                    </div>
                </div>
                
                {/* Filtros Rápidos */}
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${filter === 'ALL' ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        Todos
                    </button>
                    <button onClick={() => setFilter('TIMESHEETS')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${filter === 'TIMESHEETS' ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        Turnos
                    </button>
                    <button onClick={() => setFilter('INVOICES')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${filter === 'INVOICES' ? 'bg-purple-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        Facturas
                    </button>
                    <button onClick={() => setFilter('USERS')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${filter === 'USERS' ? 'bg-green-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        Personal
                    </button>
                    <button onClick={fetchLogs} className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600" title="Actualizar">
                        🔄
                    </button>
                </div>
            </div>

            {/* TABLA DE LOGS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-40">Fecha y Hora</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-48">Acción</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Detalles</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Usuario</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-10 text-center text-gray-500 font-medium animate-pulse">
                                        Cargando historial...
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-10 text-center text-gray-500">
                                        No se encontraron registros para este filtro.
                                    </td>
                                </tr>
                            ) : filteredLogs.map((log) => {
                                const badge = getActionBadge(log.action);
                                return (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="font-medium text-gray-800">{format(parseISO(log.created_at), 'dd/MM/yyyy')}</div>
                                            <div className="text-xs mt-0.5">{format(parseISO(log.created_at), 'hh:mm a')}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${badge.classes}`}>
                                                {badge.text}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            {log.details}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                                            {log.admin_name}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default SystemLogsView;