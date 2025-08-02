'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  email: string;
  nombreApellido?: string;
  ruc?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    try {
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      const userEmail = localStorage.getItem('userEmail');
      const userData = localStorage.getItem('userData');

      if (isAuthenticated && userEmail) {
        const parsedUserData = userData ? JSON.parse(userData) : {};
        setUser({
          email: userEmail,
          nombreApellido: parsedUserData.nombreApellido,
          ruc: parsedUserData.ruc,
        });
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (email: string, userData?: any) => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userEmail', email);
    if (userData) {
      localStorage.setItem('userData', JSON.stringify(userData));
    }
    
    // Set cookie for middleware
    document.cookie = 'isAuthenticated=true; path=/; max-age=86400'; // 24 hours
    
    setUser({
      email,
      nombreApellido: userData?.nombreApellido,
      ruc: userData?.ruc,
    });
  };

  const logout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userData');
    
    // Remove cookie
    document.cookie = 'isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    setUser(null);
    router.push('/login');
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    checkAuth,
  };
}
