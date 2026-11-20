import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { dashboardFor } from '../lib/api.js';

/**
 * Gates a subtree of routes to a signed-in user of the given role. A
 * student who tries to open a teacher URL (or vice versa) is redirected to
 * their own dashboard rather than shown the other portal.
 */
export default function ProtectedRoute({ role }) {
  const { user, initializing, dataReady, loadError, reloadData, logout } = useAuth();

  if (initializing) return <Spinner className="min-h-screen" label="Loading records..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={dashboardFor(user.role)} replace />;
  }
  if (loadError) return <div className="mx-auto max-w-lg space-y-4 p-8"><p role="alert">{loadError}</p><button onClick={reloadData} className="mr-4 underline">Retry</button><button onClick={logout} className="underline">Sign out</button></div>;
  if (!dataReady) return <Spinner className="min-h-screen" label="Loading records..." />;
  return <Outlet />;
}
