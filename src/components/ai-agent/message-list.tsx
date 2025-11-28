"use client";

import { useEffect, useRef } from "react";
import {
  Loader2,
  UserRound,
  Bot,
  Database,
  ListChecks,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAiAgent } from "@/hooks/use-ai-agent";

function HighlightsList({ items }: { items: string[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <ListChecks className="h-3.5 w-3.5 text-primary" />
        Hallazgos clave
      </div>
      <div className="mt-2 space-y-2 text-sm text-muted-foreground">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RowsTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) {
    return null;
  }

  const columns = Object.keys(rows[0]).slice(0, 5);
  if (!columns.length) {
    return null;
  }

  const limitedRows = rows.slice(0, 5);

  return (
    <div className="rounded-xl border border-border/60 bg-background/80 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Database className="h-3.5 w-3.5 text-primary" />
        Vista previa (máx. {limitedRows.length} filas)
      </div>
      <div className="max-h-48 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-muted text-muted-foreground">
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-2 py-1 text-left font-medium capitalize"
                >
                  {column.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {limitedRows.map((row, rowIndex) => (
              <tr
                key={`${rowIndex}`}
                className="border-b border-border/40 last:border-none"
              >
                {columns.map((column) => (
                  <td key={column} className="px-2 py-1 text-muted-foreground">
                    {formatCellValue(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MessageList() {
  const { messages, isProcessing } = useAiAgent();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }
    node.scrollTo({
      top: node.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isProcessing]);

  if (!messages.length) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-col gap-3 overflow-y-auto pr-1"
    >
      {messages.map((message) => {
        const isUser = message.role === "user";

        return (
          <div
            key={message.id}
            className={cn(
              "flex w-full",
              isUser ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "relative flex max-w-[85%] flex-col gap-2 rounded-2xl border px-4 py-3 text-sm shadow-sm",
                isUser &&
                  "border-primary/20 bg-primary text-primary-foreground",
                !isUser &&
                  !message.isError &&
                  "border-border/60 bg-white dark:bg-slate-900/70 dark:text-slate-50",
                message.isError &&
                  "border-destructive/40 bg-destructive/10 text-destructive"
              )}
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                {isUser ? (
                  <UserRound className="h-3.5 w-3.5 opacity-70" aria-hidden />
                ) : (
                  <Bot className="h-3.5 w-3.5 opacity-70" aria-hidden />
                )}
                <span className="font-semibold">
                  {isUser
                    ? "Tú"
                    : message.isError
                    ? "Agente (error)"
                    : "Agente"}
                </span>
              </div>
              <p className="whitespace-pre-line leading-relaxed">
                {message.content}
              </p>
              {!isUser && typeof message.rowCount === "number" ? (
                <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
                  <Database className="h-3.5 w-3.5" />
                  Total de registros analizados: {message.rowCount}
                </div>
              ) : null}
              {!isUser && message.highlights?.length ? (
                <HighlightsList items={message.highlights} />
              ) : null}
              {!isUser && message.previewRows?.length ? (
                <RowsTable rows={message.previewRows} />
              ) : null}
              {!isUser && message.followUp ? (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Siguiente paso sugerido: {message.followUp}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
      {isProcessing ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Generando respuesta segura...
        </div>
      ) : null}
    </div>
  );
}

function formatCellValue(value: unknown) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "number") {
    return new Intl.NumberFormat("es-EC", {
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (value instanceof Date) {
    return value.toLocaleDateString("es-EC");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}
