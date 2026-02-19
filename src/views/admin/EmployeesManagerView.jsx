import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { BackIcon } from '../../icons';

function EmployeesManagerView({ onBack }) {
    const [employees, setEmployees] = useState([]);
    // AHORA SÍ SE USA: Sirve para mostrar feedback visual al usuario
    const [loading, setLoading] = useState(false);
    
    // Estado del Formulario y UI
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // ESTADO INICIAL COMPLETO (Incluyendo los campos que pediste)
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
        setLoading(true); // 1. Empezamos a cargar
        
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('active', { ascending: false })
            .order('name', { ascending: true }); // Mantenemos tu orden
        
        if (error) {
            console.error("Error cargando empleados:", error.message);
            // Aquí podrías poner un estado de error visual si quisieras
        } else if (data) {
            setEmployees(data);
        }
        
        setLoading(false); // 2. Terminamos de cargar
    };

    const handleEdit = (emp) => {
        // Rellenamos TODOS los campos, usando '' si vienen nulos de la BD
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
            account_name: emp.account_name || '', // Mapeamos account_name
            bsb: emp.bsb || '',
            account_number: emp.account_number || '',
            hourly_rate: emp.hourly_rate || 0,
            last_invoice: emp.last_invoice || 0,   // Mapeamos last_invoice
            role: emp.role || 'worker',
            pin: emp.pin || '',
            active: emp.active
        });
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setFormData(initialFormState); // Reseteamos al estado limpio completo
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
        
        // Preparamos el objeto completo para Supabase
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
            account_name: formData.account_name, // Guardamos
            bsb: formData.bsb,
            account_number: formData.account_number,
            hourly_rate: parseFloat(formData.hourly_rate) || 0,
            last_invoice: parseInt(formData.last_invoice) || 0, // Guardamos
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

            if (error) throw error; // Usamos la variable error

            // Log del sistema
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

    return (
        // TU CAMBIO: max-w-full respetado
        <div className="w-full max-w-full mx-auto px-4 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                        <BackIcon />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Gestor de Empleados</h2>
                        <p className="text-gray-500 text-sm">Altas, bajas y edición de perfiles</p>
                    </div>
                </div>
                <button 
                    onClick={handleCreate}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-bold shadow flex items-center gap-2"
                >
                    + Nuevo Empleado
                </button>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rol / PIN</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tarifa/h</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {/* AQUI SE USA EL LOADING */}
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-10 text-center text-gray-500 font-medium animate-pulse">
                                    Cargando directorio de empleados...
                                </td>
                            </tr>
                        ) : employees.map((emp) => (
                            <tr key={emp.id} className={!emp.active ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {/* TU CAMBIO: Nombre Apellido respetado */}
                                    <div className="text-sm font-bold text-gray-900">{emp.name} {emp.surname}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${emp.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {emp.role.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    ${emp.hourly_rate}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <button 
                                        onClick={() => toggleStatus(emp)}
                                        className={`text-[10px] font-bold px-2 py-1 rounded cursor-pointer border ${emp.active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}
                                    >
                                        {emp.active ? 'ACTIVO' : 'INACTIVO'}
                                    </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleEdit(emp)} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded font-bold">Editar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Formulario AMPLITADO */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="px-8 py-5 bg-gray-50 border-b flex justify-between items-center sticky top-0 z-10">
                            <h3 className="text-xl font-bold text-gray-800">{isEditing ? 'Editar Perfil Completo' : 'Nuevo Empleado'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">✕</button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-8 space-y-8">
                            
                            {/* SECCIÓN 1: DATOS PERSONALES */}
                            <div>
                                <h4 className="text-sm uppercase tracking-wide text-gray-500 font-bold mb-4 border-b pb-2">Datos Personales</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Primer Nombre *</label>
                                        <input required name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Segundo Nombre</label>
                                        <input name="second_name" value={formData.second_name} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Primer Apellido *</label>
                                        <input required name="surname" value={formData.surname} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Segundo Apellido</label>
                                        <input name="second_surname" value={formData.second_surname} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                </div>
                            </div>

                            {/* SECCIÓN 2: CONTACTO Y LEGAL */}
                            <div>
                                <h4 className="text-sm uppercase tracking-wide text-gray-500 font-bold mb-4 border-b pb-2">Contacto y Legal</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Completa</label>
                                        <input name="address" value={formData.address} onChange={handleChange} placeholder="Ej: 2/2 Berwick St..." className="w-full p-2 border border-gray-300 rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                        <input name="telephone" value={formData.telephone} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ABN</label>
                                        <input name="abn" value={formData.abn} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded" />
                                    </div>
                                </div>
                            </div>

                            {/* SECCIÓN 3: BANCO (Importante para facturas) */}
                            <div>
                                <h4 className="text-sm uppercase tracking-wide text-gray-500 font-bold mb-4 border-b pb-2">Datos Bancarios</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                                        <input name="bank_name" value={formData.bank_name} onChange={handleChange} placeholder="Ej: CommBank" className="w-full p-2 border border-gray-300 rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                        <input name="account_type" value={formData.account_type} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded" />
                                    </div>
                                    
                                    {/* CAMPO ACCOUNT NAME AÑADIDO */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre en Cuenta</label>
                                        <input name="account_name" value={formData.account_name} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">BSB</label>
                                        <input name="bsb" value={formData.bsb} onChange={handleChange} placeholder="000-000" className="w-full p-2 border border-gray-300 rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Número de Cuenta</label>
                                        <input name="account_number" value={formData.account_number} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded" />
                                    </div>
                                </div>
                            </div>

                            {/* SECCIÓN 4: SISTEMA */}
                            <h4 className="text-sm uppercase tracking-wide text-gray-500 font-bold mb-4 border-b pb-2">Sistema</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tarifa/Hora ($)</label>
                                    <input required type="number" step="0.01" name="hourly_rate" value={formData.hourly_rate} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded font-bold" />
                                </div>
                                
                                {/* CAMPO ULTIMA FACTURA AÑADIDO */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Última Factura (N°)</label>
                                    <input type="number" name="last_invoice" value={formData.last_invoice} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded" title="Número de la última factura generada" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                                    <select name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded bg-white">
                                        <option value="worker">Trabajador</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>
                                
                                {formData.role === 'admin' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
                                        <input required name="pin" maxLength="4" value={formData.pin} onChange={handleChange} className="w-full p-2 border border-yellow-300 bg-yellow-50 rounded" />
                                    </div>
                                )}
                                <div className="flex items-center pt-6">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" name="active" checked={formData.active} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded" />
                                        <span className="text-gray-700 font-medium">Empleado Activo</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100">Cancelar</button>
                                <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 shadow-lg">
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