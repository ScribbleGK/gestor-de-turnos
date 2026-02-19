import { useState } from 'react';
import Card from '../components/Card';
import { BackIcon, ScheduleIcon, InvoiceIcon, SettingsIcon, LogIcon, UsersIcon } from '../icons'; // Asegúrate de tener estos iconos
import TableEditorView from './admin/TableEditorView';
import EmployeesManagerView from './admin/EmployeesManagerView';
import GlobalInvoicesView from './admin/GlobalInvoicesView';
import InvoiceConfigView from './admin/InvoiceConfigView';
import SystemLogsView from './admin/SystemLogsView';

function AdminPanelView({ onBack }) {
    const [subView, setSubView] = useState('menu');

    // CONFIGURACIÓN DEL NUEVO MENÚ ADMIN
    const adminOptions = [
        { 
            id: 'editor_tabla', 
            title: 'Editor de Tabla', 
            icon: <ScheduleIcon />, 
            description: 'Asignar horas y turnos manualmente' 
        },
        { 
            id: 'gestor_empleados',
            title: 'Gestor de Empleados', 
            icon: <UsersIcon />, 
            description: 'Añadir, editar o desactivar personal' 
        },
        { 
            id: 'ver_facturas', 
            title: 'Ver Facturas Globales', 
            icon: <InvoiceIcon />, 
            description: 'Descargar facturas de cualquier empleado' 
        },
        { 
            id: 'config_factura', 
            title: 'Configuración Factura', 
            icon: <SettingsIcon />, 
            description: 'Editar datos de la empresa y tarifas' 
        },
        { 
            id: 'logs_sistema', 
            title: 'Logs del Sistema', 
            icon: <LogIcon />, 
            description: 'Historial de cambios y auditoría' 
        }
    ];

    const renderSubView = () => {
        switch(subView) {
            case 'editor_tabla': 
                return <TableEditorView onBack={() => setSubView('menu')} />;
            case 'gestor_empleados': 
                return <EmployeesManagerView onBack={() => setSubView('menu')} />;
            case 'ver_facturas': 
                return <GlobalInvoicesView onBack={() => setSubView('menu')} />;
            case 'config_factura': 
                return <InvoiceConfigView onBack={() => setSubView('menu')} />;
            case 'logs_sistema': 
                return <SystemLogsView onBack={() => setSubView('menu')} />;
            default:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {adminOptions.map(opt => (
                            <div 
                                key={opt.id} 
                                onClick={() => setSubView(opt.id)}
                                className="bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col items-center text-center group"
                            >
                                <div className="text-indigo-600 mb-4 transform group-hover:scale-110 transition-transform">
                                    {opt.icon}
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2">{opt.title}</h3>
                                <p className="text-sm text-gray-500">{opt.description}</p>
                            </div>
                        ))}
                    </div>
                );
        }
    };

    return (
        <div className="w-full max-w-[95%] mx-auto">
            <header className="flex items-center mb-8">
                <button 
                    onClick={() => subView === 'menu' ? onBack() : setSubView('menu')} 
                    className="p-2 rounded-full hover:bg-gray-200 mr-4 transition-colors"
                >
                    <BackIcon />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                        {subView === 'menu' ? 'Panel de Administración' : 'Volver al Menú Admin'}
                    </h2>
                    {subView === 'menu' && <p className="text-gray-500">Gestión centralizada del sistema</p>}
                </div>
            </header>

            <main>
                {renderSubView()}
            </main>
        </div>
    );
}

export default AdminPanelView;