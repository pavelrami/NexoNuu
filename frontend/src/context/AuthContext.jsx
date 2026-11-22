import { createContext, useContext, useEffect, useState } from 'react';
import { authMe, login as apiLogin, logout as apiLogout } from '../api.js';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    authMe().then((data) => { if (active) setUser(data.user); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    // Al volver a la pestaña se consultan de nuevo los roles: si la administración aprobó
    // la institución, el menú cambia sin tener que cerrar sesión.
    const alVolver = () => { if (document.visibilityState === 'visible') authMe().then((d) => { if (active) setUser(d.user); }).catch(() => {}); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { active = false; document.removeEventListener('visibilitychange', alVolver); };
  }, []);
  const recargar = async () => { const d = await authMe().catch(() => ({ user: null })); setUser(d.user); return d.user; };
  const login = async (correo, password) => {
    const data = await apiLogin(correo, password);
    setUser(data.user);
    return data.user;
  };
  const logout = async () => { await apiLogout(); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, login, logout, recargar }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider no encontrado');
  return value;
}
