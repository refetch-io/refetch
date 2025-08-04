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

  return {
    user,
    loading,
    getUserDisplayName,
    isAuthenticated: !!user
  };
} 