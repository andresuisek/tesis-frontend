import dayjs, { Dayjs } from "dayjs";

// ─── Types ───────────────────────────────────────────────────────────

export type DeadlineStatus = "cumplido" | "por_vencer" | "vencido" | "sin_actividad";
export type UrgencyLevel = "critical" | "warning" | "ok" | "done";

export interface TaxDeadlineInfo {
  novenoDigito: number;
  deadlineDay: number;
  nextDeadlineDate: Dayjs;
  declarationPeriodLabel: string;
  declarationPeriodStart: Dayjs;
  declarationPeriodEnd: Dayjs;
  daysUntilDeadline: number;
  status: DeadlineStatus;
  urgencyLevel: UrgencyLevel;
}

export interface DeadlineGroup {
  date: Dayjs;
  day: number;
  novenoDigitos: number[];
  clients: { ruc: string; name: string; status: DeadlineStatus }[];
  aggregateStatus: DeadlineStatus;
}

// ─── Constants ───────────────────────────────────────────────────────

const DEADLINE_DAY_MAP: Record<number, number> = {
  1: 10,
  2: 12,
  3: 14,
  4: 16,
  5: 18,
  6: 20,
  7: 22,
  8: 24,
  9: 26,
  0: 28,
};

const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ─── Core Functions ──────────────────────────────────────────────────

export function getNovenoDigito(ruc: string): number {
  if (!ruc || ruc.length < 9) return -1;
  return parseInt(ruc.charAt(8), 10);
}

export function getDeadlineDay(novenoDigito: number): number {
  return DEADLINE_DAY_MAP[novenoDigito] ?? 28;
}

/**
 * Calculates the next declaration deadline for a given RUC.
 *
 * For **mensual**: the declaration period is the previous month,
 * and it's due on the deadline day of the current month.
 *
 * For **semestral**: Jan-Jun is due in July, Jul-Dec is due in January.
 *
 * For **anual**: due in March of the following year.
 */
export function getNextDeadline(
  ruc: string,
  tipoObligacion: "mensual" | "semestral" | "anual",
  referenceDate?: Dayjs,
): TaxDeadlineInfo {
  const today = referenceDate ?? dayjs();
  const digito = getNovenoDigito(ruc);
  const deadlineDay = getDeadlineDay(digito);

  let deadlineDate: Dayjs;
  let periodStart: Dayjs;
  let periodEnd: Dayjs;
  let periodLabel: string;

  if (tipoObligacion === "mensual") {
    // The declaration for month M is due on deadline day of month M+1.
    // We figure out which deadline is "next" relative to today.
    const thisMonthDeadline = today.date(deadlineDay);

    if (today.isBefore(thisMonthDeadline) || today.isSame(thisMonthDeadline, "day")) {
      // We haven't passed this month's deadline yet → period = previous month
      deadlineDate = thisMonthDeadline;
      periodStart = today.subtract(1, "month").startOf("month");
      periodEnd = today.subtract(1, "month").endOf("month");
    } else {
      // This month's deadline passed → next one is next month
      deadlineDate = today.add(1, "month").date(deadlineDay);
      periodStart = today.startOf("month");
      periodEnd = today.endOf("month");
    }
    periodLabel = `${MONTH_NAMES_ES[periodStart.month()]} ${periodStart.year()}`;
  } else if (tipoObligacion === "semestral") {
    const month = today.month(); // 0-indexed
    if (month < 6) {
      // First half: Jan-Jun period is declared in July
      const julyDeadline = today.month(6).date(deadlineDay);
      if (today.isBefore(julyDeadline) || today.isSame(julyDeadline, "day")) {
        deadlineDate = julyDeadline;
        periodStart = today.startOf("year");
        periodEnd = today.month(5).endOf("month");
        periodLabel = `Ene-Jun ${today.year()}`;
      } else {
        // July deadline passed → next is January of next year for Jul-Dec
        deadlineDate = today.add(1, "year").month(0).date(deadlineDay);
        periodStart = today.month(6).startOf("month");
        periodEnd = today.endOf("year");
        periodLabel = `Jul-Dic ${today.year()}`;
      }
    } else {
      // Second half: Jul-Dec declared in January next year
      const janDeadline = today.add(1, "year").month(0).date(deadlineDay);
      deadlineDate = janDeadline;
      periodStart = today.month(6).startOf("month");
      periodEnd = today.endOf("year");
      periodLabel = `Jul-Dic ${today.year()}`;
    }
  } else {
    // anual: declared in March of the following year
    const marchDeadline = today.add(1, "year").month(2).date(deadlineDay);
    const thisYearMarch = today.month(2).date(deadlineDay);

    if (today.month() < 3 && (today.isBefore(thisYearMarch) || today.isSame(thisYearMarch, "day"))) {
      // Before March deadline of this year → period is previous year
      deadlineDate = thisYearMarch;
      periodStart = dayjs().year(today.year() - 1).startOf("year");
      periodEnd = dayjs().year(today.year() - 1).endOf("year");
      periodLabel = `Año ${today.year() - 1}`;
    } else {
      deadlineDate = marchDeadline;
      periodStart = today.startOf("year");
      periodEnd = today.endOf("year");
      periodLabel = `Año ${today.year()}`;
    }
  }

  const daysUntil = deadlineDate.startOf("day").diff(today.startOf("day"), "day");

  return {
    novenoDigito: digito,
    deadlineDay,
    nextDeadlineDate: deadlineDate,
    declarationPeriodLabel: periodLabel,
    declarationPeriodStart: periodStart,
    declarationPeriodEnd: periodEnd,
    daysUntilDeadline: daysUntil,
    status: "sin_actividad", // will be refined by getDeadlineStatus
    urgencyLevel: "ok",
  };
}

