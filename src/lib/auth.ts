import { createContext, useContext, useEffect, useState, type ReactNode, createElement } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { api, getUserId, getToken } from './api';

/* ─── Types ─── */

export type OrgRole = 'owner' | 'admin' | 'member';

export type Organization = {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Member = {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: OrgRole;
  is_active: boolean;
  created_at: string;
};

export type PermissionRecord = {
  id: string;
  resource: 'agents' | 'knowledgebases' | 'tools' | 'conversations' | string;
  action: 'create' | 'read' | 'update' | 'delete' | string;
};

/* ─── Auth context ─── */

type AuthCtx = {
  org: Organization | null;
  role: OrgRole | null;          // null = user has no org
  loading: boolean;
  permissions: PermissionRecord[];
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  org: null,
  role: null,
  loading: true,
  permissions: [],
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [org, setOrg] = useState<Organization | null>(null);
  const [role, setRole] = useState<OrgRole | null>(null);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!getToken()) {
      setOrg(null);
      setRole(null);
      setPermissions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Try to fetch the org
      try {
        const o = await api<Organization>('/organizations');
        setOrg(o);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
          setOrg(null);
          setRole(null);
          setPermissions([]);
          return;
        }
        throw err;
      }

      // 2. Determine role by attempting GET /organizations/members
      const myId = getUserId();
      try {
        const members = await api<Member[]>('/organizations/members');
        const me = myId ? members.find((m) => m.user_id === myId) : undefined;
        setRole(me?.role ?? 'member');
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('403') || msg.toLowerCase().includes('forbidden') || msg.toLowerCase().includes('permission')) {
          setRole('member');
        } else {
          setRole('member');
        }
      }

      // 3. Fetch permissions catalog (admin/owner only — silently skip on 403)
      try {
        const perms = await api<PermissionRecord[]>('/permissions');
        setPermissions(perms);
      } catch {
        setPermissions([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createElement(AuthContext.Provider, { value: { org, role, loading, permissions, refresh } }, children);
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useCurrentUserId(): string | null {
  return getUserId();
}

/* ─── Route guards ─── */

export function RequireOrg() {
  const { org, loading } = useAuth();
  if (loading) return createElement('div', { style: { padding: 40, color: '#6a6a8a' } }, 'Loading…');
  if (!org) return createElement(Navigate, { to: '/onboarding', replace: true });
  return createElement(Outlet);
}
