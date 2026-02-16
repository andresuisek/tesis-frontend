import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building, Phone, Mail, Calendar, CheckCircle, XCircle, UserCheck, CalendarClock, DollarSign } from "lucide-react";
import { DeadlineStatusBadge } from "./deadline-status-badge";
import type { ClientOverviewData } from "@/hooks/use-clients-overview";

interface ClientCardProps {
  client: ClientOverviewData;
  onSelect: (ruc: string) => void;
  onUnlink: (ruc: string) => void;
}

const regimenLabels: Record<string, string> = {
  general: "General",
  rimpe_negocio_popular: "RIMPE Popular",
  rimpe_emprendedor: "RIMPE Emprendedor",
};

const obligacionLabels: Record<string, string> = {
  mensual: "Mensual",
  semestral: "Semestral",
  anual: "Anual",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function ClientCard({ client, onSelect, onUnlink }: ClientCardProps) {
  return (
    <Card
      className={`relative transition-all hover:shadow-md ${client.isActive ? "ring-2 ring-primary" : ""}`}
    >
      {/* Top-right badges */}
      <div className="absolute top-2 right-2 flex gap-1.5 items-center">
        <DeadlineStatusBadge
          status={client.deadlineStatus}
          daysUntilDeadline={client.deadlineInfo.daysUntilDeadline}
          compact
        />
        {client.isActive && (
          <Badge variant="default" className="text-xs">
            <UserCheck className="h-3 w-3 mr-1" />
            Activo
          </Badge>
        )}
      </div>

      <CardHeader className="pb-2 pr-36">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building className="h-5 w-5 text-primary shrink-0" />
          <span className="truncate">{client.firstName} {client.lastName}</span>
        </CardTitle>
        <CardDescription className="font-mono">RUC: {client.ruc}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Contact info */}
        <div className="space-y-1.5 text-sm">
          {client.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          {client.telefono && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{client.telefono}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>Vinculado: {new Date(client.fechaAsignacion).toLocaleDateString("es-EC")}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            <span>Vence: {client.deadlineInfo.nextDeadlineDate.format("DD MMM YYYY")}</span>
          </div>
        </div>

        {/* Financial mini-summary */}
        {client.financial.transactionCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md px-2.5 py-1.5">
            <DollarSign className="h-3 w-3 shrink-0" />
            <span>V: {formatCurrency(client.financial.totalVentas)}</span>
            <span className="text-border">|</span>
            <span>C: {formatCurrency(client.financial.totalCompras)}</span>
          </div>
        )}

        {/* Badges row */}
        <div className="flex gap-1.5 flex-wrap">
          <Badge
            variant={client.estado === "activo" ? "outline" : "secondary"}
            className={client.estado === "activo" ? "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/30 dark:text-green-400" : ""}
          >
            {client.estado === "activo" ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
            {client.estado}
          </Badge>
          <Badge variant="outline">{obligacionLabels[client.tipoObligacion] ?? client.tipoObligacion}</Badge>
          <Badge variant="outline">{regimenLabels[client.tipoRegimen] ?? client.tipoRegimen}</Badge>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant={client.isActive ? "secondary" : "default"}
            className="flex-1"
            onClick={() => onSelect(client.ruc)}
            disabled={client.isActive}
          >
            {client.isActive ? "Seleccionado" : "Trabajar"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onUnlink(client.ruc)}>
            Desvincular
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
