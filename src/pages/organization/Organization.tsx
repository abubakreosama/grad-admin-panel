import { Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import MemberView from './MemberView';
import AdminView from './AdminView';
import './Organization.css';

export default function Organization() {
  const { org, role, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: 40, color: '#6a6a8a' }}>Loading organization…</div>;
  }

  if (!org || !role) {
    return <Navigate to="/onboarding" replace />;
  }

  if (role === 'member') {
    return <MemberView />;
  }

  return <AdminView isOwner={role === 'owner'} />;
}
