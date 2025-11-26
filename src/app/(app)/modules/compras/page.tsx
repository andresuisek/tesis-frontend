"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase, Compra } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ComprasKPIs } from "@/components/compras/compras-kpis";
import { ComprasTable } from "@/components/compras/compras-table";
import { GastosPersonalesSummary } from "@/components/compras/gastos-personales-summary";
import { ComprasPagination } from "@/components/compras/compras-pagination";
import { NuevaCompraDialog } from "@/components/compras/nueva-compra-dialog";
import { ImportarComprasDialog } from "@/components/compras/importar-compras-dialog";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { TaxPeriodFilter } from "@/components/filters/tax-period-filter";
import { useDateFilter } from "@/contexts/date-filter-context";
import { useAvailableYears } from "@/hooks/use-available-years";

export default function ComprasPage() {
  const { contribuyente } = useAuth();
  const [comprasFiltradas, setComprasFiltradas] = useState<Compra[]>([]);
  const [todasLasComprasFiltradas, setTodasLasComprasFiltradas] = useState<Compra[]>([]); // Para KPIs
  const [loading, setLoading] = useState(true);
  const [showNuevaCompraDialog, setShowNuevaCompraDialog] = useState(false);
  const [showImportarDialog, setShowImportarDialog] = useState(false);

  const { year: selectedYear, month: selectedMonth } = useDateFilter();
  const { years: availableYears, refresh: refreshAvailableYears } =
    useAvailableYears("compras");

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalCompras, setTotalCompras] = useState(0);
  const ITEMS_POR_PAGINA = 15;

  dayjs.locale("es");

  const cargarCompras = async () => {
    if (!contribuyente) return;

    setLoading(true);
    try {
      // Construir query base con filtros
      let queryBase = supabase
        .from("compras")
        .select("*")
        .eq("contribuyente_ruc", contribuyente.ruc);

      // Aplicar filtros globales
      if (selectedMonth !== null) {
        const start = dayjs()
          .year(selectedYear)
          .month(selectedMonth - 1)
          .startOf("month")
          .format("YYYY-MM-DD");
        const end = dayjs()
          .year(selectedYear)
          .month(selectedMonth - 1)
          .endOf("month")
          .format("YYYY-MM-DD");
        queryBase = queryBase.gte("fecha_emision", start).lte("fecha_emision", end);
      } else {
        const start = dayjs()
          .year(selectedYear)
          .startOf("year")
          .format("YYYY-MM-DD");
        const end = dayjs()
          .year(selectedYear)
          .endOf("year")
          .format("YYYY-MM-DD");
        queryBase = queryBase.gte("fecha_emision", start).lte("fecha_emision", end);
      }

      // Cargar TODAS las compras filtradas para KPIs (sin paginación)
      const { data: todasCompras, error: errorTodas } = await queryBase
        .order("fecha_emision", { ascending: false });

      if (errorTodas) throw errorTodas;

      setTodasLasComprasFiltradas(todasCompras || []);
      setTotalCompras(todasCompras?.length || 0);

      // Aplicar paginación manualmente para la tabla
      const from = (paginaActual - 1) * ITEMS_POR_PAGINA;
      const to = from + ITEMS_POR_PAGINA;
      const comprasPaginadas = (todasCompras || []).slice(from, to);

      setComprasFiltradas(comprasPaginadas);
    } catch (error: unknown) {
      console.error("Error al cargar compras:", error);
      toast.error("Error al cargar las compras");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contribuyente) {
      cargarCompras();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contribuyente]);

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    cargarCompras();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth, paginaActual]);


  const handleEliminarCompra = async (compra: Compra) => {
    if (!confirm("¿Estás seguro de eliminar esta compra?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("compras")
        .delete()
        .eq("id", compra.id);

      if (error) throw error;

      toast.success("Compra eliminada exitosamente");
      cargarCompras();
    } catch (error: unknown) {
      console.error("Error al eliminar compra:", error);
      toast.error("Error al eliminar la compra");
    }
  };

  if (!contribuyente) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">
          Cargando información del contribuyente...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Compras</h1>
            <p className="text-muted-foreground">
              Administra todas tus compras, gastos y proveedores
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowImportarDialog(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Importar TXT
            </Button>
            <Button onClick={() => setShowNuevaCompraDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva compra
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <TaxPeriodFilter availableYears={availableYears} />

      {/* KPIs */}
      {!loading && <ComprasKPIs compras={todasLasComprasFiltradas} />}

      {/* Gastos Personales */}
      {!loading && (
        <GastosPersonalesSummary 
          compras={todasLasComprasFiltradas} 
          cargasFamiliares={contribuyente.cargas_familiares}
        />
      )}

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">Cargando compras...</p>
        </div>
      ) : (
        <ComprasTable
          compras={comprasFiltradas}
          onEliminar={handleEliminarCompra}
        />
      )}

      {/* Paginación */}
      {!loading && (
        <ComprasPagination
          paginaActual={paginaActual}
          totalItems={totalCompras}
          itemsPorPagina={ITEMS_POR_PAGINA}
          onPaginaChange={setPaginaActual}
        />
      )}

      {/* Dialog Nueva Compra */}
      <NuevaCompraDialog
        open={showNuevaCompraDialog}
        onOpenChange={setShowNuevaCompraDialog}
        contribuyenteRuc={contribuyente.ruc}
        onCompraCreada={() => {
          cargarCompras();
          refreshAvailableYears();
        }}
      />

      {/* Dialog Importar Compras */}
      <ImportarComprasDialog
        open={showImportarDialog}
        onOpenChange={setShowImportarDialog}
        contribuyenteRuc={contribuyente.ruc}
        onComprasImportadas={() => {
          cargarCompras();
          refreshAvailableYears();
        }}
      />
    </div>
  );
}
