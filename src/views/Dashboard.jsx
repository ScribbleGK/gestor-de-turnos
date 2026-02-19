import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { ScheduleIcon, InvoiceIcon, AdminIcon } from '../icons'; 
import TableView from './TableView';
import InvoicesView from './InvoicesView';
import AdminPanelView from './AdminPanelView'; 

function MainMenu({ onCardClick, user, onLogout }) {
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    const menuOptions = [
        { id: 'tableView', title: 'Ver Horarios', icon: <ScheduleIcon />, role: 'all' },
        { id: 'invoicesView', title: 'Mis Facturas', icon: <InvoiceIcon />, role: 'all' },
        { id: 'adminView', title: 'Panel de Admin', icon: <AdminIcon />, role: 'admin' },
    ];

    // Calculamos qué opciones son visibles para ajustar el diseño dinámicamente
    const visibleOptions = menuOptions.filter(o => o.role === 'all' || o.role === user.role);

    const userInitials = user.name ? (user.name.charAt(0) + user.surname.charAt(0)).toUpperCase() : '??';

    return (
        <div className="w-full flex flex-col items-center animate-fade-in-up">
            {/* Header Rediseñado tipo "Premium Card" */}
            <header className="w-full max-w-5xl bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-10 flex justify-between items-center transition-all">
                <div className="flex items-center gap-5">
                    {/* Avatar a la izquierda para mejor estética */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-lg">
                        {userInitials}
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                            Hola, {user.name}
                        </h1>
                        <p className="text-indigo-600 font-bold text-sm sm:text-base mt-0.5">
                            {user.role === 'admin' ? '⭐ Modo Administrador' : '💼 Portal del Empleado'}
                        </p>
                    </div>
                </div>
                
                <button 
                    onClick={() => setIsLogoutModalOpen(true)}
                    className="hidden sm:flex px-5 py-2.5 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all items-center gap-2"
                >
                    Cerrar Sesión
                </button>
                {/* Botón de salir móvil */}
                <button 
                    onClick={() => setIsLogoutModalOpen(true)}
                    className="sm:hidden p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                </button>
            </header>

            {/* Grid Dinámico: Si son 2, se centra; si son 3, ocupa todo */}
            <main className={`w-full ${visibleOptions.length === 2 ? 'max-w-3xl' : 'max-w-5xl'}`}>
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 ${visibleOptions.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                    {visibleOptions.map((option) => (
                        <div key={option.id} className="transform transition-transform hover:-translate-y-0.5 hover:shadow-2xs rounded-2xl">
                            <Card 
                                title={option.title} 
                                icon={option.icon} 
                                onClick={() => onCardClick(option.id)} 
                            />
                        </div>
                    ))}
                </div>
            </main>

            <Modal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={onLogout}
                title="Cerrar Sesión"
            >
                <p className="text-gray-600">¿Estás seguro de que deseas salir del sistema de ZARA Cleaners?</p>
            </Modal>
        </div>
    );
}

function Dashboard() {
    const [currentView, setCurrentView] = useState('home');
    const { currentUser, logout } = useAuth();

    if (!currentUser) return null;

    const renderView = () => {
        switch (currentView) {
            case 'tableView': 
                return <TableView onBack={() => setCurrentView('home')} />;
            case 'invoicesView': 
                return <InvoicesView onBack={() => setCurrentView('home')} />;
            case 'adminView': 
                if (currentUser.role !== 'admin') {
                    return <MainMenu onCardClick={setCurrentView} user={currentUser} onLogout={logout} />;
                }
                return <AdminPanelView onBack={() => setCurrentView('home')} />;
            case 'home':
            default:
                return <MainMenu onCardClick={setCurrentView} user={currentUser} onLogout={logout} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 sm:p-8 transition-all">
            {renderView()}
        </div>
    );
}

export default Dashboard;