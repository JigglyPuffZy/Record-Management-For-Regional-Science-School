import { Outlet } from 'react-router-dom';
import TopBar from './TopBar.jsx';
import DockNav from './DockNav.jsx';

export default function AppLayout() {
  return (
    <div className="app-shell min-h-screen">
      <TopBar />
      <main className="dock-safe-area mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <DockNav />
    </div>
  );
}
