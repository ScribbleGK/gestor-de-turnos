import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { getFortnightStart } from '../utils/date';
import { addDays, format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BackIcon, DownloadIcon } from '../icons';

function InvoicesView({ onBack }) {
    const { currentUser } = useAuth();
    const [periods, setPeriods] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState('');
    // Añadimos 'periodRate' al estado inicial
    const [invoiceData, setInvoiceData] = useState({ shifts: [], totalHours: 0, grandTotal: 0, periodRate: 0 });
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const [employeeData, setEmployeeData] = useState(null);
    const [invoiceNum, setInvoiceNum] = useState(null); 
    const [isInvoiceSavedInDb, setIsInvoiceSavedInDb] = useState(false);

    const [feedback, setFeedback] = useState({ isOpen: false, title: '', message: '', type: 'info' });

    const showFeedback = (title, message, type = 'info') => {
        setFeedback({ isOpen: true, title, message, type });
    };

    // 1. CARGA INICIAL
    useEffect(() => {
        const initData = async () => {
            if (!currentUser) return;

            const { data: conf } = await supabase.from('invoice_config').select('*').single();
            if (conf) setConfig(conf);

            const { data: empDetails } = await supabase
                .from('employees')
                .select('*')
                .eq('id', currentUser.id)
                .single();
            if (empDetails) setEmployeeData(empDetails);

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
            if (sortedPeriods.length > 0) setSelectedPeriod(sortedPeriods[0].value);
        };
        initData();
    }, [currentUser]);

    // 2. BUSCAR DATOS DE LA QUINCENA
    useEffect(() => {
        if (employeeData && selectedPeriod) {
            fetchInvoiceData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employeeData, selectedPeriod]);

    const fetchInvoiceData = async () => {
        setLoading(true);
        try {
            const startDate = parseISO(selectedPeriod);
            const endDate = addDays(startDate, 14);

            const { data: atts, error } = await supabase
                .from('attendances')
                .select('*')
                .eq('employee_id', currentUser.id)
                .gte('date', format(startDate, 'yyyy-MM-dd'))
                .lt('date', format(endDate, 'yyyy-MM-dd'))
                .order('date');

            if (error) throw error;

            let totalH = 0;
            let totalMoney = 0;
            // Por defecto, usa la tarifa actual por si es una quincena nueva sin turnos
            let currentPeriodRate = employeeData.hourly_rate || 0; 

            if (atts && atts.length > 0) {
                // Buscamos la tarifa real guardada en el primer turno de esta quincena
                const historicalShift = atts.find(att => att.rate > 0);
                if (historicalShift) {
                    currentPeriodRate = historicalShift.rate;
                }

                atts.forEach(att => {
                    totalH += Number(att.duration);
                    totalMoney += Number(att.total || (att.duration * (att.rate || employeeData.hourly_rate || 0)));
                });
            }

            setInvoiceData({
                shifts: atts || [],
                totalHours: totalH,
                grandTotal: totalMoney,
                periodRate: currentPeriodRate // <-- Guardamos la tarifa histórica para mostrarla
            });

            const { data: existingLog } = await supabase
                .from('invoices_log')
                .select('invoice_number')
                .eq('employee_id', currentUser.id)
                .eq('period_start', selectedPeriod)
                .single();

            if (existingLog) {
                setInvoiceNum(existingLog.invoice_number);
                setIsInvoiceSavedInDb(true);
            } else {
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
        const emp = employeeData; 
        if (!emp || !config) return showFeedback("Atención", "Faltan datos de configuración o perfil. Intenta nuevamente.", "info");
        if (invoiceData.totalHours === 0) return showFeedback("Atención", "No tienes horas registradas en este periodo.", "info");

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

        drawInfoRow("Name", `${emp.name} ${emp.surname || ''}`, "Invoice Number", finalInvoiceNum, startY); startY += 6;
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
                ['Bank Name', emp.bank_name || 'N/A', 'Account Name', emp.account_name || `${emp.name} ${emp.surname || ''}`],
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
        doc.save(`${fileNamePrefix}_${emp.name}_${periodStr.replace(/\//g, '-')}.pdf`);
        
        try {
            await supabase.from('system_logs').insert({
                action: 'DOWNLOAD_INVOICE',
                details: isDraft 
                    ? `Previsualizó borrador de factura. Periodo: ${periodStr}`
                    : `Descargó Factura Oficial N° ${invoiceNum}. Periodo: ${periodStr}`,
                admin_name: `${emp.name} ${emp.surname || ''}` 
            });
        } catch (err) {
            console.error("Error guardando log:", err);
        }

        if (!isDraft) {
            showFeedback("Descarga Exitosa", "Tu factura oficial ha sido descargada correctamente.", "success");
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto px-4 pb-10 animate-fade-in-up">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-indigo-600 transition-colors">
                        <BackIcon />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Mis Facturas</h2>
                        <p className="text-gray-500 font-medium mt-1">Descarga tus comprobantes</p>
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

            {loading || !employeeData ? (
                <div className="text-center p-12 bg-white rounded-3xl shadow-sm border border-gray-100">
                    <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium animate-pulse">Calculando datos de la factura...</p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                    <div className="p-6 sm:p-8">
                        
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 border-b border-gray-100 pb-8 gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 tracking-tight">Periodo de Pago</h3>
                                <p className="text-gray-500 font-medium mt-1">
                                    {selectedPeriod && format(parseISO(selectedPeriod), 'dd/MM/yyyy')} - {selectedPeriod && format(addDays(parseISO(selectedPeriod), 13), 'dd/MM/yyyy')}
                                </p>
                            </div>
                            <div className="text-left sm:text-right">
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Monto Total</p>
                                <p className="text-4xl font-black text-indigo-600">${invoiceData.grandTotal.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Estado del Documento</p>
                                {isInvoiceSavedInDb ? (
                                    <div>
                                        <p className="font-black text-2xl text-emerald-500">Emitida (N° {invoiceNum})</p>
                                        <p className="text-xs font-bold text-emerald-600 bg-emerald-100 inline-block px-2 py-1 rounded-md mt-2">LISTA PARA DESCARGA</p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="font-black text-2xl text-orange-500">En Revisión</p>
                                        <p className="text-xs font-bold text-orange-600 bg-orange-100 inline-block px-2 py-1 rounded-md mt-2">PERIODO NO CERRADO</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="hidden sm:block w-px h-16 bg-gray-200"></div>

                            <div className="flex-1 sm:text-right">
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Tarifa del Periodo</p>
                                {/* AHORA MOSTRARÁ LA TARIFA HISTÓRICA */}
                                <p className="font-black text-2xl text-gray-800">
                                    ${invoiceData.periodRate}<span className="text-lg text-gray-400 font-bold">/hr</span>
                                </p>
                            </div>
                        </div>

                        {invoiceData.totalHours > 0 ? (
                            <div className="mt-8">
                                {isInvoiceSavedInDb ? (
                                    <button 
                                        onClick={() => generatePDF(false)} 
                                        className="w-full bg-emerald-500 text-white font-black py-4 px-6 rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-600 hover:-translate-y-1 transition-all flex justify-center items-center gap-3 text-lg"
                                    >
                                        <DownloadIcon className="w-6 h-6" /> Descargar Factura
                                    </button>
                                ) : (
                                    <div className="w-full flex flex-col gap-4">
                                        <div className="bg-orange-50/50 text-orange-800 p-5 rounded-2xl border border-orange-100 text-center">
                                            <p className="font-bold text-orange-700">⚠️ Aún no puedes descargar la versión oficial</p>
                                            <p className="text-sm mt-1">El administrador debe cerrar el periodo primero. Mientras tanto, puedes revisar un borrador de cómo quedará tu factura.</p>
                                        </div>
                                        <button 
                                            onClick={() => generatePDF(true)} 
                                            className="w-full bg-white text-gray-700 border-2 border-gray-200 font-bold py-4 rounded-2xl shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all flex justify-center items-center gap-2 text-lg"
                                        >
                                            <span className="text-2xl">👁️</span> Previsualizar Borrador
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center p-8 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-gray-500 font-bold text-lg">No hay turnos registrados en este periodo.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

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

export default InvoicesView;