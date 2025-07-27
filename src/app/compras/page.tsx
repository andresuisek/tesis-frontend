'use client';

import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { FormField, Button, Card } from '@/components/ui/FormComponents';

interface CompraFormData {
  rucProveedor: string;
  razonSocialProveedor: string;
  fechaEmision: string;
  tipoComprobante: string;
  numeroComprobante: string;
  subtotal0: number;
  subtotal15: number;
  iva: number;
  total: number;
  rubro: string;
  descripcion: string;
  deducibleImpuestoRenta: boolean;
}

interface CompraRegistrada extends CompraFormData {
  id: string;
  fechaRegistro: string;
}

const tipoComprobanteOptions = [
  { value: 'FACTURA', label: 'Factura' },
  { value: 'LIQUIDACION_COMPRA', label: 'Liquidación de Compra' },
  { value: 'NOTA_CREDITO', label: 'Nota de Crédito' },
  { value: 'NOTA_DEBITO', label: 'Nota de Débito' },
];

const rubrosOptions = [
  { value: 'GASTOS_ADMINISTRATIVOS', label: 'Gastos Administrativos' },
  { value: 'GASTOS_VENTAS', label: 'Gastos de Ventas' },
  { value: 'GASTOS_FINANCIEROS', label: 'Gastos Financieros' },
  { value: 'COSTO_VENTAS', label: 'Costo de Ventas' },
  { value: 'ACTIVOS_FIJOS', label: 'Activos Fijos' },
  { value: 'INVENTARIOS', label: 'Inventarios' },
  { value: 'SERVICIOS_PROFESIONALES', label: 'Servicios Profesionales' },
  { value: 'SUMINISTROS_OFICINA', label: 'Suministros de Oficina' },
  { value: 'SERVICIOS_BASICOS', label: 'Servicios Básicos' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento y Reparaciones' },
  { value: 'COMBUSTIBLES', label: 'Combustibles' },
  { value: 'OTROS', label: 'Otros Gastos' },
];

export default function ComprasPage() {
  const [formData, setFormData] = useState<CompraFormData>({
    rucProveedor: '',
    razonSocialProveedor: '',
    fechaEmision: '',
    tipoComprobante: '',
    numeroComprobante: '',
    subtotal0: 0,
    subtotal15: 0,
    iva: 0,
    total: 0,
    rubro: '',
    descripcion: '',
    deducibleImpuestoRenta: true,
  });

  const [compras, setCompras] = useState<CompraRegistrada[]>([
    {
      id: '1',
      rucProveedor: '1234567890001',
      razonSocialProveedor: 'PROVEEDOR SERVICIOS S.A.',
      fechaEmision: '2025-01-12',
      tipoComprobante: 'FACTURA',
      numeroComprobante: '001-001-000000789',
      subtotal0: 0,
      subtotal15: 500,
      iva: 75,
      total: 575,
      rubro: 'SERVICIOS_PROFESIONALES',
      descripcion: 'Servicios de consultoría legal',
      deducibleImpuestoRenta: true,
      fechaRegistro: '2025-01-12T09:30:00',
    },
    {
      id: '2',
      rucProveedor: '9876543210001',
      razonSocialProveedor: 'SUMINISTROS OFFICE CIA. LTDA.',
      fechaEmision: '2025-01-10',
      tipoComprobante: 'FACTURA',
      numeroComprobante: '002-001-000001234',
      subtotal0: 100,
      subtotal15: 0,
      iva: 0,
      total: 100,
      rubro: 'SUMINISTROS_OFICINA',
      descripcion: 'Compra de papelería y útiles de oficina',
      deducibleImpuestoRenta: true,
      fechaRegistro: '2025-01-10T11:15:00',
    },
  ]);

  const [showForm, setShowForm] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' 
          ? (e.target as HTMLInputElement).checked
          : name.includes('subtotal') || name === 'iva' || name === 'total' 
            ? parseFloat(value) || 0 
            : value
      };

      // Calcular automáticamente IVA y total
      if (name.includes('subtotal')) {
        const iva15 = updated.subtotal15 * 0.15;
        updated.iva = iva15;
        updated.total = updated.subtotal0 + updated.subtotal15 + updated.iva;
      }

      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const nuevaCompra: CompraRegistrada = {
      ...formData,
      id: Date.now().toString(),
      fechaRegistro: new Date().toISOString(),
    };

    setCompras(prev => [nuevaCompra, ...prev]);
    setFormData({
      rucProveedor: '',
      razonSocialProveedor: '',
      fechaEmision: '',
      tipoComprobante: '',
      numeroComprobante: '',
      subtotal0: 0,
      subtotal15: 0,
      iva: 0,
      total: 0,
      rubro: '',
      descripcion: '',
      deducibleImpuestoRenta: true,
    });
    setShowForm(false);
    alert('Compra registrada exitosamente!');
  };

  const totalCompras = compras.reduce((acc, compra) => acc + compra.total, 0);
  const totalIvaCompras = compras.reduce((acc, compra) => acc + compra.iva, 0);
  const comprasDeducibles = compras.filter(c => c.deducibleImpuestoRenta).reduce((acc, compra) => acc + compra.total, 0);

  // Agrupar compras por rubro
  const comprasPorRubro = compras.reduce((acc, compra) => {
    if (!acc[compra.rubro]) {
      acc[compra.rubro] = { total: 0, cantidad: 0 };
    }
    acc[compra.rubro].total += compra.total;
    acc[compra.rubro].cantidad += 1;
    return acc;
  }, {} as Record<string, { total: number; cantidad: number }>);

  return (
    <MainLayout 
      title="Registro de Compras" 
      subtitle="Gestión de facturas de proveedores clasificadas por rubros"
    >
      <div className="space-y-6">
        {/* Resumen de Compras */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Compras</p>
                <p className="text-2xl font-bold text-gray-900">${totalCompras.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">IVA Pagado</p>
                <p className="text-2xl font-bold text-gray-900">${totalIvaCompras.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Gastos Deducibles</p>
                <p className="text-2xl font-bold text-gray-900">${comprasDeducibles.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Resumen por Rubros */}
        <Card title="Resumen por Rubros">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(comprasPorRubro).map(([rubro, datos]) => {
              const rubroLabel = rubrosOptions.find(r => r.value === rubro)?.label || rubro;
              return (
                <div key={rubro} className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 text-sm">{rubroLabel}</h4>
                  <p className="text-lg font-bold text-gray-900">${datos.total.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{datos.cantidad} compra(s)</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Botón para nueva compra */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Lista de Compras</h2>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : 'Nueva Compra'}
          </Button>
        </div>

        {/* Formulario de nueva compra */}
        {showForm && (
          <Card title="Registrar Nueva Compra">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="RUC Proveedor"
                  name="rucProveedor"
                  value={formData.rucProveedor}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej: 1234567890001"
                />

                <FormField
                  label="Razón Social del Proveedor"
                  name="razonSocialProveedor"
                  value={formData.razonSocialProveedor}
                  onChange={handleInputChange}
                  required
                  placeholder="Nombre del proveedor"
                />

                <FormField
                  label="Fecha de Emisión"
                  name="fechaEmision"
                  type="date"
                  value={formData.fechaEmision}
                  onChange={handleInputChange}
                  required
                />

                <FormField
                  label="Tipo de Comprobante"
                  name="tipoComprobante"
                  type="select"
                  value={formData.tipoComprobante}
                  onChange={handleInputChange}
                  options={tipoComprobanteOptions}
                  required
                />

                <FormField
                  label="Número de Comprobante"
                  name="numeroComprobante"
                  value={formData.numeroComprobante}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej: 001-001-000000789"
                />

                <FormField
                  label="Rubro (Para Impuesto a la Renta)"
                  name="rubro"
                  type="select"
                  value={formData.rubro}
                  onChange={handleInputChange}
                  options={rubrosOptions}
                  required
                />

                <FormField
                  label="Subtotal 0% (IVA 0%)"
                  name="subtotal0"
                  type="number"
                  value={formData.subtotal0.toString()}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />

                <FormField
                  label="Subtotal 15% (IVA 15%)"
                  name="subtotal15"
                  type="number"
                  value={formData.subtotal15.toString()}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />

                <FormField
                  label="IVA (Calculado automáticamente)"
                  name="iva"
                  type="number"
                  value={formData.iva.toFixed(2)}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />

                <FormField
                  label="Total (Calculado automáticamente)"
                  name="total"
                  type="number"
                  value={formData.total.toFixed(2)}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>

              <FormField
                label="Descripción"
                name="descripcion"
                type="textarea"
                value={formData.descripcion}
                onChange={handleInputChange}
                placeholder="Descripción del bien o servicio adquirido"
              />

              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="deducibleImpuestoRenta"
                    checked={formData.deducibleImpuestoRenta}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Deducible para Impuesto a la Renta
                  </span>
                </label>
              </div>

              <div className="flex space-x-4 mt-6">
                <Button type="submit" variant="primary">
                  Registrar Compra
                </Button>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Lista de compras */}
        <Card title="Compras Registradas">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comprobante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rubro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subtotal 0%
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subtotal 15%
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IVA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deducible
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {compras.map((compra) => (
                  <tr key={compra.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(compra.fechaEmision).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{compra.razonSocialProveedor}</div>
                        <div className="text-gray-500">{compra.rucProveedor}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{compra.tipoComprobante}</div>
                        <div className="text-gray-500">{compra.numeroComprobante}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rubrosOptions.find(r => r.value === compra.rubro)?.label || compra.rubro}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${compra.subtotal0.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${compra.subtotal15.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${compra.iva.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${compra.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        compra.deducibleImpuestoRenta 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {compra.deducibleImpuestoRenta ? 'Sí' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Información sobre rubros */}
        <Card title="Información sobre Rubros">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">Propósito de la clasificación por rubros:</h4>
            <p className="text-sm text-yellow-800 mb-3">
              La clasificación por rubros es esencial para la declaración anual del Impuesto a la Renta, 
              ya que permite identificar los gastos deducibles por categoría y calcular correctamente la base imponible.
            </p>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li>Los gastos administrativos y de ventas son deducibles si están relacionados con la actividad económica</li>
              <li>Los activos fijos se deprecian según las tablas del SRI</li>
              <li>Los gastos personales no son deducibles para personas naturales obligadas a llevar contabilidad</li>
              <li>Mantener respaldos documentales de todas las compras es obligatorio</li>
            </ul>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
