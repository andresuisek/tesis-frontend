import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileCheck, CalendarClock, UserCheck } from "lucide-react";
import { DeadlineStatusBadge } from "./deadline-status-badge";
import type { StatusSummary, ClientsOverviewResult } from "@/hooks/use-clients-overview";
import type { DeadlineGroup } from "@/lib/tax-deadlines";
import type { Contribuyente } from "@/lib/supabase";
import dayjs from "dayjs";

interface ClientsStatCardsProps {
  statusSummary: StatusSummary;
  deadlineGroups: DeadlineGroup[];
  contribuyenteActivo: Contribuyente | null;
  clients: ClientsOverviewResult["clients"];
}

export function ClientsStatCards({
  statusSummary,
  deadlineGroups,
  contribuyenteActivo,
  clients,
}: ClientsStatCardsProps) {
  const activeClient = contribuyenteActivo
    ? clients.find((c) => c.ruc === contribuyenteActivo.ruc)
    : null;

  const upcomingGroups = deadlineGroups
    .filter((g) => g.date.isAfter(dayjs().subtract(1, "day")))
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Clientes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Clientes</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{statusSummary.total}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {statusSummary.total - statusSummary.sin_actividad} activos, {statusSummary.sin_actividad} sin actividad
          </p>
        </CardContent>
      </Card>

      {/* Estado Declaraciones */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Estado Declaraciones</CardTitle>
          <FileCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span>{statusSummary.cumplido} Cumplidos</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>{statusSummary.por_vencer} Por vencer</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span>{statusSummary.vencido} Vencidos</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Próximos Vencimientos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Próximos Vencimientos</CardTitle>
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {upcomingGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin vencimientos próximos</p>
          ) : (
            <div className="space-y-1.5">
              {upcomingGroups.map((group) => (
                <div key={group.date.format("YYYY-MM-DD")} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{group.date.format("DD MMM")}</span>
                  <span className="text-muted-foreground">
                    {group.clients.length} {group.clients.length === 1 ? "cliente" : "clientes"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cliente Activo */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Cliente Activo</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {contribuyenteActivo ? (
            <div className="space-y-1.5">
              <div className="text-sm font-semibold truncate">
                {contribuyenteActivo.first_name} {contribuyenteActivo.last_name}
              </div>
              {activeClient && (
                <DeadlineStatusBadge
                  status={activeClient.deadlineStatus}
                  daysUntilDeadline={activeClient.deadlineInfo.daysUntilDeadline}
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Ninguno seleccionado</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
