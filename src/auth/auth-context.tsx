import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type Account, type AuthResult, type Role } from '@/lib/api';

const TOKEN_KEY = 'landconnect.accessToken';
type AuthContextValue = {
  user: Account | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(input: { name: string; email: string; password: string; role: Role }): Promise<void>;
  signOut(): Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) return;
        const profile = await api<{ user: Account }>('/api/auth/me', { token });
        if (active) setUser(profile.user);
      } catch {
        // Expired tokens or unavailable servers require signing in again.
        if (active) await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      } finally {
        if (active) setLoading(false);
      }
    }
    void restore();
    return () => { active = false; };
  }, []);

  const saveSession = useCallback(async (result: AuthResult) => {
    await SecureStore.setItemAsync(TOKEN_KEY, result.accessToken);
    setUser(result.user);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await api<AuthResult>('/api/auth/login', { method: 'POST', body: { email, password } });
    await saveSession(result);
  }, [saveSession]);

  const signUp = useCallback(async (input: { name: string; email: string; password: string; role: Role }) => {
    const result = await api<AuthResult>('/api/auth/register', { method: 'POST', body: input });
    await saveSession(result);
  }, [saveSession]);

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signUp, signOut }), [user, loading, signIn, signUp, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
