'use client';

import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { FormField, Button, Card } from '@/components/ui/FormComponents';

interface VentaFormData {
  rucCliente: string;
  razonSocial: string;
  fechaEmision: string;
  comprobante: string;
  numeroComprobante: string;
  identificacionReceptor: string;
  subtotal0: number;
  subtotal8: number;
  subtotal15: number;
  iva: number;
  total: number;
}

interface VentaRegistrada extends VentaFormData {
  id: string;
  fechaRegistro: string;
}

const tipoComprobanteOptions = [
  { value: 'FACTURA', label: 'Factura' },
  { value: 'NOTA_VENTA', label: 'Nota de Venta' },
  { value: 'LIQUIDACION_COMPRA', label: 'Liquidación de Compra' },
];

export default function VentasPage() {
  const [formData, setFormData] = useState<VentaFormData>({
    rucCliente: '',
    razonSocial: '',
    fechaEmision: '',
    comprobante: '',
    numeroComprobante: '',
    identificacionReceptor: '',
    subtotal0: 0,
    subtotal8: 0,
    subtotal15: 0,
    iva: 0,
    total: 0,
  });

  const [ventas, setVentas] = useState<VentaRegistrada[]>([
    {
      id: '1',
      rucCliente: '0962428348001',
      razonSocial: 'ONTIVEROS TERAN ANDRES ALEJANDRO',
      fechaEmision: '2025-01-15',
      comprobante: 'FACTURA',
      numeroComprobante: '001-001-000000123',
      identificacionReceptor: '1234567890',
      subtotal0: 0,
      subtotal8: 0,
      subtotal15: 1000,
      iva: 150,
      total: 1150,
      fechaRegistro: '2025-01-15T10:30:00',
    },
  ]);

  const [showForm, setShowForm] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: name.includes('subtotal') || name === 'iva' || name === 'total' ? parseFloat(value) || 0 : value
      };

      // Calcular automáticamente IVA y total
      if (name.includes('subtotal')) {
        const iva8 = updated.subtotal8 * 0.08;
        const iva15 = updated.subtotal15 * 0.15;
        updated.iva = iva8 + iva15;
        updated.total = updated.subtotal0 + updated.subtotal8 + updated.subtotal15 + updated.iva;
      }

      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const nuevaVenta: VentaRegistrada = {
      ...formData,
      id: Date.now().toString(),
      fechaRegistro: new Date().toISOString(),
    };

    setVentas(prev => [nuevaVenta, ...prev]);
    setFormData({
      rucCliente: '',
      razonSocial: '',
      fechaEmision: '',
      comprobante: '',
      numeroComprobante: '',
      identificacionReceptor: '',
      subtotal0: 0,
      subtotal8: 0,
      subtotal15: 0,
      iva: 0,
      total: 0,
    });
    setShowForm(false);
    alert('Venta registrada exitosamente!');
  };

  const totalVentas = ventas.reduce((acc, venta) => acc + venta.total, 0);
  const totalIva = ventas.reduce((acc, venta) => acc + venta.iva, 0);

  return (
    <MainLayout 
      title="Registro de Ventas" 
      subtitle="Gestión de facturas y documentos de venta"
    >
      <div className="space-y-6">
        {/* Resumen de Ventas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Ventas</p>
                <p className="text-2xl font-bold text-gray-900">${totalVentas.toFixed(2)}</p>
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
                <p className="text-sm font-medium text-gray-600">Total IVA</p>
                <p className="text-2xl font-bold text-gray-900">${totalIva.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Facturas</p>
                <p className="text-2xl font-bold text-gray-900">{ventas.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Botón para nueva venta */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Lista de Ventas</h2>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : 'Nueva Venta'}
          </Button>
        </div>

        {/* Formulario de nueva venta */}
        {showForm && (
          <Card title="Registrar Nueva Venta">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="RUC Cliente"
                  name="rucCliente"
                  value={formData.rucCliente}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej: 0962428348001"
                />

                <FormField
                  label="Razón Social (A quien factura)"
                  name="razonSocial"
                  value={formData.razonSocial}
                  onChange={handleInputChange}
                  required
                  placeholder="Nombre del cliente"
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
                  name="comprobante"
                  type="select"
                  value={formData.comprobante}
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
                  placeholder="Ej: 001-001-000000123"
                />

                <FormField
                  label="Identificación del Receptor"
                  name="identificacionReceptor"
                  value={formData.identificacionReceptor}
                  onChange={handleInputChange}
                  required
                  placeholder="Cédula o RUC del cliente"
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
                  label="Subtotal 8% (IVA 8%)"
                  name="subtotal8"
                  type="number"
                  value={formData.subtotal8.toString()}
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

              <div className="flex space-x-4 mt-6">
                <Button type="submit" variant="primary">
                  Registrar Venta
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

        {/* Lista de ventas */}
        <Card title="Ventas Registradas">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comprobante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subtotal 0%
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subtotal 8%
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ventas.map((venta) => (
                  <tr key={venta.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(venta.fechaEmision).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{venta.razonSocial}</div>
                        <div className="text-gray-500">{venta.rucCliente}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{venta.comprobante}</div>
                        <div className="text-gray-500">{venta.numeroComprobante}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${venta.subtotal0.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${venta.subtotal8.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${venta.subtotal15.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${venta.iva.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${venta.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Información sobre obtención de datos del SRI */}
        <Card title="Información del SRI">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">Pasos para obtener información de ventas desde el SRI:</h4>
            <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
              <li>Ingresar al portal web del SRI (www.sri.gob.ec)</li>
              <li>Acceder con su clave de seguridad</li>
              <li>Ir a "Facturación Electrónica" &gt; "Comprobantes electrónicos recibidos"</li>
              <li>Seleccionar el período de consulta</li>
              <li>Exportar los datos en formato Excel o PDF</li>
              <li>Importar los datos a este sistema para registro automático</li>
            </ol>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
