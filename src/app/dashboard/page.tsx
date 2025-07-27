import MainLayout from '@/components/layout/MainLayout';
import BarChart from '@/components/charts/BarChart';
import PieChart from '@/components/charts/PieChart';

export default function DashboardPage() {
  return (
    <MainLayout 
      title="Dashboard" 
      subtitle="Resumen general del sistema de gestión tributaria"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Tarjeta: Total Ventas */}
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Ventas</p>
              <p className="text-2xl font-bold text-gray-900">$24,532.00</p>
            </div>
          </div>
        </div>

        {/* Tarjeta: Retenciones */}
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Retenciones</p>
              <p className="text-2xl font-bold text-gray-900">$1,234.56</p>
            </div>
          </div>
        </div>

        {/* Tarjeta: Compras */}
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Compras</p>
              <p className="text-2xl font-bold text-gray-900">$18,456.00</p>
            </div>
          </div>
        </div>

        {/* Tarjeta: IVA por Pagar */}
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">IVA por Pagar</p>
              <p className="text-2xl font-bold text-gray-900">$3,678.90</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Ventas Mensuales */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventas Mensuales</h3>
          <BarChart
            data={[
              { label: 'Ene', value: 18500, color: '#3b82f6' },
              { label: 'Feb', value: 22300, color: '#3b82f6' },
              { label: 'Mar', value: 24532, color: '#1d4ed8' },
              { label: 'Abr', value: 19800, color: '#3b82f6' },
              { label: 'May', value: 26700, color: '#3b82f6' },
              { label: 'Jun', value: 21400, color: '#3b82f6' },
            ]}
          />
        </div>

        {/* Distribución de Gastos */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Gastos</h3>
          <PieChart
            data={[
              { label: 'Servicios Profesionales', value: 8500, color: '#3b82f6' },
              { label: 'Gastos Administrativos', value: 4200, color: '#10b981' },
              { label: 'Suministros de Oficina', value: 2800, color: '#f59e0b' },
              { label: 'Servicios Básicos', value: 1900, color: '#ef4444' },
              { label: 'Otros', value: 1056, color: '#8b5cf6' },
            ]}
            size={220}
          />
        </div>
      </div>

      {/* Obligaciones Tributarias Próximas */}
      <div className="mt-8">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Obligaciones Tributarias Próximas</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Obligación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Límite
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Declaración IVA Mensual
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    28 de Enero, 2025
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Pendiente
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900">Procesar</button>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Declaración Semestral
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    31 de Enero, 2025
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Completado
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900">Ver</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
