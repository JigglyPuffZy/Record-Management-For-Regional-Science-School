import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from '../components/ui/Spinner.jsx';

/**
 * Gates a subtree of routes to a signed-in user of the given role. A
 * student who tries to open a teacher URL (or vice versa) is redirected to
 * their own dashboard rather than shown the other portal.
 */
export default function ProtectedRoute({ role }) {
  const { user, initializing, dataReady } = useAuth();

  if (initializing || !dataReady) return <Spinner className="min-h-screen" label="Loading records..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'} replace />;
  }
  return <Outlet />;
}
