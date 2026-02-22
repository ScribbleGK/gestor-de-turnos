import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { getFortnightStart } from '../../utils/date';
import { addDays, format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BackIcon, DownloadIcon } from '../../icons';

// --- NUEVO: COMPONENTE BUSCADOR DE EMPLEADOS (Estilo Login) ---
const SearchableEmployeeSelect = ({ employees, selectedEmployeeId, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);

    const selectedEmp = employees.find(e => e.id.toString() === selectedEmployeeId);
    // Si el menú está abierto muestra lo que escribes, si no, muestra el nombre seleccionado
    const displayValue = isOpen ? searchTerm : (selectedEmp ? `${selectedEmp.name} ${selectedEmp.surname || ''}` : '');

    const filteredEmployees = employees.filter(emp => {
        const safeName = emp.name || '';
        const safeSurname = emp.surname || '';
        return `${safeName} ${safeSurname}`.toLowerCase().includes(searchTerm.toLowerCase());
    });

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm(''); 
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelect = (employee) => {
        setSearchTerm(''); 
        setIsOpen(false);
        onSelect(employee.id.toString()); 
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div className="relative group">
                <input
                    type="text"
                    className="w-full p-3 pl-4 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all font-bold text-gray-800 cursor-pointer"
                    placeholder="Escribe para buscar empleado..."
                    value={displayValue}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }}
                    onClick={() => setIsOpen(true)} 
                />
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400 group-hover:text-indigo-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>

            {isOpen && (
                <ul className="absolute z-30 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-60 overflow-auto divide-y divide-gray-50">
                    {filteredEmployees.length > 0 ? (
                        filteredEmployees.map((emp) => (
                            <li
                                key={emp.id}
                                className="px-4 py-3 hover:bg-indigo-50 cursor-pointer transition-colors flex items-center gap-3"
                                onClick={() => handleSelect(emp)}
                            >
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                                    {emp?.name?.charAt(0) || ''}{emp?.surname?.charAt(0) || ''}
                                </div>
                                <div className="truncate">
                                    <span className="font-bold text-gray-900">{emp.name}</span> <span className="text-gray-600">{emp.surname || ''}</span>
                                    {!emp.active && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold uppercase">Inactivo</span>}
                                </div>
                            </li>
                        ))
                    ) : (
                        <li className="px-5 py-6 text-gray-500 text-center font-medium">No se encontraron empleados.</li>
                    )}
                </ul>
            )}
        </div>
    );
};

