import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { getFortnightStart } from '../utils/date';
import { addDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale'; 
import { BackIcon } from '../icons';

function TableView({ onBack }) {
    const { currentUser } = useAuth();
    const [periods, setPeriods] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [gridData, setGridData] = useState({});
    const [loading, setLoading] = useState(false);
    const [totals, setTotals] = useState({ hours: 0, money: 0 });

    // 1. CARGAR PERIODOS AL INICIAR
    useEffect(() => {
        const loadPeriods = async () => {
            try {
                const { data: datesData } = await supabase
                    .from('attendances')
                    .select('date')
                    .eq('employee_id', currentUser.id)
                    .order('date', { ascending: false });

                const uniqueFortnights = new Set();
                if (datesData) {
                    datesData.forEach(item => {
                        const fStart = getFortnightStart(parseISO(item.date));
                        uniqueFortnights.add(format(fStart, 'yyyy-MM-dd'));
                    });
                }

                const current = getFortnightStart(new Date());
                uniqueFortnights.add(format(current, 'yyyy-MM-dd'));

                const sortedPeriods = Array.from(uniqueFortnights)
                    .sort((a, b) => new Date(b) - new Date(a))
                    .map(dateStr => {
                        const start = parseISO(dateStr);
                        const end = addDays(start, 13);
                        return {
                            value: dateStr,
                            label: `${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')}`
                        };
                    });

                setPeriods(sortedPeriods);
                if (sortedPeriods.length > 0) {
                    setSelectedPeriod(sortedPeriods[0].value);
                }
            } catch (error) {
                console.error("Error calculando periodos:", error);
            }
        };

        if (currentUser) {
            loadPeriods();
        }
    }, [currentUser]);

    // 2. BUSCAR LOS TURNOS DE LA QUINCENA SELECCIONADA
    useEffect(() => {
        const fetchMyAttendances = async () => {
            if (!selectedPeriod || !currentUser) return;
            
            setLoading(true);
            try {
                const startDate = parseISO(selectedPeriod);
                const endDate = addDays(startDate, 14); 

                const { data: atts, error } = await supabase
                    .from('attendances')
                    .select('*')
                    .eq('employee_id', currentUser.id)
                    .gte('date', format(startDate, 'yyyy-MM-dd'))
                    .lt('date', format(endDate, 'yyyy-MM-dd'));

                if (error) throw error;

                const grid = {};
                let totalH = 0;
                let totalM = 0;

                if (atts) {
                    atts.forEach(att => {
                        const dateStr = att.date;
                        grid[dateStr] = att.duration;
                        
                        totalH += Number(att.duration);
                        const rate = att.rate || currentUser.hourly_rate;
                        totalM += (Number(att.duration) * rate);
                    });
                }
                
                setGridData(grid);
                setTotals({ hours: totalH, money: totalM });

            } catch (error) {
                console.error("Error cargando turnos:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMyAttendances();
    }, [selectedPeriod, currentUser]);

    const days = selectedPeriod ? Array.from({ length: 14 }, (_, i) => addDays(parseISO(selectedPeriod), i)) : [];

    return (
        <div className="w-full max-w-3xl mx-auto px-4 pb-10 animate-fade-in-up">
            
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-indigo-600 transition-colors">
                        <BackIcon />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Mis Horarios</h2>
                        <p className="text-gray-500 font-medium mt-1">Consulta tus horas registradas</p>
                    </div>
                </div>

                <div className="w-full md:w-auto">
                    <select 
                        value={selectedPeriod} 
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="w-full md:w-64 p-3 border-2 border-gray-200 rounded-xl text-gray-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all cursor-pointer bg-gray-50 hover:bg-white shadow-sm"
                    >
                        {periods.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tarjetas de Resumen Rápido (El diseño que te gustó, intacto y centrado) */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 text-center transform transition-transform hover:-translate-y-1">
                    <p className="text-gray-400 font-bold text-xs sm:text-sm uppercase tracking-wider mb-2">Total Horas</p>
                    <p className="text-3xl sm:text-4xl font-black text-indigo-600">
                        {loading ? '...' : totals.hours.toFixed(2)} <span className="text-lg text-indigo-300 font-bold">h</span>
                    </p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 text-center transform transition-transform hover:-translate-y-1">
                    <p className="text-gray-400 font-bold text-xs sm:text-sm uppercase tracking-wider mb-2">Generado Est.</p>
                    <p className="text-3xl sm:text-4xl font-black text-emerald-500">
                        {loading ? '...' : `$${totals.money.toFixed(2)}`}
                    </p>
                </div>
            </div>

            {/* Detalle Diario (Nuevo Diseño Ultra-Limpio) */}
            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 text-lg">Detalle por Día</h3>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 py-1 bg-white rounded-full border border-gray-200 shadow-sm">
                        Quincena Actual
                    </span>
                </div>
                
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500 font-medium animate-pulse">Cargando turnos...</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-50">
                        {days.map((day, i) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const hoursWorked = gridData[dateStr] || 0;
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                            const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

                            return (
                                <li key={i} className={`flex justify-between items-center p-4 sm:px-6 hover:bg-indigo-50/30 transition-colors ${isToday ? 'bg-indigo-50/10' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        {/* Indicador visual lateral */}
                                        <div className={`w-1.5 h-10 rounded-full ${hoursWorked > 0 ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'bg-gray-200'}`}></div>
                                        
                                        <div>
                                            <p className="font-bold text-gray-800 text-base sm:text-lg capitalize flex items-center gap-2">
                                                {format(day, 'EEEE', { locale: es })}
                                                {isToday && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Hoy</span>}
                                            </p>
                                            <p className={`text-sm ${isWeekend && hoursWorked === 0 ? 'text-gray-400' : 'text-gray-500 font-medium'}`}>
                                                {format(day, 'dd MMM', { locale: es })}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="text-right">
                                        {hoursWorked > 0 ? (
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xl font-black text-indigo-600">{hoursWorked.toFixed(2)}</span>
                                                <span className="text-sm font-bold text-indigo-300">hrs</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-bold text-gray-400 bg-gray-100/80 px-3 py-1.5 rounded-lg uppercase tracking-wider">
                                                Libre
                                            </span>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

        </div>
    );
}

export default TableView;