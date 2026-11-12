import { createContext, useContext } from 'react';

export interface AuthApi {
  signOut: () => void;
}
export const AuthCtx = createContext<AuthApi | null>(null);

export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth cần AuthGate');
  return v;
}
