'use client';

import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { FormField, Button, Card } from '@/components/ui/FormComponents';

interface RetencionFormData {
  rucEmisor: string;
  razonSocialEmisor: string;
  tipoComprobante: string;
  serieComprobante: string;
  claveAcceso: string;
  fechaEmision: string;
  retencionIvaPercentage: number;
  retencionIvaValor: number;
  retencionRentaPercentage: number;
  retencionRentaValor: number;
}

interface RetencionRegistrada extends RetencionFormData {
  id: string;
  fechaRegistro: string;
}

const tipoComprobanteOptions = [
  { value: 'RETENCION', label: 'Comprobante de Retención' },
  { value: 'LIQUIDACION', label: 'Liquidación de Compra' },
];

const porcentajesRetencionIva = [
  { value: 30, label: '30%' },
  { value: 70, label: '70%' },
  { value: 100, label: '100%' },
];

const porcentajesRetencionRenta = [
  { value: 1, label: '1%' },
  { value: 2, label: '2%' },
  { value: 8, label: '8%' },
  { value: 10, label: '10%' },
];

export default function RetencionesPage() {
  const [formData, setFormData] = useState<RetencionFormData>({
    rucEmisor: '',
    razonSocialEmisor: '',
    tipoComprobante: '',
    serieComprobante: '',
    claveAcceso: '',
    fechaEmision: '',
    retencionIvaPercentage: 0,
    retencionIvaValor: 0,
    retencionRentaPercentage: 0,
    retencionRentaValor: 0,
  });

  const [retenciones, setRetenciones] = useState<RetencionRegistrada[]>([
    {
      id: '1',
      rucEmisor: '1234567890001',
      razonSocialEmisor: 'EMPRESA ABC S.A.',
      tipoComprobante: 'RETENCION',
      serieComprobante: '001-001-000000456',
      claveAcceso: '1234567890123456789012345678901234567890123456789',
      fechaEmision: '2025-01-10',
      retencionIvaPercentage: 30,
      retencionIvaValor: 45.00,
      retencionRentaPercentage: 2,
      retencionRentaValor: 20.00,
      fechaRegistro: '2025-01-10T14:30:00',
    },
  ]);

  const [showForm, setShowForm] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('Percentage') || name.includes('Valor') ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const nuevaRetencion: RetencionRegistrada = {
      ...formData,
      id: Date.now().toString(),
      fechaRegistro: new Date().toISOString(),
    };

    setRetenciones(prev => [nuevaRetencion, ...prev]);
    setFormData({
      rucEmisor: '',
      razonSocialEmisor: '',
      tipoComprobante: '',
      serieComprobante: '',
      claveAcceso: '',
      fechaEmision: '',
      retencionIvaPercentage: 0,
      retencionIvaValor: 0,
      retencionRentaPercentage: 0,
      retencionRentaValor: 0,
    });
    setShowForm(false);
    alert('Retención registrada exitosamente!');
  };

  const totalRetencionesIva = retenciones.reduce((acc, ret) => acc + ret.retencionIvaValor, 0);
  const totalRetencionesRenta = retenciones.reduce((acc, ret) => acc + ret.retencionRentaValor, 0);
  const totalRetenciones = totalRetencionesIva + totalRetencionesRenta;

  return (
    <MainLayout 
      title="Registro de Retenciones" 
      subtitle="Gestión de retenciones de IVA e Impuesto a la Renta"
    >
      <div className="space-y-6">
        {/* Resumen de Retenciones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Retenciones IVA</p>
                <p className="text-2xl font-bold text-gray-900">${totalRetencionesIva.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Retenciones Renta</p>
                <p className="text-2xl font-bold text-gray-900">${totalRetencionesRenta.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Retenciones</p>
                <p className="text-2xl font-bold text-gray-900">${totalRetenciones.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Botón para nueva retención */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Lista de Retenciones</h2>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : 'Nueva Retención'}
          </Button>
        </div>

        {/* Formulario de nueva retención */}
        {showForm && (
          <Card title="Registrar Nueva Retención">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="RUC Emisor"
                  name="rucEmisor"
                  value={formData.rucEmisor}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej: 1234567890001"
                />

                <FormField
                  label="Razón Social del Emisor"
                  name="razonSocialEmisor"
                  value={formData.razonSocialEmisor}
                  onChange={handleInputChange}
                  required
                  placeholder="Nombre de la empresa que retiene"
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
                  label="Serie del Comprobante"
                  name="serieComprobante"
                  value={formData.serieComprobante}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej: 001-001-000000456"
                />

                <FormField
                  label="Clave de Acceso"
                  name="claveAcceso"
                  value={formData.claveAcceso}
                  onChange={handleInputChange}
                  required
                  placeholder="49 dígitos de la clave de acceso"
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
                  label="Retención IVA (%)"
                  name="retencionIvaPercentage"
                  type="select"
                  value={formData.retencionIvaPercentage.toString()}
                  onChange={handleInputChange}
                  options={porcentajesRetencionIva.map(p => ({ value: p.value.toString(), label: p.label }))}
                />

                <FormField
                  label="Retención IVA (Valor $)"
                  name="retencionIvaValor"
                  type="number"
                  value={formData.retencionIvaValor.toString()}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />

                <FormField
                  label="Retención Renta (%)"
                  name="retencionRentaPercentage"
                  type="select"
                  value={formData.retencionRentaPercentage.toString()}
                  onChange={handleInputChange}
                  options={porcentajesRetencionRenta.map(p => ({ value: p.value.toString(), label: p.label }))}
                />

                <FormField
                  label="Retención Renta (Valor $)"
                  name="retencionRentaValor"
                  type="number"
                  value={formData.retencionRentaValor.toString()}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>

              <div className="flex space-x-4 mt-6">
                <Button type="submit" variant="primary">
                  Registrar Retención
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

        {/* Lista de retenciones */}
        <Card title="Retenciones Registradas">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Emisor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comprobante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ret. IVA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ret. Renta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {retenciones.map((retencion) => (
                  <tr key={retencion.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(retencion.fechaEmision).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{retencion.razonSocialEmisor}</div>
                        <div className="text-gray-500">{retencion.rucEmisor}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{retencion.tipoComprobante}</div>
                        <div className="text-gray-500">{retencion.serieComprobante}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">${retencion.retencionIvaValor.toFixed(2)}</div>
                        <div className="text-gray-500">({retencion.retencionIvaPercentage}%)</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">${retencion.retencionRentaValor.toFixed(2)}</div>
                        <div className="text-gray-500">({retencion.retencionRentaPercentage}%)</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${(retencion.retencionIvaValor + retencion.retencionRentaValor).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Parámetros para retenciones */}
        <Card title="Parámetros para Retenciones">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Retenciones de IVA:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>30%:</strong> Servicios profesionales</li>
                <li>• <strong>70%:</strong> Servicios de construcción</li>
                <li>• <strong>100%:</strong> Bienes gravados con tarifa 0%</li>
              </ul>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 mb-2">Retenciones de Renta:</h4>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• <strong>1%:</strong> Intereses y comisiones</li>
                <li>• <strong>2%:</strong> Servicios profesionales</li>
                <li>• <strong>8%:</strong> Servicios de construcción</li>
                <li>• <strong>10%:</strong> Servicios de transporte</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
