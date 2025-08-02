'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Para demo: siempre redirigir al login
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto w-32 h-24 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-2xl border-2 border-gray-100">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2Ff0451246846a40baae39ad411a7b4867%2Fc5e2557623b347548bfbe225119d3175?format=webp&width=800"
            alt="UISEK Logo"
            className="h-16 w-auto object-contain"
          />
        </div>
        <h1 className="text-white text-2xl font-bold mb-2">Sistema Tributario Digital</h1>
        <p className="text-blue-100 mb-6">Cargando aplicación...</p>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </div>
    </div>
  );
}
