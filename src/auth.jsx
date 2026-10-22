import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, resetStorageConfig } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/auth/me')
      .then((d) => { setUser(d.user); setAccount(d.account); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (mode, fields) => {
    const d = await api(`/auth/${mode}`, { method: 'POST', body: fields });
    resetStorageConfig();
    setUser(d.user);
    setAccount(d.account);
  }, []);

  const signOut = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    resetStorageConfig();
    setUser(null);
    setAccount(null);
  }, []);

  const refreshAccount = useCallback(async () => {
    const d = await api('/auth/me');
    setAccount(d.account);
    return d.account;
  }, []);

  const value = useMemo(
    () => ({ user, setUser, account, loading, signIn, signOut, setAccount, refreshAccount }),
    [user, account, loading, signIn, signOut, refreshAccount],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
