'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AuthCheckProps {
  children: React.ReactNode;
}

export default function AuthCheck({ children }: AuthCheckProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      try {
        const authStatus = localStorage.getItem('isAuthenticated');
        const userEmail = localStorage.getItem('userEmail');
        
        console.log('Auth status:', authStatus);
        console.log('User email:', userEmail);
        
        if (authStatus === 'true' && userEmail) {
          setIsAuthenticated(true);
          // Asegurar que la cookie esté establecida
          document.cookie = 'isAuthenticated=true; path=/; max-age=86400; secure=false; samesite=lax';
        } else {
          setIsAuthenticated(false);
          router.push('/login');
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAuthenticated(false);
        router.push('/login');
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mb-4 shadow-lg">
            <div className="text-white font-bold text-lg">
              SoftaxA
            </div>
          </div>
          <p className="text-gray-600 mb-4">Verificando autenticación...</p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // El router.push ya se encargará de la redirección
  }

  return <>{children}</>;
}