function GlobalInvoicesView({ onBack }) {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [periods, setPeriods] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [invoiceData, setInvoiceData] = useState({ shifts: [], totalHours: 0, grandTotal: 0 });
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Estados Inteligentes
    const [invoiceNum, setInvoiceNum] = useState(null); 
    const [isInvoiceSavedInDb, setIsInvoiceSavedInDb] = useState(false);

    // Sistema de Notificaciones (Feedback Modal)
    const [feedback, setFeedback] = useState({ isOpen: false, title: '', message: '', type: 'info' });

    const showFeedback = (title, message, type = 'info') => {
        setFeedback({ isOpen: true, title, message, type });
    };

    // 1. CARGA INICIAL
    useEffect(() => {
        const initData = async () => {
            const { data: conf } = await supabase.from('invoice_config').select('*').single();
            if (conf) setConfig(conf);

            const { data: emps } = await supabase
                .from('employees')
                .select('*')
                .order('active', { ascending: false })
                .order('name');
            if (emps) {
                setEmployees(emps);
                if (emps.length > 0) setSelectedEmployee(emps[0].id.toString());
            }

            const { data: datesData } = await supabase.from('attendances').select('date').order('date', { ascending: false });
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
            if (sortedPeriods.length > 0) setSelectedPeriod(sortedPeriods[0].value);
        };
        initData();
    }, []);

    // 2. BUSCAR DATOS Y VERIFICAR ESTADO EN LA BASE DE DATOS
    useEffect(() => {
        if (selectedEmployee && selectedPeriod) {
            fetchInvoiceData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedEmployee, selectedPeriod]);

    const fetchInvoiceData = async () => {
        setLoading(true);
        try {
            const startDate = parseISO(selectedPeriod);
            const endDate = addDays(startDate, 14);

            const { data: atts, error } = await supabase
                .from('attendances')
                .select('*')
                .eq('employee_id', selectedEmployee)
                .gte('date', format(startDate, 'yyyy-MM-dd'))
                .lt('date', format(endDate, 'yyyy-MM-dd'))
                .order('date');

            if (error) throw error;

            let totalH = 0;
            let totalMoney = 0;

            if (atts) {
                atts.forEach(att => {
                    totalH += Number(att.duration);
                    totalMoney += Number(att.total || (att.duration * att.rate));
                });
            }

            setInvoiceData({
                shifts: atts || [],
                totalHours: totalH,
                grandTotal: totalMoney
            });

            // LÓGICA DE LECTURA (Idempotencia)
            const { data: existingLog } = await supabase
                .from('invoices_log')
                .select('invoice_number')
                .eq('employee_id', selectedEmployee)
                .eq('period_start', selectedPeriod)
                .single();

            if (existingLog) {
                // El periodo está cerrado y emitido
                setInvoiceNum(existingLog.invoice_number);
                setIsInvoiceSavedInDb(true);
            } else {
                // El periodo NO está cerrado
                setInvoiceNum(null);
                setIsInvoiceSavedInDb(false); 
            }

        } catch (error) {
            console.error("Error fetching invoice data:", error);
            showFeedback("Error", "No se pudieron cargar los datos de la factura.", "error");
        } finally {
            setLoading(false);
        }
    };

    // 3. GENERADOR DE PDF (DRAFT u OFICIAL)
    const generatePDF = async (isDraft = false) => {
        const emp = employees.find(e => e.id.toString() === selectedEmployee);
        if (!emp || !config) return showFeedback("Atención", "Faltan datos del empleado o configuración.", "info");
        if (invoiceData.totalHours === 0) return showFeedback("Atención", "Este empleado no tiene horas en este periodo.", "info");

        // --- CÓDIGO PDF EXACTO (Diseño Zara) ---
        const doc = new jsPDF('p', 'mm', 'a4'); 
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 9; 
        
        doc.setDrawColor(0, 0, 0); 
        doc.setLineWidth(0.5);
        doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2));

        const startDate = parseISO(selectedPeriod);
        const endDate = addDays(startDate, 13);
        const periodStr = `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`;
        
        const todayStr = format(new Date(), 'dd/MM/yyyy');
        const dueDateStr = format(addDays(new Date(), 4), 'dd/MM/yyyy');

        // Si es borrador muestra "DRAFT", si no, el número de la BD
        const finalInvoiceNum = isDraft ? "DRAFT" : (invoiceNum ? invoiceNum.toString() : "N/A");

        let startY = 25; 

        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text(isDraft ? "INVOICE (DRAFT)" : "INVOICE", pageWidth / 2, startY, { align: "center" });
        startY += 15;

        doc.setFontSize(9);
        const leftColLabelX = 12;
        const leftColValueX = 46;
        const rightColLabelX = 117;
        const rightColValueX = 144;

        const drawInfoRow = (labelL, valL, labelR, valR, yOffset) => {
            if (labelL) {
                doc.setFont("helvetica", "bold"); doc.text(labelL, leftColLabelX, yOffset);
                doc.setFont("helvetica", "normal"); doc.text(valL || '', leftColValueX, yOffset);
            }
            if (labelR) {
                doc.setFont("helvetica", "bold"); doc.text(labelR, rightColLabelX, yOffset);
                doc.setFont("helvetica", "normal"); doc.text(valR || '', rightColValueX, yOffset);
            }
        };

        drawInfoRow("Name", `${emp.name} ${emp.surname}`, "Invoice Number", finalInvoiceNum, startY); startY += 6;
        drawInfoRow("Address", emp.address || "N/A", "Date", todayStr, startY); startY += 6;
        drawInfoRow("Telephone", emp.telephone || "N/A", "Due Date:", dueDateStr, startY); startY += 6;
        drawInfoRow("ABN Number", emp.abn || "N/A", "Description", `${config.description} ${config.company_address}`, startY); startY += 6;
        drawInfoRow("Email", emp.email || "N/A", null, null, startY); startY += 10;
        
        drawInfoRow("Company Email", config.company_email, null, null, startY); startY += 6;
        drawInfoRow("Company ABN:", config.company_abn, null, null, startY); startY += 6;
        drawInfoRow("Business Telephone", config.business_telephone, null, null, startY); startY += 8;

        const blueZara = [79, 129, 189]; 

        autoTable(doc, {
            startY: startY,
            margin: { left: margin, right: margin },
            head: [['Description', 'Pay Period', 'Grand Total']],
            body: [[`${config.description}`, periodStr, `$${invoiceData.grandTotal.toFixed(2)}`]],
            theme: 'grid',
            headStyles: { fillColor: blueZara, textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.5 },
            bodyStyles: { textColor: [0, 0, 0], halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.5 },
        });

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY,
            margin: { left: margin, right: margin },
            head: [['Preferred Payment Methods']],
            body: [['EFT [Electronic Funds Transfer]']],
            theme: 'plain',
            headStyles: { fillColor: blueZara, textColor: [0, 0, 0], fontStyle: 'bold', halign: 'left', lineColor: [0, 0, 0], lineWidth: 0.5 },
            bodyStyles: { textColor: [0, 0, 0], halign: 'left', lineColor: [0, 0, 0], lineWidth: 0.0 },
        });

        startY = doc.lastAutoTable.finalY + 5;

        autoTable(doc, {
            startY: startY,
            margin: { left: margin, right: margin },
            head: [[{ content: 'Direct Bank Transfer Details', colSpan: 4 }]],
            body: [
                ['Bank Name', emp.bank_name || 'N/A', 'Account Name', emp.account_name || `${emp.name} ${emp.surname}`],
                ['Account Type', emp.account_type || 'Savings', 'BSB', emp.bsb || 'N/A'],
                ['', '', 'Account Number', emp.account_number || 'N/A']
            ],
            theme: 'plain',
            headStyles: { fillColor: blueZara, textColor: [0, 0, 0], fontStyle: 'bold', halign: 'left', lineColor: [0, 0, 0], lineWidth: 0.5 },
            bodyStyles: { textColor: [0, 0, 0], halign: 'left', lineColor: [0, 0, 0], lineWidth: 0.0 },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 35 },
                1: { cellWidth: 60 },
                2: { fontStyle: 'bold', cellWidth: 35 },
                3: { cellWidth: 'auto' }
            }
        });

        const fileNamePrefix = isDraft ? 'DRAFT_Invoice' : 'Invoice';
        doc.save(`${fileNamePrefix}_${emp.name}_${emp.surname}_${periodStr.replace(/\//g, '-')}.pdf`);

        try {
            await supabase.from('system_logs').insert({
                action: 'DOWNLOAD_INVOICE',
                details: isDraft 
                    ? `Admin previsualizó borrador de: ${emp.name} ${emp.surname}. Periodo: ${periodStr}`
                    : `Admin descargó Factura N° ${invoiceNum} de: ${emp.name} ${emp.surname}. Periodo: ${periodStr}`,
                admin_name: 'Admin'
            });
        } catch (err) {
            console.error("Error guardando el log de descarga:", err);
        }
        
        if (!isDraft) {
            showFeedback("Descarga Exitosa", "La factura ha sido descargada.", "success");
        }
    };

    return (
        <div className="w-full max-w-full mx-auto px-4 md:px-6 pb-10 animate-fade-in-up">
            {/* Header Adaptable a Móvil */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-indigo-600 transition-colors">
                        <BackIcon />
                    </button>
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">Facturas Globales</h2>
                        <p className="text-gray-500 font-medium text-sm">Visualizar y descargar PDFs</p>
                    </div>
                </div>
            </div>

            {/* Selectores mejorados y apilables en móvil */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="w-full">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Empleado</label>
                    <SearchableEmployeeSelect 
                        employees={employees} 
                        selectedEmployeeId={selectedEmployee} 
                        onSelect={setSelectedEmployee} 
                    />
                </div>
                <div className="w-full">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Periodo (Quincena)</label>
                    <select 
                        value={selectedPeriod} 
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="w-full p-3 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all font-bold text-gray-800 cursor-pointer h-[52px]"
                    >
                        {periods.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Vista Previa de la Factura y Tabla de Turnos */}
            {loading ? (
                <div className="text-center p-12 bg-white rounded-3xl shadow-sm border border-gray-100">
                    <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium animate-pulse">Calculando datos de la factura...</p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden max-w-4xl mx-auto">
                    <div className="p-6 md:p-10 border-t-8 border-indigo-600">
                        
                        {/* Resumen Superior Responsivo */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 border-b border-gray-100 pb-6">
                            <div>
                                <h3 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">RESUMEN DE FACTURACIÓN</h3>
                                <p className="text-gray-500 font-medium mt-1">
                                    Periodo: {selectedPeriod && format(parseISO(selectedPeriod), 'dd/MM/yyyy')} - {selectedPeriod && format(addDays(parseISO(selectedPeriod), 13), 'dd/MM/yyyy')}
                                </p>
                            </div>
                            <div className="text-left md:text-right w-full md:w-auto bg-indigo-50 md:bg-transparent p-4 md:p-0 rounded-xl">
                                <p className="text-sm font-bold text-indigo-400 md:text-gray-400 uppercase tracking-wider">Gran Total</p>
                                <p className="text-4xl font-black text-indigo-600">${invoiceData.grandTotal.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Tarjetas de Datos: Apiladas en móvil, en fila en PC */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 text-center sm:text-left">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Empleado Seleccionado</p>
                                <p className="font-bold text-gray-800 text-lg leading-tight">
                                    {employees.find(e => e.id.toString() === selectedEmployee)?.name}{' '}
                                    {employees.find(e => e.id.toString() === selectedEmployee)?.surname}
                                </p>
                            </div>
                            
                            <div className={`rounded-2xl p-5 border text-center ${isInvoiceSavedInDb ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'}`}>
                                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isInvoiceSavedInDb ? 'text-emerald-600' : 'text-orange-600'}`}>
                                    Estado del Documento
                                </p>
                                {isInvoiceSavedInDb ? (
                                    <>
                                        <p className="font-black text-xl text-emerald-600">N° {invoiceNum}</p>
                                        <p className="text-[10px] font-bold text-white bg-emerald-500 inline-block px-2 py-0.5 rounded-full mt-1 uppercase shadow-sm">Emitida</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-black text-xl text-orange-500">Pendiente</p>
                                        <p className="text-[10px] font-bold text-white bg-orange-400 inline-block px-2 py-0.5 rounded-full mt-1 uppercase shadow-sm">Borrador</p>
                                    </>
                                )}
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 text-center sm:text-right">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Tarifa Configurada</p>
                                <p className="font-black text-2xl text-gray-800">
                                    ${employees.find(e => e.id.toString() === selectedEmployee)?.hourly_rate}<span className="text-sm text-gray-400 font-bold">/hr</span>
                                </p>
                            </div>
                        </div>

                        {/* Tabla Detallada de Turnos (Con scroll horizontal para celular) */}
                        <div className="mb-10">
                            <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 border-l-4 border-indigo-500 pl-3">Detalle de Turnos Trabajados</h4>
                            {invoiceData.shifts.length === 0 || invoiceData.totalHours === 0 ? (
                                <div className="text-center p-8 bg-orange-50/50 rounded-2xl border border-orange-100">
                                    <p className="text-orange-800 font-bold">Este empleado no tiene horas registradas en este periodo.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-2xl border border-gray-200 custom-scrollbar">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-4 text-left font-bold text-gray-500 uppercase tracking-wider text-xs">Fecha</th>
                                                <th className="px-6 py-4 text-right font-bold text-gray-500 uppercase tracking-wider text-xs">Horas Trabajadas</th>
                                                <th className="px-6 py-4 text-right font-bold text-gray-500 uppercase tracking-wider text-xs">Total Generado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {invoiceData.shifts.map((shift, idx) => {
                                                if (Number(shift.duration) === 0) return null; 
                                                return (
                                                    <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                                                        <td className="px-6 py-4 text-gray-800 font-bold">{format(parseISO(shift.date), 'dd/MM/yyyy')}</td>
                                                        <td className="px-6 py-4 text-right text-gray-600 font-medium">{Number(shift.duration).toFixed(2)} h</td>
                                                        <td className="px-6 py-4 text-right text-gray-900 font-black">
                                                            ${Number(shift.total || shift.duration * shift.rate).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                            <tr>
                                                <td className="px-6 py-5 font-black text-gray-800 text-right text-xs uppercase tracking-wider">TOTALES</td>
                                                <td className="px-6 py-5 font-black text-gray-800 text-right">{invoiceData.totalHours.toFixed(2)} h</td>
                                                <td className="px-6 py-5 font-black text-indigo-600 text-right text-xl">${invoiceData.grandTotal.toFixed(2)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* BOTONES DE DESCARGA RESPONSIVOS */}
                        {invoiceData.totalHours > 0 && (
                            <div className="flex flex-col mt-4">
                                {isInvoiceSavedInDb ? (
                                    <button 
                                        onClick={() => generatePDF(false)} 
                                        className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-600 hover:-translate-y-1 transition-all flex justify-center items-center gap-3 text-lg"
                                    >
                                        <DownloadIcon className="w-6 h-6" /> Descargar Factura
                                    </button>
                                ) : (
                                    <div className="w-full flex flex-col gap-4">
                                        <div className="bg-orange-50/80 text-orange-800 p-5 rounded-2xl border border-orange-100 text-center">
                                            <p className="font-bold flex items-center justify-center gap-2 text-orange-700">
                                                <span className="text-xl">⚠️</span> Periodo no cerrado
                                            </p>
                                            <p className="text-sm mt-2 font-medium">Ve al "Editor de Turnos" y haz clic en "Emitir Facturas" para generar el documento oficial.</p>
                                        </div>
                                        <button 
                                            onClick={() => generatePDF(true)} 
                                            className="w-full bg-white text-gray-700 border-2 border-gray-200 font-bold py-4 rounded-2xl shadow-sm hover:bg-gray-50 transition-all flex justify-center items-center gap-2 text-lg hover:border-gray-300"
                                        >
                                            <span className="text-2xl">👁️</span> Previsualizar Borrador
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL DE NOTIFICACIÓN / FEEDBACK */}
            {feedback.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all animate-fade-in-up">
                        <div className={`p-8 text-center ${feedback.type === 'error' ? 'bg-red-50/50' : feedback.type === 'success' ? 'bg-emerald-50/50' : 'bg-blue-50/50'}`}>
                            <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-5 shadow-sm ${feedback.type === 'error' ? 'bg-red-100 text-red-600' : feedback.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                <span className="text-3xl">{feedback.type === 'error' ? '❌' : feedback.type === 'success' ? '✅' : 'ℹ️'}</span>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">{feedback.title}</h3>
                            <p className="text-sm text-gray-600 font-medium leading-relaxed">{feedback.message}</p>
                        </div>
                        <div className="p-4 bg-white flex justify-center border-t border-gray-100">
                            <button 
                                onClick={() => setFeedback({ ...feedback, isOpen: false })}
                                className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black w-full shadow-lg hover:shadow-xl transition-all"
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

export default GlobalInvoicesView;