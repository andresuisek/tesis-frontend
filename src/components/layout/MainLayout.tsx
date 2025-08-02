'use client';

import Sidebar from './Sidebar';
import Header from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {children}
        </main>
        {/* Footer académico */}
        <footer className="mt-auto p-6 bg-white border-t border-gray-200">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2Ff0451246846a40baae39ad411a7b4867%2Fc5e2557623b347548bfbe225119d3175?format=webp&width=800"
                alt="UISEK Logo"
                className="h-6 w-auto object-contain mr-3"
              />
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">Universidad Internacional SEK</p>
                <p className="text-xs text-gray-600">Proyecto de Tesis - Sistema de Gestión Tributaria</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
