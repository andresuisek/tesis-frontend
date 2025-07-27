'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir automáticamente al dashboard
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="sri-header inline-block p-6 rounded-lg">
          <div className="bg-white text-blue-600 font-bold text-3xl px-4 py-2 rounded inline-block">
            SRI
          </div>
          <span className="ml-3 text-white text-xl font-medium">Digital</span>
        </div>
        <p className="mt-4 text-gray-600">Cargando sistema de gestión tributaria...</p>
        <div className="mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
