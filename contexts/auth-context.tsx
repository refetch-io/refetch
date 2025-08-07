"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { account } from '@/lib/appwrite';

interface User {
  $id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  getUserDisplayName: () => string | null;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await account.get();
      setUser({
        $id: currentUser.$id,
        name: currentUser.name || '',
        email: currentUser.email || ''
      });
    } catch (error) {
      // User is not authenticated
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const getUserDisplayName = () => {
    if (!user) return null;
    
    if (user.name && user.name.trim()) {
      return user.name;
    }
    
    if (user.email && user.email.trim()) {
      return user.email;
    }
    
    return 'Your account';
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, clear the user state
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await account.get();
      setUser({
        $id: currentUser.$id,
        name: currentUser.name || '',
        email: currentUser.email || ''
      });
    } catch (error) {
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    getUserDisplayName,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
