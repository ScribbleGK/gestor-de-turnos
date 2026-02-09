import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { getFortnightStart } from '../../utils/date';
import { addDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale'; // Español para la APP
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Modal from '../../components/Modal';
import { DownloadIcon, SaveIcon, BackIcon } from '../../icons';

function TableEditorView({ onBack }) {
    // ESTADO
    const [periods, setPeriods] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [employees, setEmployees] = useState([]);
    const [gridData, setGridData] = useState({}); 
    const [originalData, setOriginalData] = useState({});
    const [loading, setLoading] = useState(false);
    
    // Modos
    const [isEditing, setIsEditing] = useState(false);
    
    // Modal
    const [showModal, setShowModal] = useState(false);
    const [pendingChanges, setPendingChanges] = useState([]);

    // --- UTILIDAD: Formatear Nombre Corto (Para Desktop y PDF) ---
    const formatNameDesktop = (name, surname) => {
        const firstName = name ? name.split(' ')[0] : ''; 
        const firstSurname = surname ? surname.split(' ')[0] : ''; 
        return `${firstName} ${firstSurname}`;
    };

    // --- UTILIDAD: Formatear Nombre Móvil (Para Celulares) ---
    const formatNameMobile = (name, surname) => {
        const firstName = name ? name.split(' ')[0] : ''; 
        const firstSurnameInitial = surname ? surname.charAt(0) : ''; 
        return `${firstName} ${firstSurnameInitial}.`;
    };

    // 1. CARGA INICIAL
    useEffect(() => {
        loadSmartPeriods();
    }, []);

    const loadSmartPeriods = async () => {
        try {
            const { data: datesData } = await supabase
                .from('attendances')
                .select('date')
                .order('date', { ascending: false });

            const uniqueFortnights = new Set();
            
            if (datesData) {
                datesData.forEach(item => {
                    const fStart = getFortnightStart(parseISO(item.date));
                    uniqueFortnights.add(format(fStart, 'yyyy-MM-dd'));
                });
            }

            const current = getFortnightStart(new Date());
            const next = addDays(current, 14);
            
            uniqueFortnights.add(format(current, 'yyyy-MM-dd'));
            uniqueFortnights.add(format(next, 'yyyy-MM-dd'));

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
            
            const currentStr = format(current, 'yyyy-MM-dd');
            if (uniqueFortnights.has(currentStr)) {
                setSelectedPeriod(currentStr);
            } else {
                setSelectedPeriod(sortedPeriods[0].value);
            }

        } catch (error) {
            console.error("Error calculando periodos:", error);
        }
    };

    // 2. CARGAR DATOS
    useEffect(() => {
        if (selectedPeriod) {
            fetchData();
        }
    }, [selectedPeriod]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: emps } = await supabase
                .from('employees')
                .select('id, name, surname, hourly_rate')
                .eq('active', true)
                .order('name'); 
            
            setEmployees(emps || []);

            const startDate = parseISO(selectedPeriod);
            const endDate = addDays(startDate, 14); 
            
            const { data: atts } = await supabase
                .from('attendances')
                .select('*')
                .gte('date', format(startDate, 'yyyy-MM-dd'))
                .lt('date', format(endDate, 'yyyy-MM-dd'));

            const grid = {};
            if (atts) {
                atts.forEach(att => {
                    const key = `${att.employee_id}_${att.date}`;
                    grid[key] = { 
                        duration: att.duration, 
                        id: att.id,
                        rate: att.rate 
                    };
                });
            }
            
            setGridData(grid);
            setOriginalData(JSON.parse(JSON.stringify(grid))); 
        } catch (error) {
            console.error("Error cargando tabla:", error);
        } finally {
            setLoading(false);
        }
    };

    const days = selectedPeriod ? Array.from({ length: 14 }, (_, i) => addDays(parseISO(selectedPeriod), i)) : [];

    // --- CALCULAR TOTALES DIARIOS ---
    const calculateDailyTotals = () => {
        return days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            return employees.reduce((total, emp) => {
                const key = `${emp.id}_${dateStr}`;
                const val = gridData[key]?.duration || 0;
                return total + val;
            }, 0);
        });
    };

    const dailyTotals = calculateDailyTotals();
    const grandTotalPeriod = dailyTotals.reduce((a, b) => a + b, 0);

    // 4. MANEJAR EDICIÓN
    const handleCellChange = (empId, dateStr, value) => {
        const key = `${empId}_${dateStr}`;
        const numValue = value === '' ? 0 : parseFloat(value);
        
        setGridData(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                duration: numValue
            }
        }));
    };

    // 5. PREPARAR GUARDADO
    const handlePreSave = () => {
        const changes = [];
        
        employees.forEach(emp => {
            days.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const key = `${emp.id}_${dateStr}`;
                
                const newVal = gridData[key]?.duration || 0;
                const oldVal = originalData[key]?.duration || 0;

                if (newVal !== oldVal) {
                    changes.push({
                        employeeName: formatNameDesktop(emp.name, emp.surname),
                        dateDisplay: format(day, 'dd/MM'),
                        old: oldVal,
                        new: newVal,
                        empId: emp.id,
                        fullDate: dateStr,
                        attId: gridData[key]?.id,
                        rate: emp.hourly_rate
                    });
                }
            });
        });

        if (changes.length === 0) {
            alert("No hay cambios detectados.");
            setIsEditing(false);
            return;
        }

        setPendingChanges(changes);
        setShowModal(true);
    };

    // 6. GUARDAR CONFIRMADO
    const confirmSave = async () => {
        try {
            const toInsert = [];
            const toUpdate = [];

            pendingChanges.forEach(change => {
                const row = {
                    employee_id: change.empId,
                    date: change.fullDate,
                    duration: change.new,
                    rate: change.rate,
                    clock_text: change.new > 0 ? 'Manual Admin' : '-',
                    description: 'Cleaning Services Zara'
                };

                if (change.attId) {
                    row.id = change.attId;
                    toUpdate.push(row);
                } else {
                    toInsert.push(row);
                }
            });

            if (toUpdate.length > 0) {
                const { error: updateError } = await supabase
                    .from('attendances')
                    .upsert(toUpdate, { onConflict: 'id' });
                if (updateError) throw updateError;
            }

            if (toInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from('attendances')
                    .insert(toInsert);
                if (insertError) throw insertError;
            }

            await supabase.from('system_logs').insert({
                action: 'UPDATE_TIMESHEET',
                details: `Actualizados ${toUpdate.length}, Creados ${toInsert.length}. Periodo: ${selectedPeriod}`,
                admin_name: 'Admin'
            });

            alert("¡Cambios guardados correctamente!");
            setShowModal(false);
            setIsEditing(false);
            fetchData(); 
        } catch (error) {
            console.error("Error crítico guardando:", error);
            alert(`Error al guardar: ${error.message || 'Verifica la consola'}`);
        }
    };

    // 7. DESCARGAR PDF (Filtrando empleados con 0 horas)
    const downloadPDF = () => {
        if (!selectedPeriod || employees.length === 0) {
            alert("No hay datos para generar el PDF.");
            return;
        }

        const doc = new jsPDF('l', 'mm', 'a4'); 
        const endDate = addDays(parseISO(selectedPeriod), 13);
        const title = `ZARA-QUEENSTREET-TIMESHEET-${selectedPeriod}-${format(endDate, 'yyyy-MM-dd')}`;

        doc.setFontSize(18);
        doc.text("ZARA QUEENSTREET CLEANERS - TIMESHEET", 14, 15);
        doc.setFontSize(10);
        doc.text(`Period: ${format(parseISO(selectedPeriod), 'dd/MM/yyyy')} to ${format(endDate, 'dd/MM/yyyy')}`, 14, 22);

        const tableHead = [['Employee', ...days.map(d => format(d, 'dd/MM (EEE)')), 'Total']];
        
        // --- LÓGICA DE FILTRADO ---
        const tableBody = employees.reduce((acc, emp) => {
            let totalRow = 0;
            
            // Calculamos las horas de este empleado
            const rowCells = days.map(d => {
                const key = `${emp.id}_${format(d, 'yyyy-MM-dd')}`;
                const val = gridData[key]?.duration || 0;
                totalRow += val;
                return val > 0 ? val.toFixed(2) : ''; 
            });

            // CONDICIÓN CLAVE: Solo agregamos al PDF si tiene horas
            if (totalRow > 0) {
                const rowData = [
                    formatNameDesktop(emp.name, emp.surname), // Nombre
                    ...rowCells,                              // Días
                    totalRow.toFixed(2)                       // Total Fila
                ];
                acc.push(rowData);
            }
            
            return acc;
        }, []); // Empezamos con array vacío

        // Si después de filtrar no queda nadie, avisamos
        if (tableBody.length === 0) {
            alert("Ningún empleado tiene horas registradas en este periodo.");
            return;
        }

        // Fila de Totales (Esta se queda igual, sumando todo lo visible)
        // Nota: Técnicamente suma TODO el gridData, si quieres que sume solo lo visible sería más complejo, 
        // pero usualmente el total global debe reflejar la realidad contable.
        const totalRowData = [
            'DAILY TOTAL', 
            ...dailyTotals.map(t => t > 0 ? t.toFixed(2) : ''), 
            grandTotalPeriod.toFixed(2)
        ];
        tableBody.push(totalRowData);

        autoTable(doc, {
            head: tableHead,
            body: tableBody,
            startY: 25,
            theme: 'grid',
            headStyles: { fillColor: [40, 40, 40] },
            styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
            columnStyles: { 0: { cellWidth: 35, halign: 'left', fontStyle: 'bold' } },
            didParseCell: function (data) {
                // Negrita para la fila de totales (la última)
                if (data.row.index === tableBody.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [240, 240, 240];
                }
            }
        });

        doc.save(`${title}.pdf`);
    };

    return (
        <div className="w-full max-w-full px-2 sm:px-4 pb-10">
            {/* Header de Controles */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                        <BackIcon />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Editor de Turnos</h2>
                        <select 
                            value={selectedPeriod} 
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-gray-50 border cursor-pointer"
                        >
                            {periods.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto justify-end">
                    {!isEditing ? (
                        <>
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="flex-1 md:flex-none bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 font-bold shadow transition-all hover:-translate-y-0.5"
                            >
                                ✏️ Editar
                            </button>
                            <button 
                                onClick={downloadPDF}
                                className="flex-1 md:flex-none bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 font-bold shadow flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                            >
                                <DownloadIcon className="w-5 h-5"/> PDF
                            </button>
                        </>
                    ) : (
                        <>
                            <button 
                                onClick={() => { setIsEditing(false); setGridData(originalData); }} 
                                className="flex-1 md:flex-none bg-white text-gray-700 border border-gray-300 px-5 py-2.5 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handlePreSave}
                                className="flex-1 md:flex-none bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 font-bold shadow flex items-center justify-center gap-2 animate-pulse"
                            >
                                <SaveIcon className="w-5 h-5"/> Guardar
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* TABLA PRINCIPAL */}
            <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                Empleado
                            </th>
                            {days.map((day, i) => (
                                <th key={i} className={`px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[60px] ${i === 6 ? 'border-r-2 border-r-gray-300' : ''}`}>
                                    <div className="font-bold text-gray-700">{format(day, 'EEE', { locale: es })}</div>
                                    <div className="text-gray-400 text-[10px]">{format(day, 'dd/MM')}</div>
                                </th>
                            ))}
                            <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider sticky right-0 bg-gray-50 z-10 border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="16" className="text-center p-10 text-gray-500">Cargando datos...</td></tr>
                        ) : employees.map((emp) => {
                            let rowTotal = 0;
                            return (
                                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        {/* AQUI ESTA LA MAGIA RESPONSIVE */}
                                        <span className="hidden md:inline">
                                            {formatNameDesktop(emp.name, emp.surname)}
                                        </span>
                                        <span className="inline md:hidden">
                                            {formatNameMobile(emp.name, emp.surname)}
                                        </span>
                                    </td>
                                    {days.map((day, i) => {
                                        const dateStr = format(day, 'yyyy-MM-dd');
                                        const key = `${emp.id}_${dateStr}`;
                                        const val = gridData[key]?.duration || 0;
                                        rowTotal += val;

                                        return (
                                            <td key={i} className={`p-1 text-center ${i === 6 ? 'border-r-2 border-r-gray-300' : ''}`}>
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    step="0.01" // FIX: Permite decimales libres
                                                    disabled={!isEditing}
                                                    value={val === 0 ? '' : val}
                                                    placeholder={isEditing && val === 0 ? '-' : ''}
                                                    onChange={(e) => handleCellChange(emp.id, dateStr, e.target.value)}
                                                    className={`w-full h-8 text-center rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                                                        isEditing 
                                                            ? 'border border-gray-300 bg-white hover:border-indigo-400' 
                                                            : 'bg-transparent border-none text-gray-800 cursor-default'
                                                    } ${val > 0 && !isEditing ? 'font-bold text-indigo-600' : ''}`}
                                                />
                                            </td>
                                        );
                                    })}
                                    <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-gray-800 text-center sticky right-0 bg-white z-10 border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        {rowTotal.toFixed(2)} {/* FIX: 2 Decimales */}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    
                    {/* FOOTER */}
                    <tfoot className="bg-gray-100 font-bold text-gray-800 border-t-2 border-gray-300">
                        <tr>
                            <td className="px-4 py-3 sticky left-0 bg-gray-100 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-xs md:text-sm">
                                TOTAL
                            </td>
                            {dailyTotals.map((total, i) => (
                                <td key={i} className={`text-center py-2 px-1 text-xs ${i === 6 ? 'border-r-2 border-r-gray-300' : ''}`}>
                                    {total > 0 ? total.toFixed(2) : '-'} {/* FIX: 2 Decimales */}
                                </td>
                            ))}
                            <td className="text-center py-2 px-3 sticky right-0 bg-gray-100 z-10 border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] text-indigo-700 text-sm">
                                {grandTotalPeriod.toFixed(2)} {/* FIX: 2 Decimales */}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Modal de Confirmación */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onConfirm={confirmSave}
                title="Confirmar Cambios"
            >
                <div className="max-h-60 overflow-y-auto pr-2">
                    <p className="mb-4 text-sm text-gray-600">Revisa los cambios antes de guardar:</p>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr className="text-left">
                                <th className="p-2 rounded-tl-lg">Empleado</th>
                                <th className="p-2">Fecha</th>
                                <th className="p-2 text-right">Antes</th>
                                <th className="p-2 text-right rounded-tr-lg">Ahora</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingChanges.map((change, idx) => (
                                <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="p-2 text-gray-800 font-medium">{change.employeeName}</td>
                                    <td className="p-2 text-gray-500">{change.dateDisplay}</td>
                                    <td className="p-2 text-right text-red-400 line-through decoration-red-400">{change.old > 0 ? change.old.toFixed(2) : '-'}</td>
                                    <td className="p-2 text-right text-green-600 font-bold">{change.new > 0 ? change.new.toFixed(2) : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Modal>
        </div>
    );
}

export default TableEditorView;