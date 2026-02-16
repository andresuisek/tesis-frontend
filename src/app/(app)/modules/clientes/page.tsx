"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, AlertCircle } from "lucide-react";
import { SkeletonStatCardSimple, SkeletonClientCard } from "@/components/skeletons";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useClientsOverview } from "@/hooks/use-clients-overview";

import { CreateClientDialog } from "@/components/clientes/create-client-dialog";
import { LinkClientDialog } from "@/components/clientes/link-client-dialog";
import { ClientsStatCards } from "@/components/clientes/clients-stat-cards";
import { DeadlineTimeline } from "@/components/clientes/deadline-timeline";
import { ClientsToolbar, type ViewMode, type StatusFilter } from "@/components/clientes/clients-toolbar";
import { ClientCard } from "@/components/clientes/client-card";
import { ClientsTableView } from "@/components/clientes/clients-table-view";

export default function ClientesPage() {
  const {
    userType,
    contador,
    contribuyentesAsignados,
    contribuyenteActivo,
    setContribuyenteActivo,
    refreshContribuyentesAsignados,
    loading: authLoading,
  } = useAuth();
  const router = useRouter();

  // Local UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [timelineDay, setTimelineDay] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vincularDialogOpen, setVincularDialogOpen] = useState(false);

  // Aggregated data hook
  const { clients, deadlineGroups, statusSummary } = useClientsOverview(
    contribuyentesAsignados,
    contribuyenteActivo?.ruc ?? null,
  );

  // Redirect non-contadores
  useEffect(() => {
    if (!authLoading && userType !== null && userType !== "contador") {
      router.push("/dashboard");
    }
  }, [authLoading, userType, router]);

  // Filter clients
  const filteredClients = useMemo(() => {
    let result = clients;

    // Text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.ruc.toLowerCase().includes(q) ||
          c.firstName.toLowerCase().includes(q) ||
          c.lastName.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q),
      );
    }

    // Status filter
    if (statusFilter !== "todos") {
      result = result.filter((c) => c.deadlineStatus === statusFilter);
    }

    // Timeline day filter
    if (timelineDay !== null) {
      result = result.filter((c) => c.deadlineInfo.deadlineDay === timelineDay);
    }

    return result;
  }, [clients, searchQuery, statusFilter, timelineDay]);

  // Actions
  const handleSelect = useCallback(
    (ruc: string) => {
      const asignado = contribuyentesAsignados.find((a) => a.contribuyente_ruc === ruc);
      if (asignado?.contribuyente) {
        setContribuyenteActivo(asignado.contribuyente);
        toast.success(`Trabajando con ${asignado.contribuyente.first_name} ${asignado.contribuyente.last_name}`);
        router.push("/dashboard");
      }
    },
    [contribuyentesAsignados, setContribuyenteActivo, router],
  );

  const handleUnlink = useCallback(
    async (ruc: string) => {
      if (!contador) return;
      try {
        const { error } = await supabase
          .from("contador_contribuyente")
          .update({ estado: "inactivo", fecha_desactivacion: new Date().toISOString() })
          .eq("contador_id", contador.id)
          .eq("contribuyente_ruc", ruc);

        if (error) throw error;

        toast.success("Contribuyente desvinculado");
        if (contribuyenteActivo?.ruc === ruc) {
          setContribuyenteActivo(null);
        }
        refreshContribuyentesAsignados();
      } catch (error) {
        console.error("Error al desvincular:", error);
        toast.error("Error al desvincular contribuyente");
      }
    },
    [contador, contribuyenteActivo, setContribuyenteActivo, refreshContribuyentesAsignados],
  );

  // Loading skeleton
  if (authLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatCardSimple key={i} />
          ))}
        </div>
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonClientCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (userType !== "contador") return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Mis Clientes
          </h1>
          <p className="text-muted-foreground mt-1">Gestiona tu cartera de contribuyentes</p>
        </div>

        <div className="flex gap-2">
          <LinkClientDialog
            open={vincularDialogOpen}
            onOpenChange={setVincularDialogOpen}
            contadorId={contador!.id}
            onSuccess={refreshContribuyentesAsignados}
          />
          <CreateClientDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            contadorId={contador!.id}
            onSuccess={refreshContribuyentesAsignados}
          />
        </div>
      </div>

      {/* Stat Cards */}
      <ClientsStatCards
        statusSummary={statusSummary}
        deadlineGroups={deadlineGroups}
        contribuyenteActivo={contribuyenteActivo}
        clients={clients}
      />

      {/* Deadline Timeline */}
      {clients.length > 0 && (
        <DeadlineTimeline
          deadlineGroups={deadlineGroups}
          selectedDay={timelineDay}
          onSelectDay={setTimelineDay}
        />
      )}

      {/* Toolbar */}
      <ClientsToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Client list */}
      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No hay clientes</h3>
            <p className="text-muted-foreground text-center mt-1">
              {searchQuery || statusFilter !== "todos" || timelineDay !== null
                ? "No se encontraron clientes con esos filtros"
                : "Comienza agregando tu primer cliente"}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        <ClientsTableView clients={filteredClients} onSelect={handleSelect} onUnlink={handleUnlink} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <ClientCard key={client.ruc} client={client} onSelect={handleSelect} onUnlink={handleUnlink} />
          ))}
        </div>
      )}
    </div>
  );
}
