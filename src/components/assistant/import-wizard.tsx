"use client";

import { useState } from "react";
import { WizardNavigation, WizardStep } from "./wizard-navigation";
import { StepWelcome } from "./wizard-steps/step-welcome";
import { StepVentas } from "./wizard-steps/step-ventas";
import { StepNotasCredito } from "./wizard-steps/step-notas-credito";
import { StepRetenciones } from "./wizard-steps/step-retenciones";
import { StepCompras } from "./wizard-steps/step-compras";
import { StepProcessing } from "./wizard-steps/step-processing";
import { StepSummary } from "./wizard-steps/step-summary";
import { useAuth } from "@/contexts/auth-context";
import { VentaParsed, TasaIVA } from "@/lib/ventas-parser";
import { parsearArchivoNotasCredito, NotaCreditoParsed, validarRucNotasCredito } from "@/lib/notas-credito-parser";
import { parsearArchivoCompras, CompraParsed, ProveedorResumen, agruparPorProveedor, validarRucCompras } from "@/lib/compras-parser";
import { parsearMultiplesXMLCompras, ComprasXMLParseResult } from "@/lib/compras-xml-parser";
import { parsearMultiplesXMLVentas, VentaXmlParsed, VentasXMLParseResult, validarRucVentasXml } from "@/lib/ventas-xml-parser";
import { parsearXMLRetencion, RetencionParsed, validarRucRetencion } from "@/lib/retencion-xml-parser";
import { RubroCompra } from "@/lib/supabase";
import { toast } from "sonner";

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "welcome",
    title: "Inicio",
    description: "Selecciona el período tributario",
  },
  {
    id: "ventas",
    title: "Ventas",
    description: "Carga el archivo de ventas",
  },
  {
    id: "notas-credito",
    title: "Notas de Crédito",
    description: "Carga notas de crédito emitidas",
  },
  {
    id: "retenciones",
    title: "Retenciones",
    description: "Carga los archivos XML",
  },
  {
    id: "compras",
    title: "Compras",
    description: "Carga las facturas XML",
  },
  {
    id: "processing",
    title: "Procesando",
    description: "Guardando información",
  },
  {
    id: "summary",
    title: "Resumen",
    description: "Resumen ejecutivo",
  },
];

// Estado del wizard
export interface WizardState {
  periodo: {
    mes: number;
    anio: number;
  };
  ventas: {
    formato: "txt" | "xml";
    archivo: File | null;
    archivosXml: File[];
    parsed: VentaParsed[];
    parsedXml: VentaXmlParsed[];
    tasaIVA: TasaIVA;
    guardadas: boolean;
  };
  notasCredito: {
    archivo: File | null;
    parsed: NotaCreditoParsed[];
    guardadas: boolean;
  };
  compras: {
    formato: "txt" | "xml";
    archivo: File | null;
    archivosXml: File[];
    parsed: CompraParsed[];
    proveedores: ProveedorResumen[];
    guardadas: boolean;
  };
  retenciones: {
    archivos: File[];
    parsed: RetencionParsed[];
    guardadas: boolean;
    vinculadas: number;
  };
  resumen: ImportSummary | null;
}

export interface ImportSummary {
  ventasTotal: number;
  ventasCount: number;
  notasCreditoTotal: number;
  notasCreditoCount: number;
  comprasTotal: number;
  comprasCount: number;
  ivaVentas: number;
  ivaCompras: number;
  ivaNotasCredito: number;
  ivaAPagar: number;
  retencionesTotal: number;
  retencionesCount: number;
  facturasConRetencion: number;
  alerts: Array<{ type: "warning" | "info" | "success"; icon: string; message: string }>;
  recommendations: string[];
  insights: string[];
}

const currentDate = new Date();
const initialState: WizardState = {
  periodo: {
    mes: currentDate.getMonth() + 1,
    anio: currentDate.getFullYear(),
  },
  ventas: {
    formato: "xml",
    archivo: null,
    archivosXml: [],
    parsed: [],
    parsedXml: [],
    tasaIVA: 15,
    guardadas: false,
  },
  notasCredito: {
    archivo: null,
    parsed: [],
    guardadas: false,
  },
  compras: {
    formato: "xml", // TXT import disabled
    archivo: null,
    archivosXml: [],
    parsed: [],
    proveedores: [],
    guardadas: false,
  },
  retenciones: {
    archivos: [],
    parsed: [],
    guardadas: false,
    vinculadas: 0,
  },
  resumen: null,
};

/**
 * Contribuyente mock para demostración y pruebas.
 * Este mock se activa automáticamente solo en modo desarrollo cuando:
 * - No hay un usuario autenticado con perfil de contribuyente
 * - O no hay un contribuyente activo seleccionado (para contadores)
 *
 * NOTA: En producción, este mock no se usa nunca.
 * El RUC corresponde a los archivos de prueba en /docs/data-test/
 */
