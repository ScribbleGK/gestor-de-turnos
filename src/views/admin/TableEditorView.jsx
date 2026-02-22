import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { getFortnightStart } from '../../utils/date';
import { addDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Modal from '../../components/Modal';
import { DownloadIcon, SaveIcon, BackIcon } from '../../icons';

function TableEditorView({ onBack }) {
    const [periods, setPeriods] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [employees, setEmployees] = useState([]);
    const [gridData, setGridData] = useState({}); 
    const [originalData, setOriginalData] = useState({});
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [pendingChanges, setPendingChanges] = useState([]);

    const [pendingInvoices, setPendingInvoices] = useState(0);
    const [employeesToInvoice, setEmployeesToInvoice] = useState([]);
    const [showCloseModal, setShowCloseModal] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [isClosing, setIsClosing] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');

    const [feedback, setFeedback] = useState({ isOpen: false, title: '', message: '', type: 'info' });

    const showFeedback = (title, message, type = 'info') => {
        setFeedback({ isOpen: true, title, message, type });
    };

    const formatNameDesktop = (name, surname) => {
        const firstName = name ? name.split(' ')[0] : ''; 
        const firstSurname = surname ? surname.split(' ')[0] : ''; 
        return `${firstName} ${firstSurname}`;
    };

    const formatNameMobile = (name, surname) => {
        const firstName = name ? name.split(' ')[0] : ''; 
        const firstSurnameInitial = surname ? surname.charAt(0) : ''; 
        return `${firstName} ${firstSurnameInitial}.`;
    };

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

    useEffect(() => {
        if (selectedPeriod) {
            fetchData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPeriod]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: emps } = await supabase
                .from('employees')
                .select('id, name, surname, hourly_rate, last_invoice')
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
                    grid[key] = { duration: att.duration, id: att.id, rate: att.rate };
                });
            }
            
            setGridData(grid);
            setOriginalData(JSON.parse(JSON.stringify(grid))); 

            const { data: logs } = await supabase
                .from('invoices_log')
                .select('employee_id')
                .eq('period_start', selectedPeriod);
            
            const invoicedEmpIds = new Set(logs?.map(l => l.employee_id) || []);

            const pending = [];
            (emps || []).forEach(emp => {
                let empTotalHours = 0;
                let empGrandTotal = 0;

                for (let i = 0; i < 14; i++) {
                    const dStr = format(addDays(startDate, i), 'yyyy-MM-dd');
                    const cell = grid[`${emp.id}_${dStr}`];
                    if (cell?.duration > 0) {
                        empTotalHours += cell.duration;
                        const finalRate = cell.rate || emp.hourly_rate;
                        empGrandTotal += (cell.duration * finalRate);
                    }
                }

                if (empTotalHours > 0 && !invoicedEmpIds.has(emp.id)) {
                    pending.push({ ...emp, calculatedGrandTotal: empGrandTotal });
                }
            });

            setEmployeesToInvoice(pending);
            setPendingInvoices(pending.length);

        } catch (error) {
            console.error("Error cargando tabla:", error);
            showFeedback('Error', 'No se pudieron cargar los datos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const days = selectedPeriod ? Array.from({ length: 14 }, (_, i) => addDays(parseISO(selectedPeriod), i)) : [];

    const getDisplayedEmployees = () => {
        if (loading) return [];

        let sorted = [...employees].sort((a, b) => {
            let aHasHours = false;
            let bHasHours = false;
            
            for (let i = 0; i < 14; i++) {
                const dStr = format(days[i], 'yyyy-MM-dd');
                if (gridData[`${a.id}_${dStr}`]?.duration > 0) aHasHours = true;
                if (gridData[`${b.id}_${dStr}`]?.duration > 0) bHasHours = true;
            }

            if (aHasHours && !bHasHours) return -1;
            if (!aHasHours && bHasHours) return 1;

            const nameA = `${a.name} ${a.surname || ''}`.toLowerCase();
            const nameB = `${b.name} ${b.surname || ''}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });

        if (searchTerm) {
            sorted = sorted.filter(emp => 
                `${emp.name} ${emp.surname || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return sorted;
    };

    const displayedEmployees = getDisplayedEmployees();

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

    const handleCellChange = (empId, dateStr, value) => {
        const key = `${empId}_${dateStr}`;
        const numValue = value === '' ? 0 : parseFloat(value);
        setGridData(prev => ({
            ...prev,
            [key]: { ...prev[key], duration: numValue }
        }));
    };

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
                        old: oldVal, new: newVal, empId: emp.id,
                        fullDate: dateStr, attId: gridData[key]?.id, rate: emp.hourly_rate
                    });
                }
            });
        });

        if (changes.length === 0) {
            showFeedback('Aviso', 'No hay cambios detectados para guardar.', 'info');
            setIsEditing(false);
            return;
        }

        setPendingChanges(changes);
        setShowModal(true);
    };

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

                if (change.attId) { row.id = change.attId; toUpdate.push(row); } 
                else { toInsert.push(row); }
            });

            if (toUpdate.length > 0) {
                const { error } = await supabase.from('attendances').upsert(toUpdate, { onConflict: 'id' });
                if (error) throw error;
            }

            if (toInsert.length > 0) {
                const { error } = await supabase.from('attendances').insert(toInsert);
                if (error) throw error;
            }

            await supabase.from('system_logs').insert({
                action: 'UPDATE_TIMESHEET',
                details: `Se ha actualizado la tabla de asistencias`,
                admin_name: 'Admin'
            });

            showFeedback('Guardado Exitoso', 'Los turnos se han guardado correctamente en la base de datos.', 'success');
            setShowModal(false);
            setIsEditing(false);
            fetchData(); 
        } catch (error) {
            console.error("Error guardando:", error);
            showFeedback('Error Crítico', `No se pudo guardar: ${error.message}`, 'error');
        }
    };

    const executePeriodClose = async () => {
        setIsClosing(true);
        try {
            const logsToInsert = [];
            const updatePromises = [];

            employeesToInvoice.forEach(emp => {
                const currentLast = emp.last_invoice || 0;
                const newInvoiceNum = currentLast + 1;
                
                logsToInsert.push({
                    employee_id: emp.id,
                    period_start: selectedPeriod,
                    invoice_number: newInvoiceNum,
                    grand_total: emp.calculatedGrandTotal
                });

                updatePromises.push(
                    supabase.from('employees').update({ last_invoice: newInvoiceNum }).eq('id', emp.id)
                );
            });

            const { error: logError } = await supabase.from('invoices_log').insert(logsToInsert);
            if (logError) throw logError;

            await Promise.all(updatePromises);

            await supabase.from('system_logs').insert({
                action: 'CLOSE_PERIOD',
                details: `Cierre del periodo ${selectedPeriod}. ${logsToInsert.length} facturas emitidas.`,
                admin_name: 'Admin'
            });

            showFeedback('Facturas Emitidas', `Se han emitido ${logsToInsert.length} facturas oficiales correctamente.`, 'success');
            setShowCloseModal(false);
            fetchData(); 

        } catch (error) {
            console.error("Error en cierre:", error);
            showFeedback('Error de Emisión', `Hubo un error emitiendo facturas: ${error.message}`, 'error');
        } finally {
            setIsClosing(false);
        }
    };

    const downloadPDF = () => {
        if (!selectedPeriod || employees.length === 0 || grandTotalPeriod === 0) {
            showFeedback('Atención', 'No hay turnos registrados en este periodo para generar el PDF.', 'info');
            return;
        }

        const doc = new jsPDF('l', 'mm', 'a4'); 
        const endDate = addDays(parseISO(selectedPeriod), 13);
        const title = `ZARA-TIMESHEET-${selectedPeriod}`;

        doc.setFontSize(18); doc.text("ZARA QUEENSTREET CLEANERS - TIMESHEET", 14, 15);
        doc.setFontSize(10); doc.text(`Period: ${format(parseISO(selectedPeriod), 'dd/MM/yyyy')} to ${format(endDate, 'dd/MM/yyyy')}`, 14, 22);

        const tableHead = [['Employee', ...days.map(d => format(d, 'dd/MM (EEE)')), 'Total']];
        
        const pdfSortedEmployees = [...employees].sort((a,b) => `${a.name}`.localeCompare(`${b.name}`));
        
        const tableBody = pdfSortedEmployees.reduce((acc, emp) => {
            let totalRow = 0;
            const rowCells = days.map(d => {
                const key = `${emp.id}_${format(d, 'yyyy-MM-dd')}`;
                const val = gridData[key]?.duration || 0;
                totalRow += val;
                return val > 0 ? val.toFixed(2) : ''; 
            });

            if (totalRow > 0) {
                acc.push([
                    formatNameDesktop(emp.name, emp.surname),
                    ...rowCells,
                    totalRow.toFixed(2)
                ]);
            }
            return acc;
        }, []);

        tableBody.push(['DAILY TOTAL', ...dailyTotals.map(t => t > 0 ? t.toFixed(2) : ''), grandTotalPeriod.toFixed(2)]);

        autoTable(doc, {
            head: tableHead, body: tableBody, startY: 25, theme: 'grid',
            headStyles: { fillColor: [40, 40, 40] },
            styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
            columnStyles: { 0: { cellWidth: 35, halign: 'left', fontStyle: 'bold' } },
            didParseCell: function (data) {
                if (data.row.index === tableBody.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [240, 240, 240];
                }
            }
        });
        doc.save(`${title}.pdf`);
    };

    return (
        <div className="w-full max-w-full mx-auto px-2 md:px-4 pb-10">
            {/* Header de Controles */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 md:gap-4 w-full lg:w-auto">
                    <button onClick={onBack} className="p-2 md:p-3 hover:bg-gray-100 rounded-full text-gray-600 transition-colors flex-shrink-0">
                        <BackIcon />
                    </button>
                    <div className="flex-1">
                        <h2 className="text-lg md:text-xl font-bold text-gray-800 leading-tight">Editor de Turnos</h2>
                        <select 
                            value={selectedPeriod} 
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="mt-1 block w-full text-sm md:text-base p-2 md:py-2.5 md:pl-3 md:pr-10 border-gray-300 focus:outline-none focus:ring-indigo-500 rounded-lg bg-gray-50 border cursor-pointer font-medium"
                        >
                            {periods.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full lg:w-auto justify-end items-stretch sm:items-center mt-2 lg:mt-0">
                    
                    <div className="relative w-full sm:w-64 lg:w-72">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar empleado..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                        />
                    </div>

                    {!isEditing && (
                        grandTotalPeriod === 0 ? (
                            <div className="bg-gray-100 text-gray-500 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 w-full sm:w-auto">
                                ⏳ Sin turnos
                            </div>
                        ) : pendingInvoices > 0 ? (
                            <button 
                                onClick={() => setShowCloseModal(true)}
                                className="bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm hover:bg-orange-600 font-bold shadow transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                            >
                                🔒 Emitir ({pendingInvoices})
                            </button>
                        ) : (
                            <div className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 w-full sm:w-auto">
                                ✅ Emitidas
                            </div>
                        )
                    )}

                    {!isEditing ? (
                        <>
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm hover:bg-indigo-700 font-bold shadow transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                            >
                                ✏️ Editar
                            </button>
                            <button 
                                onClick={downloadPDF}
                                className="bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm hover:bg-gray-900 font-bold shadow flex items-center justify-center gap-2 w-full sm:w-auto"
                            >
                                <DownloadIcon className="w-4 h-4"/> PDF
                            </button>
                        </>
                    ) : (
                        <>
                            <button 
                                onClick={() => { setIsEditing(false); setGridData(originalData); }} 
                                className="bg-white text-gray-700 border border-gray-300 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50 font-medium w-full sm:w-auto"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handlePreSave}
                                className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm hover:bg-indigo-700 font-bold shadow flex items-center justify-center gap-2 w-full sm:w-auto"
                            >
                                <SaveIcon className="w-4 h-4"/> Guardar
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* TABLA UNIFICADA MÓVIL/PC (Desplazamiento Horizontal Robusto) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative flex flex-col">
                
                {/* Indicador visual de deslizamiento (Solo visible en móviles) */}
                <div className="md:hidden bg-indigo-50 text-indigo-700 text-xs font-bold text-center py-2 flex items-center justify-center gap-2 border-b border-indigo-100">
                    <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                    Desliza la tabla hacia los lados
                </div>

                {/* Contenedor con Scroll */}
                <div className="overflow-x-auto w-full custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                    
                    {/* min-w-max evita el aplastamiento de las columnas */}
                    <table className="min-w-max w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {/* Columna Fija de Empleado */}
                                <th className="px-3 md:px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider sticky left-0 z-30 bg-gray-50 border-r-2 border-gray-200 shadow-[4px_0_10px_-3px_rgba(0,0,0,0.15)] w-[120px] md:w-[160px]">
                                    Empleado
                                </th>
                                
                                {/* Columnas de Días */}
                                {days.map((day, i) => (
                                    <th key={i} className={`px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[80px] md:w-[90px] ${i === 6 ? 'border-r-2 border-gray-300' : ''}`}>
                                        <div className="font-bold text-gray-700">{format(day, 'EEE', { locale: es })}</div>
                                        <div className="text-gray-400 text-[10px]">{format(day, 'dd/MM')}</div>
                                    </th>
                                ))}
                                
                                {/* Columna Fija de Total */}
                                <th className="px-3 py-4 text-center text-xs font-bold text-indigo-700 uppercase tracking-wider sticky right-0 z-30 bg-gray-50 border-l-2 border-gray-200 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.15)] w-[80px]">
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="16" className="text-center p-10 text-gray-500">Cargando datos...</td></tr>
                            ) : displayedEmployees.length === 0 ? (
                                <tr><td colSpan="16" className="text-center p-10 text-gray-500 font-medium">No se encontraron empleados.</td></tr>
                            ) : displayedEmployees.map((emp) => {
                                let rowTotal = 0;
                                return (
                                    <tr key={emp.id} className="hover:bg-indigo-50/50 transition-colors group">
                                        
                                        {/* Celda Fija de Empleado */}
                                        <td className="px-3 md:px-4 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900 sticky left-0 z-20 bg-white group-hover:bg-indigo-50 transition-colors border-r-2 border-gray-100 shadow-[4px_0_10px_-3px_rgba(0,0,0,0.1)] w-[120px] md:w-[160px] overflow-hidden text-ellipsis">
                                            <span className="hidden sm:inline">{formatNameDesktop(emp.name, emp.surname)}</span>
                                            <span className="inline sm:hidden">{formatNameMobile(emp.name, emp.surname)}</span>
                                        </td>
                                        
                                        {/* Celdas de Días (Inputs) */}
                                        {days.map((day, i) => {
                                            const dateStr = format(day, 'yyyy-MM-dd');
                                            const key = `${emp.id}_${dateStr}`;
                                            const val = gridData[key]?.duration || 0;
                                            rowTotal += val;

                                            return (
                                                <td key={i} className={`p-1.5 text-center ${i === 6 ? 'border-r-2 border-gray-300' : ''}`}>
                                                    <input 
                                                        type="number" min="0" step="0.01" disabled={!isEditing}
                                                        value={val === 0 ? '' : val}
                                                        placeholder={isEditing && val === 0 ? '-' : ''}
                                                        onChange={(e) => handleCellChange(emp.id, dateStr, e.target.value)}
                                                        className={`w-full h-11 md:h-12 text-center rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm md:text-base ${
                                                            isEditing ? 'border border-gray-300 bg-white hover:border-indigo-400 shadow-sm' : 'bg-transparent border-none text-gray-800 cursor-default'
                                                        } ${val > 0 && !isEditing ? 'font-black text-indigo-600 bg-indigo-50/30' : ''}`}
                                                    />
                                                </td>
                                            );
                                        })}
                                        
                                        {/* Celda Fija de Total Fila */}
                                        <td className="px-3 py-3 md:py-4 whitespace-nowrap text-sm font-bold text-gray-800 text-center sticky right-0 z-20 bg-gray-50 group-hover:bg-indigo-50/80 transition-colors border-l-2 border-gray-100 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.1)] w-[80px]">
                                            {rowTotal.toFixed(2)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-gray-100 font-bold text-gray-800 border-t-4 border-gray-300">
                            <tr>
                                {/* Celda Fija de Empleado (Footer) */}
                                <td className="px-3 md:px-4 py-4 sticky left-0 z-30 bg-gray-200 border-r-2 border-gray-300 shadow-[4px_0_10px_-3px_rgba(0,0,0,0.15)] text-xs md:text-sm">
                                    TOTALES
                                </td>
                                
                                {/* Celdas de Días (Footer) */}
                                {dailyTotals.map((total, i) => (
                                    <td key={i} className={`text-center py-4 px-1 text-xs md:text-sm text-gray-700 ${i === 6 ? 'border-r-2 border-gray-300' : ''}`}>
                                        {total > 0 ? total.toFixed(2) : '-'}
                                    </td>
                                ))}
                                
                                {/* Celda Fija de Gran Total (Footer) */}
                                <td className="text-center py-4 px-3 sticky right-0 z-30 bg-indigo-100 border-l-2 border-indigo-200 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.15)] text-indigo-800 text-sm md:text-base font-black w-[80px]">
                                    {grandTotalPeriod.toFixed(2)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* MODALES */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} onConfirm={confirmSave} title="Confirmar Cambios">
                <div className="max-h-60 overflow-y-auto pr-2">
                    <p className="mb-4 text-sm text-gray-600">Revisa los cambios antes de guardar:</p>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr className="text-left"><th className="p-2">Empleado</th><th className="p-2">Fecha</th><th className="p-2 text-right">Antes</th><th className="p-2 text-right">Ahora</th></tr>
                        </thead>
                        <tbody>
                            {pendingChanges.map((c, i) => (
                                <tr key={i} className="border-b hover:bg-gray-50">
                                    <td className="p-2">{c.employeeName}</td><td className="p-2 text-gray-500">{c.dateDisplay}</td>
                                    <td className="p-2 text-right text-red-400 line-through">{c.old > 0 ? c.old.toFixed(2) : '-'}</td>
                                    <td className="p-2 text-right text-green-600 font-bold">{c.new > 0 ? c.new.toFixed(2) : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Modal>

            <Modal 
                isOpen={showCloseModal} 
                onClose={() => setShowCloseModal(false)} 
                onConfirm={executePeriodClose} 
                title="🔒 Emitir Facturas Oficiales"
                isDestructive={false}
            >
                <div className="p-2">
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg mb-4">
                        <p className="text-orange-800 font-bold text-sm mb-1">ATENCIÓN: Acción Definitiva</p>
                        <p className="text-orange-700 text-xs">
                            Al confirmar, se emitirán y bloquearán los números de factura para los empleados seleccionados. Los empleados con 0 horas serán ignorados.
                        </p>
                    </div>

                    <p className="text-sm text-gray-700 font-bold mb-2">Se emitirán facturas para {pendingInvoices} empleados:</p>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
                        <ul className="divide-y divide-gray-100">
                            {employeesToInvoice.map(emp => (
                                <li key={emp.id} className="p-3 flex justify-between items-center bg-gray-50 hover:bg-gray-100">
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{emp.name} {emp.surname}</p>
                                        <p className="text-xs text-gray-500">Factura N° <span className="font-bold text-indigo-600">{emp.last_invoice + 1}</span></p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-700">${emp.calculatedGrandTotal.toFixed(2)}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </Modal>

            {feedback.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all animate-fade-in-up">
                        <div className={`p-6 text-center ${feedback.type === 'error' ? 'bg-red-50' : feedback.type === 'success' ? 'bg-green-50' : 'bg-blue-50'}`}>
                            <div className={`mx-auto flex items-center justify-center h-14 w-14 rounded-full mb-4 shadow-sm ${feedback.type === 'error' ? 'bg-red-100 text-red-600' : feedback.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                <span className="text-2xl">{feedback.type === 'error' ? '❌' : feedback.type === 'success' ? '✅' : 'ℹ️'}</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{feedback.title}</h3>
                            <p className="text-sm text-gray-600">{feedback.message}</p>
                        </div>
                        <div className="p-4 bg-white flex justify-center border-t border-gray-100">
                            <button 
                                onClick={() => setFeedback({ ...feedback, isOpen: false })}
                                className="px-6 py-2.5 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-900 w-full shadow-md transition-colors"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TableEditorView;