import { Outlet } from 'react-router-dom';
import TopBar from './TopBar.jsx';
import DockNav from './DockNav.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AppLayout() {
  const { syncError } = useAuth();
  return (
    <div className="app-shell min-h-screen">
      <TopBar />
      <main className="dock-safe-area mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {syncError && <p role="status" className="no-print rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Live refresh paused: {syncError} Retrying automatically.</p>}
        <Outlet />
      </main>
      <DockNav />
    </div>
  );
}
