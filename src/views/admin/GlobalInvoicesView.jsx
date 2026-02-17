import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { getFortnightStart } from '../../utils/date';
import { addDays, format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BackIcon, DownloadIcon } from '../../icons';

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
    const generatePDF = (isDraft = false) => {
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
        drawInfoRow("ABN Number", emp.abn || "N/A", "Description", `${config.description} 155 Queen St`, startY); startY += 6;
        drawInfoRow("Email", emp.email || "N/A", null, null, startY); startY += 10;
        
        drawInfoRow("Company Email", config.company_email, null, null, startY); startY += 6;
        drawInfoRow("Company ABN:", config.company_abn, null, null, startY); startY += 6;
        drawInfoRow("Business Telephone", config.business_telephone, null, null, startY); startY += 8;

        const blueZara = [79, 129, 189]; 

        autoTable(doc, {
            startY: startY,
            margin: { left: margin, right: margin },
            head: [['Description', 'Pay Period', 'Grand Total']],
            body: [['Cleaning Services Zara', periodStr, `$${invoiceData.grandTotal.toFixed(2)}`]],
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
        
        if (!isDraft) {
            showFeedback("Descarga Exitosa", "La factura ha sido descargada.", "success");
        }
    };

    return (
        <div className="w-full max-w-full mx-auto px-4 pb-10">
            {/* Header de Controles */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                        <BackIcon />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Facturas Globales</h2>
                        <p className="text-gray-500 text-sm">Visualizar y descargar facturas del personal</p>
                    </div>
                </div>
            </div>

            {/* Selectores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Seleccionar Empleado</label>
                    <select 
                        value={selectedEmployee} 
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                        {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                                {emp.name} {emp.surname} {emp.active ? '' : '(Inactivo)'}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Seleccionar Periodo (Quincena)</label>
                    <select 
                        value={selectedPeriod} 
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                        {periods.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Vista Previa de la Factura y Tabla de Turnos */}
            {loading ? (
                <div className="text-center p-10 text-gray-500 animate-pulse font-medium">Calculando datos de la factura...</div>
            ) : (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden max-w-4xl mx-auto">
                    <div className="p-8 border-b-8 border-indigo-600">
                        {/* Resumen Superior */}
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-3xl font-black text-gray-800 tracking-tight">RESUMEN DE FACTURACIÓN</h3>
                                <p className="text-gray-500 mt-1">
                                    Periodo: {selectedPeriod && format(parseISO(selectedPeriod), 'dd/MM/yyyy')} - {selectedPeriod && format(addDays(parseISO(selectedPeriod), 13), 'dd/MM/yyyy')}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Gran Total</p>
                                <p className="text-4xl font-black text-indigo-600">${invoiceData.grandTotal.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Tarjeta de Empleado y Estado de Factura */}
                        <div className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-200 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Empleado Seleccionado</p>
                                <p className="font-bold text-gray-800 text-lg">
                                    {employees.find(e => e.id.toString() === selectedEmployee)?.name}{' '}
                                    {employees.find(e => e.id.toString() === selectedEmployee)?.surname}
                                </p>
                            </div>
                            
                            <div className="text-center px-4 border-l border-r border-gray-200">
                                <p className="text-sm text-gray-500">Estado de Factura</p>
                                {isInvoiceSavedInDb ? (
                                    <>
                                        <p className="font-black text-xl text-emerald-600">N° {invoiceNum}</p>
                                        <p className="text-[10px] font-bold text-emerald-500 mt-1 uppercase">Periodo Cerrado</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-black text-xl text-orange-500">Pendiente</p>
                                        <p className="text-[10px] font-bold text-orange-400 mt-1 uppercase">No Emitida</p>
                                    </>
                                )}
                            </div>

                            <div className="text-right">
                                <p className="text-sm text-gray-500">Tarifa por Hora</p>
                                <p className="font-bold text-gray-800 text-lg">
                                    ${employees.find(e => e.id.toString() === selectedEmployee)?.hourly_rate}/hr
                                </p>
                            </div>
                        </div>

                        {/* Tabla Detallada de Turnos */}
                        <div className="mb-8">
                            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Detalle de Turnos Trabajados</h4>
                            {invoiceData.shifts.length === 0 || invoiceData.totalHours === 0 ? (
                                <div className="text-center p-6 bg-orange-50 rounded-lg border border-orange-200">
                                    <p className="text-orange-800 font-medium">Este empleado no tiene horas registradas en este periodo.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-bold text-gray-600">Fecha</th>
                                                <th className="px-4 py-3 text-right font-bold text-gray-600">Horas Trabajadas</th>
                                                <th className="px-4 py-3 text-right font-bold text-gray-600">Total Generado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {invoiceData.shifts.map((shift, idx) => {
                                                if (Number(shift.duration) === 0) return null; 
                                                return (
                                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-3 text-gray-800 font-medium">{format(parseISO(shift.date), 'dd/MM/yyyy')}</td>
                                                        <td className="px-4 py-3 text-right text-gray-600">{Number(shift.duration).toFixed(2)} h</td>
                                                        <td className="px-4 py-3 text-right text-gray-800 font-medium">
                                                            ${Number(shift.total || shift.duration * shift.rate).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-gray-100">
                                            <tr>
                                                <td className="px-4 py-3 font-bold text-gray-800 text-right">TOTALES</td>
                                                <td className="px-4 py-3 font-bold text-gray-800 text-right">{invoiceData.totalHours.toFixed(2)} h</td>
                                                <td className="px-4 py-3 font-black text-indigo-700 text-right text-base">${invoiceData.grandTotal.toFixed(2)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* BOTONES DE DESCARGA (Lógica de Reacción al Cierre) */}
                        {invoiceData.totalHours > 0 && (
                            <div className="flex flex-col md:flex-row gap-4">
                                {isInvoiceSavedInDb ? (
                                    <button 
                                        onClick={() => generatePDF(false)} // false = Oficial
                                        className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow hover:bg-emerald-700 transition-all flex justify-center items-center gap-2 text-lg"
                                    >
                                        <DownloadIcon className="w-6 h-6" /> Descargar Factura
                                    </button>
                                ) : (
                                    <div className="w-full flex flex-col gap-2">
                                        <div className="bg-orange-50 text-orange-800 p-4 rounded-xl border border-orange-200 text-center">
                                            <p className="font-bold">⚠️ Periodo no cerrado</p>
                                            <p className="text-sm">Ve al "Editor de Turnos" y haz clic en "Emitir Facturas" para generar el documento oficial.</p>
                                        </div>
                                        <button 
                                            onClick={() => generatePDF(true)} // true = Borrador
                                            className="w-full bg-white text-gray-700 border-2 border-gray-300 font-bold py-3 rounded-xl shadow-sm hover:bg-gray-50 transition-all flex justify-center items-center gap-2"
                                        >
                                            <span className="text-xl">👁️</span> Descargar Borrador (No Oficial)
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

export default GlobalInvoicesView;