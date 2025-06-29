import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 mb-16">
          {/* Título Principal */}
          <div className="space-y-4">
            <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent animate-pulse">
              Tesis de Grado
            </h1>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-800 dark:text-gray-200">
              Andres Ontiveros
            </h2>
            <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
          </div>

          {/* Descripción */}
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Proyecto Frontend desarrollado con Next.js 15, React 19 y TypeScript
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Card Tecnologías */}
          <div className="group bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                Tecnologías
              </h3>
              <ul className="text-gray-600 dark:text-gray-300 space-y-2">
                <li>• Next.js 15</li>
                <li>• React 19</li>
                <li>• TypeScript 5</li>
                <li>• Tailwind CSS 4</li>
              </ul>
            </div>
          </div>

          {/* Card Características */}
          <div className="group bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                Características
              </h3>
              <ul className="text-gray-600 dark:text-gray-300 space-y-2">
                <li>• App Router</li>
                <li>• Server Components</li>
                <li>• Responsive Design</li>
                <li>• Dark Mode</li>
              </ul>
            </div>
          </div>

          {/* Card Estado */}
          <div className="group bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                Estado
              </h3>
              <div className="space-y-2">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  ✅ Funcional
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  Listo para desarrollo
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center space-y-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <span className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
                Comenzar Desarrollo
              </span>
            </button>

            <a
              href="https://github.com/andresuisek/tesis-frontend"
              target="_blank"
              rel="noopener noreferrer"
              className="group border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-semibold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <span className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 group-hover:scale-110 transition-transform duration-300"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Ver en GitHub
              </span>
            </a>
          </div>

          {/* Información adicional */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-2xl border border-blue-100 dark:border-gray-600">
            <p className="text-gray-700 dark:text-gray-300">
              <span className="font-semibold">💡 Tip:</span> Modifica el archivo{" "}
              <code className="bg-blue-100 dark:bg-gray-600 px-2 py-1 rounded font-mono text-sm">
                src/app/page.tsx
              </code>{" "}
              para personalizar esta página según las necesidades de tu tesis.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-600 dark:text-gray-400">
            <p>
              © 2025 Tesis de Andres Ontiveros - Desarrollado con ❤️ usando
              Next.js
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
