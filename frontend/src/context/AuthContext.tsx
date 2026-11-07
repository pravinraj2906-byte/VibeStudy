import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api/client';
import { 
  signInWithGoogle, 
  loginFirebaseEmail, 
  registerFirebaseEmail, 
  resetFirebasePassword, 
  logoutFirebase,
  isFirebaseConfigured 
} from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isFirebaseReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('proofforge_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('proofforge_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState<boolean>(isFirebaseConfigured());

  useEffect(() => {
    setIsFirebaseReady(isFirebaseConfigured());
    const initAuth = async () => {
      const storedToken = localStorage.getItem('proofforge_token');
      if (storedToken) {
        try {
          const profile = await api.getMe();
          setUser(profile);
          localStorage.setItem('proofforge_user', JSON.stringify(profile));
        } catch {
          localStorage.removeItem('proofforge_token');
          localStorage.removeItem('proofforge_user');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const setSession = (accessToken: string, userProfile: User) => {
    setToken(accessToken);
    setUser(userProfile);
    localStorage.setItem('proofforge_token', accessToken);
    localStorage.setItem('proofforge_user', JSON.stringify(userProfile));
  };

  const login = async (email: string, password: string) => {
    if (isFirebaseReady) {
      try {
        const { idToken } = await loginFirebaseEmail(email, password);
        const res = await api.firebaseLogin(idToken);
        setSession(res.access_token, res.user);
        return;
      } catch (err: any) {
        // If Firebase login fails, fallback to local database verification
        console.warn('Firebase login failed, trying local credentials:', err.message);
      }
    }
    const res = await api.login({ email, password });
    setSession(res.access_token, res.user);
  };

  const register = async (email: string, password: string, fullName?: string) => {
    if (isFirebaseReady) {
      try {
        const { idToken } = await registerFirebaseEmail(email, password);
        const res = await api.firebaseLogin(idToken);
        setSession(res.access_token, res.user);
        return;
      } catch (err: any) {
        console.warn('Firebase register failed, trying local registration:', err.message);
      }
    }
    const res = await api.register({ email, password, full_name: fullName });
    setSession(res.access_token, res.user);
  };

  const loginGoogle = async () => {
    const { idToken } = await signInWithGoogle();
    const res = await api.firebaseLogin(idToken);
    setSession(res.access_token, res.user);
  };

  const resetPassword = async (email: string) => {
    if (isFirebaseReady) {
      await resetFirebasePassword(email);
    } else {
      throw new Error('Password reset requires Firebase Authentication to be configured.');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('proofforge_token');
    localStorage.removeItem('proofforge_user');
    logoutFirebase().catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isLoading, 
      isFirebaseReady, 
      login, 
      register, 
      loginWithGoogle: loginGoogle, 
      resetPassword, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
