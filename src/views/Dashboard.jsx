import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { ScheduleIcon, PunchIcon, InvoiceIcon, UsersIcon, AdminIcon } from '../icons';
import TableView from './TableView';
import PunchView from './PunchView';
import InvoicesView from './InvoicesView';

function MainMenu({ onCardClick, user, onLogout }) {
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const menuOptions = [
        { id: 'tableView', title: 'Ver Tabla', icon: <ScheduleIcon />, role: 'all' },
        { id: 'punchView', title: 'Marcar Asistencia', icon: <PunchIcon />, role: 'all' },
        { id: 'invoicesView', title: 'Mis Facturas', icon: <InvoiceIcon />, role: 'all' },
        { id: 'usersView', title: 'Gestionar Empleados', icon: <UsersIcon />, role: 'admin' },
        { id: 'adminView', title: 'Panel de Admin', icon: <AdminIcon />, role: 'admin' },
    ];

    const userInitials = (user.name.charAt(0) + user.surname.charAt(0)).toUpperCase();

    return (
        <>
            <header className="w-full max-w-2xl mx-auto flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Bienvenido, {user.name}</h1>
                    <p className="text-gray-500">¿Qué te gustaría hacer hoy?</p>
                </div>
                <div 
                    onClick={() => setIsLogoutModalOpen(true)}
                    className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl cursor-pointer hover:bg-indigo-700 transition-colors"
                    title="Cerrar Sesión"
                >
                    {userInitials}
                </div>
            </header>
            <main className="w-full max-w-2xl mx-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                    {menuOptions.map((option) => (
                        (option.role === 'all' || option.role === user.role) && (
                            <Card key={option.id} title={option.title} icon={option.icon} onClick={() => onCardClick(option.id)} />
                        )
                    ))}
                </div>
            </main>
            <Modal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={onLogout}
                title="Cerrar Sesión"
            >
                <p>¿Estás seguro de que quieres cerrar tu sesión?</p>
            </Modal>
        </>
    );
}

function Dashboard() {
    const [currentView, setCurrentView] = useState('home');
    const { currentUser, logout } = useAuth();
    if (!currentUser) return null;

    const renderView = () => {
        switch (currentView) {
            case 'tableView': return <TableView onBack={() => setCurrentView('home')} />;
            case 'punchView': return <PunchView onBack={() => setCurrentView('home')} />;
            case 'invoicesView': return <InvoicesView onBack={() => setCurrentView('home')} />;
            case 'home':
            default:
                return <MainMenu onCardClick={setCurrentView} user={currentUser} onLogout={logout} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4 sm:p-6">
            {renderView()}
        </div>
    );
}

export default Dashboard;