"use client";

import { useState } from "react";
import { WizardNavigation, WizardStep } from "./wizard-navigation";
import { StepWelcome } from "./wizard-steps/step-welcome";
import { StepVentas } from "./wizard-steps/step-ventas";
import { StepCompras } from "./wizard-steps/step-compras";
import { StepRetenciones } from "./wizard-steps/step-retenciones";
import { StepProcessing } from "./wizard-steps/step-processing";
import { StepSummary } from "./wizard-steps/step-summary";
import { useAuth } from "@/contexts/auth-context";
import { parsearArchivoVentas, VentaParsed, TasaIVA } from "@/lib/ventas-parser";
import { parsearArchivoCompras, CompraParsed, ProveedorResumen, agruparPorProveedor } from "@/lib/compras-parser";
import { parsearXMLRetencion, RetencionParsed } from "@/lib/retencion-xml-parser";
import { RubroCompra } from "@/lib/supabase";

// Definición de los pasos del wizard
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
    id: "compras",
    title: "Compras",
    description: "Carga el archivo de compras",
  },
  {
    id: "retenciones",
    title: "Retenciones",
    description: "Carga los archivos XML",
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
    archivo: File | null;
    parsed: VentaParsed[];
    tasaIVA: TasaIVA;
    guardadas: boolean;
  };
  compras: {
    archivo: File | null;
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
  comprasTotal: number;
  comprasCount: number;
  ivaVentas: number;
  ivaCompras: number;
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
    archivo: null,
    parsed: [],
    tasaIVA: 15,
    guardadas: false,
  },
  compras: {
    archivo: null,
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

export function ImportWizard() {
  const { contribuyenteEfectivo: contribuyente } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [wizardState, setWizardState] = useState<WizardState>(initialState);

  // Función para avanzar al siguiente paso
  const goToNextStep = () => {
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  };

  // Función para retroceder
  const goToPreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  // Función para ir a un paso específico (actualmente no usada, pero útil para navegación futura)
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

  // Procesar archivo de ventas
  const processVentasFile = async (file: File, tasaIVA: TasaIVA) => {
    const text = await file.text();
    const parsed = parsearArchivoVentas(text, tasaIVA);
    setWizardState((prev) => ({
      ...prev,
      ventas: {
        archivo: file,
        parsed,
        tasaIVA,
        guardadas: false,
      },
    }));
    return parsed;
  };

  // Procesar archivo de compras
  const processComprasFile = async (file: File) => {
    const text = await file.text();
    const compras = parsearArchivoCompras(text);
    const proveedores = agruparPorProveedor(compras);
    setWizardState((prev) => ({
      ...prev,
      compras: {
        archivo: file,
        parsed: compras,
        proveedores,
        guardadas: false,
      },
    }));
    return { compras, proveedores };
  };

  // Actualizar rubros de proveedores
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

  // Procesar archivos de retenciones
  const processRetencionFiles = async (files: File[]) => {
    const allParsed: RetencionParsed[] = [];
    
    for (const file of files) {
      const text = await file.text();
      const result = parsearXMLRetencion(text, file.name);
      if (result.success && result.retencion) {
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
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
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
            onFileProcess={processVentasFile}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        )}
        {currentStep === 2 && (
          <StepCompras
            compras={wizardState.compras}
            periodo={wizardState.periodo}
            contribuyenteRuc={contribuyente.ruc}
            onFileProcess={processComprasFile}
            onRubroChange={updateProveedorRubro}
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
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        )}
        {currentStep === 4 && (
          <StepProcessing
            wizardState={wizardState}
            contribuyenteRuc={contribuyente.ruc}
            onVentasGuardadas={setVentasGuardadas}
            onComprasGuardadas={setComprasGuardadas}
            onRetencionesGuardadas={setRetencionesGuardadas}
            onResumenReady={setResumen}
            onComplete={goToNextStep}
          />
        )}
        {currentStep === 5 && (
          <StepSummary
            wizardState={wizardState}
            periodo={wizardState.periodo}
            onNewImport={resetWizard}
          />
        )}
      </div>
    </div>
  );
}

