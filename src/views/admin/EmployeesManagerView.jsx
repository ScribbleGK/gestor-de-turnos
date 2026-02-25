import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { BackIcon } from '../../icons';

function EmployeesManagerView({ onBack }) {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // NUEVO ESTADO: Para el buscador en tiempo real
    const [searchTerm, setSearchTerm] = useState('');

    const initialFormState = {
        id: null,
        name: '',
        second_name: '',
        surname: '',
        second_surname: '',
        email: '',
        telephone: '',
        address: '',
        abn: '',
        bank_name: '',
        account_type: '',
        account_name: '', 
        bsb: '',
        account_number: '',
        hourly_rate: '',
        last_invoice: 0,  
        role: 'worker',
        pin: '',
        active: true
    };

    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        setLoading(true); 
        
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('active', { ascending: false })
            .order('name', { ascending: true }); 
        
        if (error) {
            console.error("Error cargando empleados:", error.message);
        } else if (data) {
            setEmployees(data);
        }
        
        setLoading(false); 
    };

    const handleEdit = (emp) => {
        setFormData({
            id: emp.id,
            name: emp.name || '',
            second_name: emp.second_name || '',
            surname: emp.surname || '',
            second_surname: emp.second_surname || '',
            email: emp.email || '',
            telephone: emp.telephone || '',
            address: emp.address || '',
            abn: emp.abn || '',
            bank_name: emp.bank_name || '',
            account_type: emp.account_type || '',
            account_name: emp.account_name || '', 
            bsb: emp.bsb || '',
            account_number: emp.account_number || '',
            hourly_rate: emp.hourly_rate || 0,
            last_invoice: emp.last_invoice || 0,   
            role: emp.role || 'worker',
            pin: emp.pin || '',
            active: emp.active
        });
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setFormData(initialFormState); 
        setIsEditing(false);
        setIsModalOpen(true);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        const payload = {
            name: formData.name,
            second_name: formData.second_name,
            surname: formData.surname,
            second_surname: formData.second_surname,
            email: formData.email,
            telephone: formData.telephone,
            address: formData.address,
            abn: formData.abn,
            bank_name: formData.bank_name,
            account_type: formData.account_type,
            account_name: formData.account_name, 
            bsb: formData.bsb,
            account_number: formData.account_number,
            hourly_rate: parseFloat(formData.hourly_rate) || 0,
            last_invoice: parseInt(formData.last_invoice) || 0, 
            role: formData.role,
            pin: formData.pin,
            active: formData.active
        };

        try {
            let error;
            if (isEditing) {
                const { error: updateError } = await supabase
                    .from('employees')
                    .update(payload)
                    .eq('id', formData.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('employees')
                    .insert(payload);
                error = insertError;
            }

            if (error) throw error; 

            await supabase.from('system_logs').insert({
                action: isEditing ? 'UPDATE_EMPLOYEE' : 'CREATE_EMPLOYEE',
                details: `Empleado: ${formData.name} ${formData.surname}`,
                admin_name: 'Admin'
            });

            setIsModalOpen(false);
            fetchEmployees();
        } catch (err) {
            console.error(err);
            alert('Error al guardar: ' + err.message);
        }
    };

    const toggleStatus = async (emp) => {
        const newStatus = !emp.active;
        const confirmMsg = newStatus 
            ? "¿Reactivar empleado?" 
            : "ADVERTENCIA: ¿Desactivar empleado? No podrá acceder al sistema, pero su historial de facturas se mantendrá.";
        
        if (!window.confirm(confirmMsg)) return;

        try {
            const { error } = await supabase.from('employees').update({ active: newStatus }).eq('id', emp.id);
            if (error) throw error;
            fetchEmployees();
        } catch (error) {
            console.error("Error cambiando estado:", error);
            alert("Error cambiando estado del empleado.");
        }
    };

    // LÓGICA DE FILTRADO
    const filteredEmployees = employees.filter(emp => {
        if (!searchTerm) return true;
        const fullName = `${emp.name} ${emp.surname || ''}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="w-full max-w-full mx-auto px-4 md:px-6 pb-10 animate-fade-in-up">
            {/* Header Adaptable a Móvil */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-indigo-600 transition-colors">
                        <BackIcon />
                    </button>
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">Gestor de Personal</h2>
                        <p className="text-gray-500 font-medium text-sm">Altas, bajas y edición</p>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
                    {/* Buscador en tiempo real */}
                    <div className="relative w-full sm:w-64">
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
                            className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-100 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all font-medium"
                        />
                    </div>
                    
                    <button 
                        onClick={handleCreate}
                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 font-bold shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5"
                    >
                        + Nuevo
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center p-12 bg-white rounded-3xl shadow-sm border border-gray-100">
                    <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium animate-pulse">Cargando directorio...</p>
                </div>
            ) : filteredEmployees.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 font-bold">No se encontraron empleados con ese nombre.</p>
                </div>
            ) : (
                <>
                    {/* VISTA MÓVIL: Lista de Tarjetas (Se oculta en pantallas medianas o grandes md:) */}
                    <div className="md:hidden space-y-4">
                        {filteredEmployees.map(emp => (
                            <div key={emp.id} className={`bg-white p-5 rounded-2xl shadow-sm border ${emp.active ? 'border-gray-100' : 'border-red-100 bg-gray-50 opacity-80'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900">{emp.name} {emp.surname}</h3>
                                        <span className={`mt-1 inline-block px-2 py-0.5 text-[10px] uppercase font-bold rounded-md ${emp.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {emp.role}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-400">Tarifa</p>
                                        <p className="text-lg font-black text-indigo-600">${emp.hourly_rate}</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                                    <button 
                                        onClick={() => toggleStatus(emp)}
                                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${emp.active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                                    >
                                        {emp.active ? 'DESACTIVAR' : 'REACTIVAR'}
                                    </button>
                                    <button 
                                        onClick={() => handleEdit(emp)} 
                                        className="flex-1 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors"
                                    >
                                        EDITAR PERFIL
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* VISTA ESCRITORIO: Tabla Clásica (Se oculta en celulares, se muestra en md: y arriba) */}
                    <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50/80">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Empleado</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rol</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tarifa Base</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-50">
                                    {filteredEmployees.map((emp) => (
                                        <tr key={emp.id} className={`transition-colors ${!emp.active ? 'bg-gray-50 opacity-60' : 'hover:bg-indigo-50/30'}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-bold text-gray-900">{emp.name} {emp.surname}</div>
                                                <div className="text-xs text-gray-500">{emp.email || 'Sin email'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-lg ${emp.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {emp.role.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-black text-gray-800">${emp.hourly_rate}<span className="text-xs text-gray-400 font-normal">/hr</span></div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`text-[10px] font-bold px-3 py-1.5 rounded-md border ${emp.active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                    {emp.active ? 'ACTIVO' : 'INACTIVO'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => toggleStatus(emp)} className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${emp.active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                                                        {emp.active ? 'Desactivar' : 'Activar'}
                                                    </button>
                                                    <button onClick={() => handleEdit(emp)} className="text-indigo-600 hover:bg-indigo-50 px-4 py-1.5 rounded-lg font-bold text-xs transition-colors">
                                                        Editar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* MODAL DEL FORMULARIO (Se mantiene igual, solo bordes redondeados y padding optimizado para móvil) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto custom-scrollbar">
                        <div className="px-6 sm:px-8 py-5 bg-gray-50 border-b flex justify-between items-center sticky top-0 z-10 rounded-t-3xl">
                            <h3 className="text-xl font-black text-gray-900">{isEditing ? 'Editar Perfil Completo' : 'Nuevo Empleado'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors p-2 bg-white rounded-full shadow-sm">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-8">
                            {/* SECCIÓN 1: DATOS PERSONALES */}
                            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Datos Personales
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Primer Nombre *</label>
                                        <input required name="name" value={formData.name} onChange={handleChange} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-indigo-500 transition-colors bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Segundo Nombre</label>
                                        <input name="second_name" value={formData.second_name} onChange={handleChange} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-indigo-500 transition-colors bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Primer Apellido *</label>
                                        <input required name="surname" value={formData.surname} onChange={handleChange} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-indigo-500 transition-colors bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Segundo Apellido</label>
                                        <input name="second_surname" value={formData.second_surname} onChange={handleChange} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-indigo-500 transition-colors bg-white" />
                                    </div>
                                </div>
                            </div>

                            {/* SECCIÓN 2: CONTACTO Y LEGAL */}
                            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Contacto y Legal
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Dirección Completa</label>
                                        <input name="address" value={formData.address} onChange={handleChange} placeholder="Ej: 2/2 Berwick St..." className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-colors bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
                                        <input name="telephone" value={formData.telephone} onChange={handleChange} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-colors bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-colors bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">ABN</label>
                                        <input name="abn" value={formData.abn} onChange={handleChange} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-colors bg-white font-mono" />
                                    </div>
                                </div>
                            </div>

                            {/* SECCIÓN 3: BANCO */}
                            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
                                <h4 className="text-xs uppercase tracking-wider text-emerald-600 font-bold mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Datos Bancarios
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Banco</label>
                                        <input name="bank_name" value={formData.bank_name} onChange={handleChange} placeholder="Ej: CommBank" className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none transition-colors bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Cuenta</label>
                                        <input name="account_type" value={formData.account_type} onChange={handleChange} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none transition-colors bg-white" />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Exacto en la Cuenta</label>
                                        <input name="account_name" value={formData.account_name} onChange={handleChange} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none transition-colors bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">BSB</label>
                                        <input name="bsb" value={formData.bsb} onChange={handleChange} placeholder="000-000" className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none transition-colors bg-white font-mono" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Número de Cuenta</label>
                                        <input name="account_number" value={formData.account_number} onChange={handleChange} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none transition-colors bg-white font-mono" />
                                    </div>
                                </div>
                            </div>

                            {/* SECCIÓN 4: SISTEMA */}
                            <div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-100">
                                <h4 className="text-xs uppercase tracking-wider text-purple-600 font-bold mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-500"></span> Configuración del Sistema
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-black text-gray-800 mb-1">Tarifa/Hora ($) *</label>
                                        <input required type="number" step="0.01" name="hourly_rate" value={formData.hourly_rate} onChange={handleChange} className="w-full p-3 border-2 border-purple-200 rounded-xl focus:border-purple-500 outline-none font-black text-purple-700 bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Última Factura Emitida</label>
                                        <input type="number" name="last_invoice" value={formData.last_invoice} onChange={handleChange} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none bg-white" title="Número de la última factura generada" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Nivel de Acceso</label>
                                        <select name="role" value={formData.role} onChange={handleChange} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none bg-white font-bold cursor-pointer">
                                            <option value="worker">Trabajador Normal</option>
                                            <option value="admin">Administrador</option>
                                        </select>
                                    </div>
                                    
                                    {formData.role === 'admin' && (
                                        <div className="md:col-span-3">
                                            <label className="block text-sm font-black text-orange-600 mb-1">PIN de Seguridad (Admin)</label>
                                            <input required name="pin" maxLength="4" placeholder="Ej: 1234" value={formData.pin} onChange={handleChange} className="w-full p-3 border-2 border-orange-300 bg-orange-50 rounded-xl focus:border-orange-500 outline-none font-bold text-orange-800 tracking-widest" />
                                        </div>
                                    )}
                                </div>
                                <div className="mt-6 pt-4 border-t border-purple-100">
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input type="checkbox" name="active" checked={formData.active} onChange={handleChange} className="w-6 h-6 text-purple-600 rounded border-gray-300 focus:ring-purple-500" />
                                        <span className="text-gray-800 font-black">Permitir acceso al sistema (Empleado Activo)</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 border-2 border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-colors w-full sm:w-auto">
                                    Cancelar
                                </button>
                                <button type="submit" className="bg-indigo-600 text-white font-black py-3 px-8 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 w-full sm:w-auto">
                                    {isEditing ? 'Guardar Cambios' : 'Crear Empleado'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EmployeesManagerView;