import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';

import * as authService from '../services/authService';

type AuthContextValue = {
  user: User | null;
  isBootstrapping: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((nextUser) => {
      setUser(nextUser);
      setIsBootstrapping(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isBootstrapping,
      signIn: async (email: string, password: string) => {
        await authService.signIn(email, password);
      },
      signUp: async (email: string, password: string) => {
        await authService.signUp(email, password);
      },
      signOut: async () => {
        await authService.signOut();
      },
    }),
    [isBootstrapping, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthStore = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthStore must be used within an AuthProvider.');
  }

  return context;
};
