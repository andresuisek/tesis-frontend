"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, PlusCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { SkeletonStatCard } from "@/components/skeletons";
import {
  supabase,
  DeclaracionRenta,
  ParametrosAnuales,
  TramoImpuestoRenta,
} from "@/lib/supabase";
import { toast } from "sonner";
import { DeclaracionesRentaTable } from "@/components/declaracion-renta/declaraciones-renta-table";
import { GenerarDeclaracionDialog } from "@/components/declaracion-renta/generar-declaracion-dialog";
import { DeclaracionRentaKPIs } from "@/components/declaracion-renta/declaracion-renta-kpis";
import { DetalleDeclaracionDialog } from "@/components/declaracion-renta/detalle-declaracion-dialog";
import {
  DeclaracionRentaSummaryData,
  mapDeclaracionRentaToSummary,
} from "@/lib/declaracion-renta";
import posthog from "posthog-js";

export default function DeclaracionRentaPage() {
  return (
    <Suspense>
      <DeclaracionRentaContent />
    </Suspense>
  );
}

function DeclaracionRentaContent() {
  const { contribuyenteEfectivo: contribuyente } = useAuth();
  const currentYear = new Date().getFullYear();

  // Local year filter (not global useDateFilter to avoid conflicts)
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const [declaraciones, setDeclaraciones] = useState<DeclaracionRenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 5;
  const [totalRows, setTotalRows] = useState(0);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Cache parametros and tramos for mapping
  const [parametrosCache, setParametrosCache] = useState<
    Record<number, ParametrosAnuales>
  >({});
  const [tramosCache, setTramosCache] = useState<
    Record<number, TramoImpuestoRenta[]>
  >({});

  const declaracionSeleccionada = useMemo(
    () =>
      declaraciones.find((item) => item.id === selectedId) ||
      declaraciones[0] ||
      null,
    [declaraciones, selectedId]
  );

  const resumenSeleccionado = useMemo((): DeclaracionRentaSummaryData | null => {
    if (!declaracionSeleccionada || !contribuyente?.ruc) return null;
    const anio = declaracionSeleccionada.anio_fiscal;
    const params = parametrosCache[anio];
    const tramos = tramosCache[anio];
    if (!params || !tramos) return null;
    return mapDeclaracionRentaToSummary(
      declaracionSeleccionada,
      params,
      tramos,
      contribuyente.ruc
    );
  }, [declaracionSeleccionada, parametrosCache, tramosCache, contribuyente?.ruc]);

  // Load available years
  const cargarAniosDisponibles = async () => {
    if (!contribuyente?.ruc) return;
    const { data } = await supabase
      .from("declaraciones_renta")
      .select("anio_fiscal")
      .eq("contribuyente_ruc", contribuyente.ruc)
      .is("deleted_at", null);

    const yearSet = new Set<number>();
    yearSet.add(currentYear - 1);
    data?.forEach((r) => yearSet.add(r.anio_fiscal));
    setAvailableYears(Array.from(yearSet).sort((a, b) => b - a));
  };

  // Load parametros/tramos for displayed years
  const cargarParametrosFiscales = async (anios: number[]) => {
    const aniosFaltantes = anios.filter((a) => !parametrosCache[a]);
    if (aniosFaltantes.length === 0) return;

    const [{ data: params }, { data: tramos }] = await Promise.all([
      supabase
        .from("parametros_anuales")
        .select("*")
        .in("anio_fiscal", aniosFaltantes),
      supabase
        .from("tramos_impuesto_renta")
        .select("*")
        .in("anio_fiscal", aniosFaltantes)
        .order("orden"),
    ]);

    const newParams: Record<number, ParametrosAnuales> = { ...parametrosCache };
    const newTramos: Record<number, TramoImpuestoRenta[]> = { ...tramosCache };

    (params as ParametrosAnuales[] | null)?.forEach((p) => {
      newParams[p.anio_fiscal] = p;
    });
    (tramos as TramoImpuestoRenta[] | null)?.forEach((t) => {
      if (!newTramos[t.anio_fiscal]) newTramos[t.anio_fiscal] = [];
      newTramos[t.anio_fiscal].push(t);
    });

    setParametrosCache(newParams);
    setTramosCache(newTramos);
  };

  const cargarDeclaraciones = async () => {
    if (!contribuyente?.ruc) {
      setDeclaraciones([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from("declaraciones_renta")
        .select("*", { count: "exact" })
        .eq("contribuyente_ruc", contribuyente.ruc)
        .is("deleted_at", null)
        .order("anio_fiscal", { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);

      if (selectedYear !== null) {
        query = query.eq("anio_fiscal", selectedYear);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const rows = (data || []) as DeclaracionRenta[];
      setDeclaraciones(rows);
      setTotalRows(count ?? 0);
      setSelectedId((prev) => {
        if (rows.length === 0) return null;
        const existePrevio = prev ? rows.some((item) => item.id === prev) : false;
        return existePrevio ? prev : rows[0].id;
      });

      // Load parametros for all displayed years
      const anios = [...new Set(rows.map((r) => r.anio_fiscal))];
      if (anios.length > 0) {
        await cargarParametrosFiscales(anios);
      }
    } catch (error) {
      console.error("Error cargando declaraciones:", error);
      toast.error("No se pudo cargar el historial de declaraciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarAniosDisponibles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contribuyente?.ruc]);

  useEffect(() => {
    cargarDeclaraciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contribuyente?.ruc, page, pageSize, selectedYear]);

  useEffect(() => {
    setPage(0);
  }, [selectedYear]);

  const handleSeleccion = (declaracion: DeclaracionRenta) => {
    setSelectedId(declaracion.id);
    setDetalleAbierto(true);
  };

  const handleCreated = () => {
    posthog.capture("declaracion_renta_created", {
      contribuyente_ruc: contribuyente?.ruc,
      anio_fiscal: selectedYear,
    });
    cargarDeclaraciones();
    cargarAniosDisponibles();
  };

  if (!contribuyente) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed p-10 text-center text-muted-foreground">
        Registra la información de tu contribuyente para habilitar el módulo de
        declaraciones.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Declaración de Impuesto a la Renta
          </h1>
          <p className="text-muted-foreground">
            Gestiona tus declaraciones anuales del impuesto a la renta (Formulario
            102/102A).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Exportar historial
          </Button>
          <Button className="gap-2" onClick={() => setModalAbierto(true)}>
            <PlusCircle className="h-4 w-4" />
            Nueva declaración
          </Button>
        </div>
      </div>

      {/* Year filter (local, not global) */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          Año fiscal:
        </span>
        <Select
          value={selectedYear?.toString() ?? "all"}
          onValueChange={(v) => setSelectedYear(v === "all" ? null : Number(v))}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {availableYears.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      ) : (
        <DeclaracionRentaKPIs resumen={resumenSeleccionado} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historial de declaraciones</CardTitle>
          <CardDescription>
            Declaraciones anuales generadas a partir de tus datos contables.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DeclaracionesRentaTable
            declaraciones={declaraciones}
            loading={loading}
            onSelect={handleSeleccion}
            selectedId={declaracionSeleccionada?.id ?? null}
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Página {page + 1} de{" "}
              {Math.max(1, Math.ceil(totalRows / pageSize))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((p) =>
                    (p + 1) * pageSize >= totalRows ? p : p + 1
                  )
                }
                disabled={(page + 1) * pageSize >= totalRows}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <GenerarDeclaracionDialog
        open={modalAbierto}
        onOpenChange={setModalAbierto}
        contribuyenteRuc={contribuyente.ruc}
        cargasFamiliares={contribuyente.cargas_familiares ?? 0}
        onCreated={handleCreated}
      />
      <DetalleDeclaracionDialog
        open={detalleAbierto}
        onOpenChange={setDetalleAbierto}
        resumen={resumenSeleccionado}
      />
    </div>
  );
}