const DEMO_CONTRIBUYENTE = {
  id: "demo-id",
  user_id: "demo-user-id",
  ruc: "0962428348001",
  razon_social: "USUARIO DEMO (Modo Desarrollo)",
  nombre_comercial: "Demo Contribuyente",
  direccion: "Dirección de Demostración",
  telefono: "0999999999",
  email: "demo@demo.com",
  obligado_contabilidad: false,
  tipo_contribuyente: "natural" as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function ImportWizard() {
  const { contribuyenteEfectivo } = useAuth();

  // En desarrollo: usar mock si no hay contribuyente real
  // En producción: siempre requerir contribuyente real
  const isDevelopment = process.env.NODE_ENV === "development";
  const contribuyente = contribuyenteEfectivo || (isDevelopment ? DEMO_CONTRIBUYENTE : null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [wizardState, setWizardState] = useState<WizardState>(initialState);

  // Skip logic: si ventas está vacío, saltar NC (2) y Retenciones (3) → ir a Compras (4)
  const goToNextStep = () => {
    // Validar que al menos 1 tipo de dato esté cargado antes de procesar (step 4 = Compras)
    if (currentStep === 4) {
      const hasAnyData =
        wizardState.ventas.parsed.length > 0 ||
        wizardState.notasCredito.parsed.length > 0 ||
        wizardState.compras.parsed.length > 0 ||
        wizardState.retenciones.parsed.length > 0;
      if (!hasAnyData) {
        toast.error("Debes cargar al menos un tipo de dato (ventas, compras, notas de crédito o retenciones) para procesar.");
        return;
      }
    }

    setCompletedSteps((prev) => new Set([...prev, currentStep]));

    let nextStep = currentStep + 1;

    // Si estamos en Ventas (1) y no hay ventas cargadas, saltar NC y Retenciones → ir a Compras (4)
    if (currentStep === 1 && wizardState.ventas.parsed.length === 0) {
      // Marcar NC y Retenciones como completados (skipped)
      setCompletedSteps((prev) => new Set([...prev, currentStep, 2, 3]));
      nextStep = 4;
    }

    setCurrentStep(Math.min(nextStep, WIZARD_STEPS.length - 1));
  };

  // Reverse skip: si en Compras (4) y ventas vacío, volver a Ventas (1)
  const goToPreviousStep = () => {
    let prevStep = currentStep - 1;

    if (currentStep === 4 && wizardState.ventas.parsed.length === 0) {
      prevStep = 1;
    }

    setCurrentStep(Math.max(prevStep, 0));
  };

  // Función para ir a un paso específico
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const goToStep = (step: number) => {
    if (step <= currentStep || completedSteps.has(step - 1)) {
      setCurrentStep(step);
    }
  };

  // Actualizar período
  const updatePeriodo = (mes: number, anio: number) => {
    setWizardState((prev) => ({
      ...prev,
      periodo: { mes, anio },
    }));
  };

  // Límites de tamaño de archivo
  const MAX_TXT_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_XML_SIZE = 1 * 1024 * 1024;  // 1MB

  // Procesar archivos XML de ventas
  const processVentasXmlFiles = async (files: File[], onProgress?: (percent: number) => void): Promise<VentasXMLParseResult> => {
    const result = await parsearMultiplesXMLVentas(files, onProgress);

    if (result.ventas.length === 0) {
      throw new Error("No se pudo parsear ninguna factura XML correctamente.");
    }

    // Validar RUC del archivo vs contribuyente
    const rucError = validarRucVentasXml(result.ventas, contribuyente!.ruc);
    if (rucError) {
      throw new Error(rucError);
    }

    // Convert VentaXmlParsed[] -> VentaParsed[] for pipeline compatibility
    const ventasParsed: VentaParsed[] = result.ventas.map((v) => ({
      fecha_emision: v.fecha_emision,
      tipo_comprobante: v.tipo_comprobante,
      numero_comprobante: v.numero_comprobante,
      ruc_cliente: v.ruc_cliente,
      razon_social_cliente: v.razon_social_cliente,
      clave_acceso: v.clave_acceso,
      subtotal: v.subtotal_0 + v.subtotal_5 + v.subtotal_8 + v.subtotal_15,
      iva: v.iva,
      total: v.total,
    }));

    setWizardState((prev) => ({
      ...prev,
      ventas: {
        formato: "xml",
        archivo: null,
        archivosXml: files,
        parsed: ventasParsed,
        parsedXml: result.ventas,
        tasaIVA: 15,
        guardadas: false,
      },
    }));

    return result;
  };

  // Procesar archivo de notas de crédito
  const processNotasCreditoFile = async (file: File) => {
    if (file.size > MAX_TXT_SIZE) {
      throw new Error(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo permitido: 10MB.`);
    }
    const text = await file.text();
    const result = parsearArchivoNotasCredito(text, wizardState.periodo.mes, wizardState.periodo.anio);

    // Validar RUC del archivo vs contribuyente
    const rucError = validarRucNotasCredito(result.data, contribuyente!.ruc);
    if (rucError) {
      throw new Error(rucError);
    }

    setWizardState((prev) => ({
      ...prev,
      notasCredito: {
        archivo: file,
        parsed: result.data,
        guardadas: false,
      },
    }));
    return result;
  };

  // Procesar archivo de compras
  const processComprasFile = async (file: File) => {
    if (file.size > MAX_TXT_SIZE) {
      throw new Error(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo permitido: 10MB.`);
    }
    const text = await file.text();
    const result = parsearArchivoCompras(text, wizardState.periodo.mes, wizardState.periodo.anio);

    // Validar RUC del archivo vs contribuyente
    const rucError = validarRucCompras(result.data, contribuyente!.ruc);
    if (rucError) {
      throw new Error(rucError);
    }

    const proveedores = agruparPorProveedor(result.data);
    setWizardState((prev) => ({
      ...prev,
      compras: {
        formato: "txt",
        archivo: file,
        archivosXml: [],
        parsed: result.data,
        proveedores,
        guardadas: false,
      },
    }));
    return { compras: result.data, proveedores, warnings: result.warnings, skippedCount: result.skippedCount };
  };

  // Procesar archivos XML de compras
  const processComprasXmlFiles = async (files: File[], onProgress?: (percent: number) => void): Promise<ComprasXMLParseResult> => {
    const result = await parsearMultiplesXMLCompras(files, onProgress);

    if (result.compras.length === 0) {
      throw new Error("No se pudo parsear ninguna factura XML correctamente.");
    }

    // Validar RUC del archivo vs contribuyente
    const rucError = validarRucCompras(result.compras, contribuyente!.ruc);
    if (rucError) {
      throw new Error(rucError);
    }

    const proveedores = agruparPorProveedor(result.compras);
    setWizardState((prev) => ({
      ...prev,
      compras: {
        formato: "xml",
        archivo: null,
        archivosXml: files,
        parsed: result.compras,
        proveedores,
        guardadas: false,
      },
    }));

    return result;
  };

  // Actualizar rubro de un proveedor
  const updateProveedorRubro = (ruc: string, rubro: string) => {
    setWizardState((prev) => ({
      ...prev,
      compras: {
        ...prev.compras,
        proveedores: prev.compras.proveedores.map((p) =>
          p.ruc_proveedor === ruc ? { ...p, rubro: rubro as RubroCompra } : p
        ),
        parsed: prev.compras.parsed.map((c) =>
          c.ruc_proveedor === ruc ? { ...c, rubro: rubro as RubroCompra } : c
        ),
      },
    }));
  };

  // Actualizar rubro en masa para múltiples proveedores
  const updateBulkProveedorRubro = (rucs: string[], rubro: string) => {
    const rucSet = new Set(rucs);
    setWizardState((prev) => ({
      ...prev,
      compras: {
        ...prev.compras,
        proveedores: prev.compras.proveedores.map((p) =>
          rucSet.has(p.ruc_proveedor) ? { ...p, rubro: rubro as RubroCompra } : p
        ),
        parsed: prev.compras.parsed.map((c) =>
          rucSet.has(c.ruc_proveedor) ? { ...c, rubro: rubro as RubroCompra } : c
        ),
      },
    }));
  };

  // Procesar archivos de retenciones
  const processRetencionFiles = async (files: File[]) => {
    const allParsed: RetencionParsed[] = [];

    for (const file of files) {
      if (file.size > MAX_XML_SIZE) {
        console.warn(`Archivo ${file.name} excede 1MB, omitido`);
        continue;
      }
      const text = await file.text();
      const result = parsearXMLRetencion(text, file.name);
      if (result.success && result.retencion) {
        // Validar RUC del archivo vs contribuyente
        const rucError = validarRucRetencion(result.retencion, contribuyente!.ruc);
        if (rucError) {
          toast.error(`${file.name}: ${rucError}`);
          continue; // Omitir retenciones con RUC incorrecto
        }
        allParsed.push(result.retencion);
      }
    }

    setWizardState((prev) => ({
      ...prev,
      retenciones: {
        archivos: files,
        parsed: allParsed,
        guardadas: false,
        vinculadas: 0,
      },
    }));

    return allParsed;
  };

  // Marcar ventas como guardadas
  const setVentasGuardadas = (guardadas: boolean) => {
    setWizardState((prev) => ({
      ...prev,
      ventas: { ...prev.ventas, guardadas },
    }));
  };

  // Marcar notas de crédito como guardadas
  const setNotasCreditoGuardadas = (guardadas: boolean) => {
    setWizardState((prev) => ({
      ...prev,
      notasCredito: { ...prev.notasCredito, guardadas },
    }));
  };

  // Marcar compras como guardadas
  const setComprasGuardadas = (guardadas: boolean) => {
    setWizardState((prev) => ({
      ...prev,
      compras: { ...prev.compras, guardadas },
    }));
  };

  // Marcar retenciones como guardadas
  const setRetencionesGuardadas = (guardadas: boolean, vinculadas: number) => {
    setWizardState((prev) => ({
      ...prev,
      retenciones: { ...prev.retenciones, guardadas, vinculadas },
    }));
  };

  // Guardar resumen
  const setResumen = (resumen: ImportSummary) => {
    setWizardState((prev) => ({
      ...prev,
      resumen,
    }));
  };

  // Limpiar datos de un paso específico
  const clearVentas = () => {
    setWizardState((prev) => ({
      ...prev,
      ventas: { formato: "xml", archivo: null, archivosXml: [], parsed: [], parsedXml: [], tasaIVA: prev.ventas.tasaIVA, guardadas: false },
    }));
  };

  const clearNotasCredito = () => {
    setWizardState((prev) => ({
      ...prev,
      notasCredito: { archivo: null, parsed: [], guardadas: false },
    }));
  };

  const clearCompras = () => {
    setWizardState((prev) => ({
      ...prev,
      compras: { formato: "txt", archivo: null, archivosXml: [], parsed: [], proveedores: [], guardadas: false },
    }));
  };

  const clearRetenciones = () => {
    setWizardState((prev) => ({
      ...prev,
      retenciones: { archivos: [], parsed: [], guardadas: false, vinculadas: 0 },
    }));
  };

  // Reiniciar wizard
  const resetWizard = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setWizardState(initialState);
  };

  // Verificar si el contribuyente está disponible
  if (!contribuyente) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">
          Debes tener un perfil de contribuyente registrado para usar el asistente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Asistente de Importación
        </h1>
        <p className="text-muted-foreground mt-2">
          Te guiaré paso a paso para cargar toda tu información tributaria
        </p>
      </div>

      {/* Navegación del wizard */}
      <WizardNavigation
        steps={WIZARD_STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
      />

      {/* Contenido del paso actual */}
      <div className="min-h-[400px]">
        <div key={currentStep} className="animate-wizard-step-enter">
        {currentStep === 0 && (
          <StepWelcome
            periodo={wizardState.periodo}
            onPeriodoChange={updatePeriodo}
            onNext={goToNextStep}
          />
        )}
        {currentStep === 1 && (
          <StepVentas
            ventas={wizardState.ventas}
            periodo={wizardState.periodo}
            contribuyenteRuc={contribuyente.ruc}
            onXmlFilesProcess={processVentasXmlFiles}
            onClear={clearVentas}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        )}
        {currentStep === 2 && (
          <StepNotasCredito
            notasCredito={wizardState.notasCredito}
            periodo={wizardState.periodo}
            contribuyenteRuc={contribuyente.ruc}
            onFileProcess={processNotasCreditoFile}
            onClear={clearNotasCredito}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        )}
        {currentStep === 3 && (
          <StepRetenciones
            retenciones={wizardState.retenciones}
            periodo={wizardState.periodo}
            contribuyenteRuc={contribuyente.ruc}
            onFilesProcess={processRetencionFiles}
            onClear={clearRetenciones}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        )}
        {currentStep === 4 && (
          <StepCompras
            compras={wizardState.compras}
            periodo={wizardState.periodo}
            contribuyenteRuc={contribuyente.ruc}
            onFileProcess={processComprasFile}
            onXmlFilesProcess={processComprasXmlFiles}
            onRubroChange={updateProveedorRubro}
            onBulkRubroChange={updateBulkProveedorRubro}
            onClear={clearCompras}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        )}
        {currentStep === 5 && (
          <StepProcessing
            wizardState={wizardState}
            contribuyenteRuc={contribuyente.ruc}
            onVentasGuardadas={setVentasGuardadas}
            onNotasCreditoGuardadas={setNotasCreditoGuardadas}
            onComprasGuardadas={setComprasGuardadas}
            onRetencionesGuardadas={setRetencionesGuardadas}
            onResumenReady={setResumen}
            onComplete={goToNextStep}
          />
        )}
        {currentStep === 6 && (
          <StepSummary
            wizardState={wizardState}
            periodo={wizardState.periodo}
            onNewImport={resetWizard}
          />
        )}
        </div>
      </div>
    </div>
  );
}
