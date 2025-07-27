'use client';

import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { FormField, Button, Card } from '@/components/ui/FormComponents';

interface LiquidacionData {
  periodo: string;
  totalVentas: number;
  totalCompras: number;
  ivaEnVentas: number;
  ivaEnCompras: number;
  retencionesIvaRecibidas: number;
  retencionesRentaRecibidas: number;
  ivaAPagar: number;
  creditoTributario: number;
  baseImponibleRenta: number;
  impuestoRentaCalculado: number;
  retencionesRentaFavor: number;
  saldoAPagar: number;
  saldoAFavor: number;
}

const periodosOptions = [
  { value: '2025-01', label: 'Enero 2025' },
  { value: '2025-02', label: 'Febrero 2025' },
  { value: '2025-03', label: 'Marzo 2025' },
  { value: '2025-04', label: 'Abril 2025' },
  { value: '2025-05', label: 'Mayo 2025' },
  { value: '2025-06', label: 'Junio 2025' },
];

export default function LiquidacionPage() {
  const [selectedPeriodo, setSelectedPeriodo] = useState('2025-01');
  const [liquidacionData, setLiquidacionData] = useState<LiquidacionData>({
    periodo: '2025-01',
    totalVentas: 24532.00,
    totalCompras: 18456.00,
    ivaEnVentas: 3679.80,
    ivaEnCompras: 2768.40,
    retencionesIvaRecibidas: 1103.94,
    retencionesRentaRecibidas: 490.64,
    ivaAPagar: 911.40,
    creditoTributario: 2768.40,
    baseImponibleRenta: 6076.00,
    impuestoRentaCalculado: 121.52,
    retencionesRentaFavor: 490.64,
    saldoAPagar: 911.40,
    saldoAFavor: 369.12,
  });

  const [showCalculator, setShowCalculator] = useState(false);

  const calcularLiquidacion = () => {
    // Datos simulados - en producción vendrían de la base de datos
    const ventasDelPeriodo = 24532.00;
    const comprasDelPeriodo = 18456.00;
    const ivaVentas = ventasDelPeriodo * 0.15; // Asumiendo 15% IVA promedio
    const ivaCompras = comprasDelPeriodo * 0.15;
    const retencionesIva = 1103.94;
    const retencionesRenta = 490.64;
    
    const ivaAPagar = Math.max(0, ivaVentas - ivaCompras - retencionesIva);
    const baseRenta = ventasDelPeriodo - comprasDelPeriodo;
    const impuestoRenta = baseRenta > 0 ? baseRenta * 0.02 : 0; // 2% personas naturales
    
    setLiquidacionData({
      periodo: selectedPeriodo,
      totalVentas: ventasDelPeriodo,
      totalCompras: comprasDelPeriodo,
      ivaEnVentas: ivaVentas,
      ivaEnCompras: ivaCompras,
      retencionesIvaRecibidas: retencionesIva,
      retencionesRentaRecibidas: retencionesRenta,
      ivaAPagar: ivaAPagar,
      creditoTributario: ivaCompras,
      baseImponibleRenta: baseRenta,
      impuestoRentaCalculado: impuestoRenta,
      retencionesRentaFavor: retencionesRenta,
      saldoAPagar: ivaAPagar,
      saldoAFavor: Math.max(0, retencionesRenta - impuestoRenta),
    });

    alert('Liquidación calculada para el período seleccionado');
  };

  const generarDeclaracion = () => {
    alert('Función para generar archivo de declaración (XML/PDF) - En desarrollo');
  };

  return (
    <MainLayout 
      title="Liquidación de Impuestos" 
      subtitle="Cálculo y generación de declaraciones tributarias"
    >
      <div className="space-y-6">
        {/* Selector de Período */}
        <Card title="Seleccionar Período">
          <div className="flex items-center space-x-4">
            <FormField
              label="Período Tributario"
              name="periodo"
              type="select"
              value={selectedPeriodo}
              onChange={(e) => setSelectedPeriodo(e.target.value)}
              options={periodosOptions}
            />
            <div className="pt-6">
              <Button onClick={calcularLiquidacion}>
                Calcular Liquidación
              </Button>
            </div>
          </div>
        </Card>

        {/* Resumen IVA */}
        <Card title="Liquidación de IVA">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Débito Fiscal (IVA en Ventas)</h4>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Ventas:</span>
                  <span className="font-medium">${liquidacionData.totalVentas.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">IVA en Ventas:</span>
                  <span className="font-medium">${liquidacionData.ivaEnVentas.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Crédito Fiscal (IVA en Compras)</h4>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Compras:</span>
                  <span className="font-medium">${liquidacionData.totalCompras.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">IVA en Compras:</span>
                  <span className="font-medium">${liquidacionData.ivaEnCompras.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Retenciones IVA:</span>
                  <span className="font-medium">${liquidacionData.retencionesIvaRecibidas.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Resultado IVA */}
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Débito Fiscal</p>
                <p className="text-xl font-bold text-blue-600">${liquidacionData.ivaEnVentas.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Crédito Fiscal</p>
                <p className="text-xl font-bold text-green-600">-${(liquidacionData.ivaEnCompras + liquidacionData.retencionesIvaRecibidas).toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">IVA a Pagar</p>
                <p className={`text-xl font-bold ${liquidacionData.ivaAPagar > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${liquidacionData.ivaAPagar.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Resumen Impuesto a la Renta */}
        <Card title="Liquidación Impuesto a la Renta">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Base Imponible</h4>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Ingresos:</span>
                  <span className="font-medium">${liquidacionData.totalVentas.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">(-) Gastos Deducibles:</span>
                  <span className="font-medium">-${liquidacionData.totalCompras.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Base Imponible:</span>
                    <span>${liquidacionData.baseImponibleRenta.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Cálculo del Impuesto</h4>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Impuesto Calculado (2%):</span>
                  <span className="font-medium">${liquidacionData.impuestoRentaCalculado.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">(-) Retenciones Recibidas:</span>
                  <span className="font-medium">-${liquidacionData.retencionesRentaRecibidas.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Saldo a Favor:</span>
                    <span className="text-green-600">${liquidacionData.saldoAFavor.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Resumen Final */}
        <Card title="Resumen de Obligaciones">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2">Valores a Pagar</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-red-800">IVA:</span>
                  <span className="font-medium text-red-900">${liquidacionData.ivaAPagar.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-red-800">Impuesto a la Renta:</span>
                  <span className="font-medium text-red-900">$0.00</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold">
                    <span className="text-red-900">Total a Pagar:</span>
                    <span className="text-red-900">${liquidacionData.saldoAPagar.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">Valores a Favor</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-green-800">Crédito Tributario IVA:</span>
                  <span className="font-medium text-green-900">$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-green-800">Saldo a Favor Renta:</span>
                  <span className="font-medium text-green-900">${liquidacionData.saldoAFavor.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold">
                    <span className="text-green-900">Total a Favor:</span>
                    <span className="text-green-900">${liquidacionData.saldoAFavor.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Acciones */}
        <Card title="Acciones">
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => setShowCalculator(!showCalculator)}>
              {showCalculator ? 'Ocultar' : 'Mostrar'} Calculadora
            </Button>
            <Button onClick={generarDeclaracion}>
              Generar Declaración
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              Imprimir Reporte
            </Button>
          </div>
        </Card>

        {/* Calculadora Detallada */}
        {showCalculator && (
          <Card title="Calculadora Detallada">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-4">Fórmulas de Cálculo</h4>
              <div className="space-y-3 text-sm">
                <div>
                  <strong>IVA a Pagar = </strong>
                  IVA en Ventas - IVA en Compras - Retenciones IVA Recibidas
                </div>
                <div>
                  <strong>Base Imponible Renta = </strong>
                  Total Ingresos - Gastos Deducibles
                </div>
                <div>
                  <strong>Impuesto Renta = </strong>
                  Base Imponible × 2% (personas naturales)
                </div>
                <div>
                  <strong>Saldo Final Renta = </strong>
                  Impuesto Calculado - Retenciones Recibidas
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Información Legal */}
        <Card title="Información Legal">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Fechas de Vencimiento:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>IVA Mensual:</strong> Hasta el 28 del mes siguiente</li>
              <li>• <strong>Retenciones:</strong> Hasta el 28 del mes siguiente</li>
              <li>• <strong>Impuesto a la Renta:</strong> Según noveno dígito del RUC</li>
              <li>• <strong>Anexos:</strong> Marzo del año siguiente</li>
            </ul>
            <p className="mt-2 text-xs text-blue-700">
              * Las fechas pueden variar según el calendario tributario oficial del SRI
            </p>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
