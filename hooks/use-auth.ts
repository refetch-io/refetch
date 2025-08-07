import { useState, useEffect } from 'react';
import { account } from '@/lib/appwrite';
import { Models } from 'appwrite';

interface User {
  $id: string;
  name: string;
  email: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    checkAuth();
  }, []);

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

  return {
    user,
    loading,
    getUserDisplayName,
    logout,
    refreshUser,
    isAuthenticated: !!user
  };
} 