/**
 * Determines the deadline status based on whether a liquidation exists
 * and how many days remain until the deadline.
 */
export function getDeadlineStatus(
  daysUntilDeadline: number,
  hasLiquidation: boolean,
  hasTransactions: boolean,
): { status: DeadlineStatus; urgencyLevel: UrgencyLevel } {
  if (hasLiquidation) {
    return { status: "cumplido", urgencyLevel: "done" };
  }
  if (!hasTransactions) {
    return { status: "sin_actividad", urgencyLevel: "ok" };
  }
  if (daysUntilDeadline < 0) {
    return { status: "vencido", urgencyLevel: "critical" };
  }
  if (daysUntilDeadline <= 5) {
    return { status: "por_vencer", urgencyLevel: "warning" };
  }
  return { status: "por_vencer", urgencyLevel: "ok" };
}

/**
 * Returns all deadline days for a given month (for timeline display).
 * Each unique deadline day maps to one or more noveno dígitos.
 */
export function getMonthDeadlines(year: number, month: number): { day: number; novenoDigitos: number[] }[] {
  const result: { day: number; novenoDigitos: number[] }[] = [];
  const dayToDigitos = new Map<number, number[]>();

  for (const [digitStr, day] of Object.entries(DEADLINE_DAY_MAP)) {
    const digit = parseInt(digitStr, 10);
    const existing = dayToDigitos.get(day) ?? [];
    existing.push(digit);
    dayToDigitos.set(day, existing);
  }

  // Sort by day
  const sorted = Array.from(dayToDigitos.entries()).sort((a, b) => a[0] - b[0]);

  // Only include days that exist in this month
  const daysInMonth = dayjs().year(year).month(month).daysInMonth();
  for (const [day, digitos] of sorted) {
    if (day <= daysInMonth) {
      result.push({ day, novenoDigitos: digitos });
    }
  }

  return result;
}

/**
 * Groups clients by their deadline date for display.
 */
export function groupClientsByDeadline(
  clients: {
    ruc: string;
    name: string;
    deadlineInfo: TaxDeadlineInfo;
    status: DeadlineStatus;
  }[],
): DeadlineGroup[] {
  const groups = new Map<string, DeadlineGroup>();

  for (const client of clients) {
    const key = client.deadlineInfo.nextDeadlineDate.format("YYYY-MM-DD");
    const existing = groups.get(key);

    if (existing) {
      existing.clients.push({ ruc: client.ruc, name: client.name, status: client.status });
      if (!existing.novenoDigitos.includes(client.deadlineInfo.novenoDigito)) {
        existing.novenoDigitos.push(client.deadlineInfo.novenoDigito);
      }
    } else {
      groups.set(key, {
        date: client.deadlineInfo.nextDeadlineDate,
        day: client.deadlineInfo.deadlineDay,
        novenoDigitos: [client.deadlineInfo.novenoDigito],
        clients: [{ ruc: client.ruc, name: client.name, status: client.status }],
        aggregateStatus: client.status,
      });
    }
  }

  // Determine aggregate status for each group (worst status wins)
  const priority: Record<DeadlineStatus, number> = {
    vencido: 3,
    por_vencer: 2,
    sin_actividad: 1,
    cumplido: 0,
  };

  for (const group of groups.values()) {
    let worst: DeadlineStatus = "cumplido";
    for (const c of group.clients) {
      if (priority[c.status] > priority[worst]) {
        worst = c.status;
      }
    }
    group.aggregateStatus = worst;
  }

  return Array.from(groups.values()).sort((a, b) => a.date.valueOf() - b.date.valueOf());
}
