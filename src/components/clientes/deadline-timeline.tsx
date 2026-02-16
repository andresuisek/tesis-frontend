import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { getMonthDeadlines, type DeadlineGroup, type DeadlineStatus } from "@/lib/tax-deadlines";
import dayjs from "dayjs";

interface DeadlineTimelineProps {
  deadlineGroups: DeadlineGroup[];
  selectedDay: number | null;
  onSelectDay: (day: number | null) => void;
}

const statusColors: Record<DeadlineStatus, string> = {
  vencido: "bg-red-500 text-white dark:bg-red-600",
  por_vencer: "bg-amber-500 text-white dark:bg-amber-600",
  cumplido: "bg-green-500 text-white dark:bg-green-600",
  sin_actividad: "bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

export function DeadlineTimeline({ deadlineGroups, selectedDay, onSelectDay }: DeadlineTimelineProps) {
  const today = dayjs();
  const currentMonth = today.month();
  const currentYear = today.year();
  const todayDate = today.date();

  const monthDeadlines = useMemo(() => getMonthDeadlines(currentYear, currentMonth), [currentYear, currentMonth]);

  // Map deadline day → group info
  const groupByDay = useMemo(() => {
    const map = new Map<number, DeadlineGroup>();
    for (const g of deadlineGroups) {
      if (g.date.month() === currentMonth && g.date.year() === currentYear) {
        map.set(g.day, g);
      }
    }
    return map;
  }, [deadlineGroups, currentMonth, currentYear]);

  const monthName = today.format("MMMM YYYY");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Vencimientos de {monthName}
        </h3>
        {selectedDay !== null && (
          <button
            onClick={() => onSelectDay(null)}
            className="text-xs text-primary hover:underline"
          >
            Mostrar todos
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {monthDeadlines.map(({ day, novenoDigitos }) => {
          const group = groupByDay.get(day);
          const clientCount = group?.clients.length ?? 0;
          const status = group?.aggregateStatus ?? "sin_actividad";
          const isToday = todayDate === day;
          const isSelected = selectedDay === day;
          const isPast = day < todayDate;

          return (
            <button
              key={day}
              onClick={() => onSelectDay(isSelected ? null : day)}
              className={cn(
                "flex flex-col items-center min-w-[60px] rounded-lg px-3 py-2 transition-all border",
                isSelected
                  ? "ring-2 ring-primary border-primary"
                  : "border-border hover:border-primary/50",
                isToday && !isSelected && "border-primary/30",
              )}
            >
              <span className={cn("text-xs font-medium", isPast && clientCount === 0 && "text-muted-foreground")}>
                Día {day}
              </span>
              <div
                className={cn(
                  "mt-1 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold",
                  clientCount > 0 ? statusColors[status] : "bg-muted text-muted-foreground",
                )}
              >
                {clientCount}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1">
                {novenoDigitos.length === 1 ? `d.${novenoDigitos[0]}` : `d.${novenoDigitos.join(",")}`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
