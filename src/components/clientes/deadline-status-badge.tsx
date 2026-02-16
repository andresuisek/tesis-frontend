import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, CheckCircle2, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeadlineStatus } from "@/lib/tax-deadlines";

interface DeadlineStatusBadgeProps {
  status: DeadlineStatus;
  daysUntilDeadline?: number;
  compact?: boolean;
  className?: string;
}

const statusConfig: Record<
  DeadlineStatus,
  { label: string; icon: typeof AlertCircle; colorClasses: string }
> = {
  vencido: {
    label: "Vencido",
    icon: AlertCircle,
    colorClasses: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900",
  },
  por_vencer: {
    label: "Por vencer",
    icon: Clock,
    colorClasses: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900",
  },
  cumplido: {
    label: "Cumplido",
    icon: CheckCircle2,
    colorClasses: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900",
  },
  sin_actividad: {
    label: "Sin actividad",
    icon: Minus,
    colorClasses: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800",
  },
};

function getDaysLabel(status: DeadlineStatus, days?: number): string {
  if (days === undefined) return statusConfig[status].label;
  if (status === "cumplido" || status === "sin_actividad") return statusConfig[status].label;
  if (status === "vencido") {
    const absDays = Math.abs(days);
    return absDays === 1 ? "Hace 1 día" : `Hace ${absDays} días`;
  }
  // por_vencer
  if (days === 0) return "Vence hoy";
  return days === 1 ? "Vence mañana" : `Vence en ${days} días`;
}

export function DeadlineStatusBadge({ status, daysUntilDeadline, compact, className }: DeadlineStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const label = compact ? config.label : getDaysLabel(status, daysUntilDeadline);

  return (
    <Badge
      variant="outline"
      className={cn(
        config.colorClasses,
        status === "vencido" && "animate-deadline-pulse",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
