import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { BackIcon, SaveIcon } from '../../icons';

function InvoiceConfigView({ onBack }) {
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Sistema de Notificaciones (Feedback Modal)
    const [feedback, setFeedback] = useState({ isOpen: false, title: '', message: '', type: 'info' });

    const showFeedback = (title, message, type = 'info') => {
        setFeedback({ isOpen: true, title, message, type });
    };

    // Estado del Formulario
    const [formData, setFormData] = useState({
        id: 1, // Siempre usaremos el ID 1 para la configuración global
        company_name: '',
        company_email: '',
        company_abn: '',
        business_telephone: '',
        description: '',
        company_address: ''
    });

    // 1. CARGAR DATOS AL INICIAR
    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('invoice_config')
                .select('*')
                .eq('id', 1)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 es "No se encontró fila", lo ignoramos si es nuevo
                throw error;
            }

            if (data) {
                setFormData(data);
            }
        } catch (error) {
            console.error("Error cargando configuración:", error);
            showFeedback('Error', 'No se pudo cargar la configuración de la base de datos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // 2. MANEJAR CAMBIOS EN LOS INPUTS
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // 3. GUARDAR EN LA BASE DE DATOS
    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        
        try {
            // Usamos UPSERT: Si el id 1 existe lo actualiza, si no, lo crea.
            const { error } = await supabase
                .from('invoice_config')
                .upsert({
                    ...formData,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });

            if (error) throw error;

            // Auditoría silenciosa
            await supabase.from('system_logs').insert({
                action: 'UPDATE_INVOICE_CONFIG',
                details: 'El administrador actualizó los datos fiscales de la empresa.',
                admin_name: 'Admin'
            });

            showFeedback('Configuración Guardada', 'Los datos de facturación se han actualizado correctamente. Las nuevas facturas usarán esta información.', 'success');
            
        } catch (error) {
            console.error("Error guardando:", error);
            showFeedback('Error al Guardar', `Hubo un problema: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
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
                        <h2 className="text-xl font-bold text-gray-800">Configuración de Facturas</h2>
                        <p className="text-gray-500 text-sm">Administra los datos fiscales de la empresa</p>
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={loading || isSaving}
                        className={`bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 font-bold shadow flex items-center gap-2 transition-all hover:-translate-y-0.5 ${isSaving ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        <SaveIcon className="w-5 h-5"/> 
                        {isSaving ? 'Guardando...' : 'Guardar Configuración'}
                    </button>
                </div>
            </div>

            {/* FORMULARIO PRINCIPAL */}
            {loading ? (
                <div className="text-center p-10 text-gray-500 animate-pulse font-medium bg-white rounded-xl shadow-sm border border-gray-100">
                    Cargando configuración actual...
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-4xl mx-auto">
                    <div className="p-8">
                        <div className="mb-8 border-b pb-4">
                            <h3 className="text-lg font-bold text-gray-800">Datos Oficiales de la Empresa</h3>
                            <p className="text-sm text-gray-500">Esta información aparecerá en el lado izquierdo superior de todos los PDFs generados (Company Email, ABN, etc).</p>
                        </div>

                        <form id="configForm" onSubmit={handleSave} className="space-y-6">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Nombre de la Empresa */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Razón Social / Nombre de la Empresa</label>
                                    <input 
                                        type="text" 
                                        name="company_name" 
                                        value={formData.company_name} 
                                        onChange={handleChange}
                                        placeholder="Ej: United Traders Pty Ltd"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>

                                {/* ABN */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Company ABN</label>
                                    <input 
                                        type="text" 
                                        name="company_abn" 
                                        value={formData.company_abn} 
                                        onChange={handleChange}
                                        placeholder="Ej: 26 601 411 474"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                                    />
                                </div>

                                {/* Teléfono */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Business Telephone</label>
                                    <input 
                                        type="text" 
                                        name="business_telephone" 
                                        value={formData.business_telephone} 
                                        onChange={handleChange}
                                        placeholder="Ej: 0414 270 761"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Company Email</label>
                                    <input 
                                        type="email" 
                                        name="company_email" 
                                        value={formData.company_email} 
                                        onChange={handleChange}
                                        placeholder="Ej: admin@empresa.com.au"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>

                                {/* Dirección (Opcional por si acaso) */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Company Address</label>
                                    <input 
                                        type="text" 
                                        name="company_address" 
                                        value={formData.company_address} 
                                        onChange={handleChange}
                                        placeholder="Ej: 155 Queen St, Brisbane"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="mt-10 mb-4 border-b pb-4 pt-6">
                                <h3 className="text-lg font-bold text-gray-800">Parámetros de Facturación</h3>
                                <p className="text-sm text-gray-500">Configuración por defecto para el servicio prestado en la tabla principal del PDF.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Descripción de la Factura */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Descripción del Servicio (Default)</label>
                                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg flex gap-4 items-center">
                                        <div className="text-3xl">💡</div>
                                        <div className="flex-1">
                                            <input 
                                                type="text" 
                                                name="description" 
                                                value={formData.description} 
                                                onChange={handleChange}
                                                placeholder="Ej: Cleaning Services Zara"
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            />
                                            <p className="text-xs text-indigo-700 mt-2">
                                                * Este texto aparecerá en la columna "Description" de todas las facturas generadas.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </form>
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

export default InvoiceConfigView;