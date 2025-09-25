import { useAuth } from './hooks/useAuth';
import LoginView from './views/LoginView';
import Dashboard from './views/Dashboard';

function App() {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><p>Cargando...</p></div>;
  }
  return currentUser ? <Dashboard /> : <LoginView />;
}
export default App;
