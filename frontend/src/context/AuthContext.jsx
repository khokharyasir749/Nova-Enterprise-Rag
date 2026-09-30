import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { checkHealth, fetchCompanies } from '../services/api';
import { DEFAULT_USERS_BY_ROLE } from '../constants';

const AuthContext = createContext();

const STORAGE_KEY = 'rag_tenant_session';

export function AuthProvider({ children }) {
  // Read saved session
  const [session, setSession] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading session from localStorage:', e);
    }
    return null;
  });

  const [tenantId, setTenantId] = useState(session ? session.tenantId : '');
  const [companyName, setCompanyName] = useState(session ? session.companyName : '');
  const [logoUrl, setLogoUrl] = useState(session?.logoUrl || '');
  const [isAuthenticated, setIsAuthenticated] = useState(!!session);

  const [userRoles, setUserRoles] = useState(session?.role ? [session.role] : ['admin']);
  const [userId, setUserId] = useState(() => {
    if (session?.role && DEFAULT_USERS_BY_ROLE[session.role]) {
      return DEFAULT_USERS_BY_ROLE[session.role];
    }
    return 'user_admin_01';
  });
  const [backendHealth, setBackendHealth] = useState({ status: 'checking', qdrant: 'unknown' });
  const [toasts, setToasts] = useState([]);
  const [registeredCompanies, setRegisteredCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Toast notification helper
  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Poll backend health
  const refreshHealth = useCallback(async () => {
    const health = await checkHealth();
    setBackendHealth(health);
  }, []);

  useEffect(() => {
    refreshHealth();
    const interval = setInterval(refreshHealth, 10000);
    return () => clearInterval(interval);
  }, [refreshHealth]);

  // Load companies
  const loadCompanies = useCallback(async () => {
    setLoadingCompanies(true);
    try {
      const data = await fetchCompanies();
      setRegisteredCompanies(data.companies || []);
    } catch (e) {
      console.error('Failed to load companies:', e);
    } finally {
      setLoadingCompanies(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // Synchronize logoUrl if registeredCompanies update provides new logo
  useEffect(() => {
    if (tenantId && registeredCompanies.length > 0) {
      const current = registeredCompanies.find(
        (c) => c.tenant_id?.toLowerCase() === tenantId.toLowerCase()
      );
      if (current && current.logo_url && current.logo_url !== logoUrl) {
        setLogoUrl(current.logo_url);
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            parsed.logoUrl = current.logo_url;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }, [tenantId, registeredCompanies, logoUrl]);

  // Workspace Login (Unlock Dashboard with Verified Role & Logo)
  const loginWorkspace = useCallback((tenant_id, name, role = 'admin', logo_url = '') => {
    const cleanRole = (role || 'admin').toLowerCase().trim();
    const cleanLogo = (logo_url || '').trim();
    const sessionData = {
      tenantId: tenant_id,
      companyName: name || tenant_id,
      role: cleanRole,
      logoUrl: cleanLogo,
      unlockedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    } catch (e) {
      console.error('Failed to save session to localStorage:', e);
    }
    setTenantId(tenant_id);
    setCompanyName(name || tenant_id);
    setLogoUrl(cleanLogo);
    setUserRoles([cleanRole]);
    if (DEFAULT_USERS_BY_ROLE[cleanRole]) {
      setUserId(DEFAULT_USERS_BY_ROLE[cleanRole]);
    }
    setIsAuthenticated(true);
    addToast(`Unlocked workspace: ${name || tenant_id} as ${cleanRole.toUpperCase()}`, 'success');
  }, [addToast]);

  // Workspace Logout (Lock Dashboard / Switch Company)
  const logoutWorkspace = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear session from localStorage:', e);
    }
    setIsAuthenticated(false);
    setTenantId('');
    setCompanyName('');
    setLogoUrl('');
    setUserRoles(['admin']);
    loadCompanies();
    addToast('Session locked. Enter your role access key to unlock a workspace.', 'info');
  }, [addToast, loadCompanies]);

  // Single-select role switcher: only ONE role is active at a time
  const setActiveRole = useCallback((role) => {
    const cleanRole = role.toLowerCase().trim();
    setUserRoles([cleanRole]);
    
    // Automatically adjust default user identifier if in default format
    setUserId((prevUser) => {
      const isDefaultUser = Object.values(DEFAULT_USERS_BY_ROLE).includes(prevUser) || prevUser.startsWith('user_');
      if (isDefaultUser && DEFAULT_USERS_BY_ROLE[cleanRole]) {
        return DEFAULT_USERS_BY_ROLE[cleanRole];
      }
      return prevUser;
    });

    addToast(`Active role switched to ${cleanRole.toUpperCase()}`, 'info');
  }, [addToast]);

  // Backward compatibility alias for single-select role
  const toggleRole = useCallback((role) => {
    setActiveRole(role);
  }, [setActiveRole]);

  const activeRole = userRoles[0] || 'admin';

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        tenantId,
        setTenantId,
        companyName,
        tenantName: companyName,
        workspaceName: companyName,
        logoUrl,
        setLogoUrl,
        loginWorkspace,
        logoutWorkspace,
        registeredCompanies,
        loadingCompanies,
        loadCompanies,
        userRoles,
        setUserRoles,
        activeRole,
        setActiveRole,
        toggleRole,
        userId,
        setUserId,
        backendHealth,
        refreshHealth,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
