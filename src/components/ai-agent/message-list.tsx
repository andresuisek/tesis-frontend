"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  UserRound,
  Bot,
  Database,
  ListChecks,
  CheckCircle2,
  Sparkles,
  Globe,
  Search,
  Code2,
  FileText,
  HelpCircle,
  ArrowRight,
  Copy,
  Check,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import posthog from "posthog-js";

import { cn } from "@/lib/utils";
import { useAiAgent } from "@/hooks/use-ai-agent";
import { useAuth } from "@/contexts/auth-context";
import { AgentChart } from "@/components/ai-agent/agent-chart";
import { EmptyState } from "@/components/ai-agent/empty-state";
import type {
  StreamPhase,
  AgentMessage,
  NavigationAction,
} from "@/contexts/ai-agent-context";

const phaseConfig: Record<
  Exclude<StreamPhase, null>,
  { label: string; icon: React.ReactNode }
> = {
  routing: {
    label: "Analizando tu pregunta...",
    icon: <Search className="h-3.5 w-3.5 animate-spin" />,
  },
  generating_sql: {
    label: "Generando consulta segura...",
    icon: <Code2 className="h-3.5 w-3.5 animate-pulse" />,
  },
  executing_query: {
    label: "Consultando base de datos...",
    icon: <Database className="h-3.5 w-3.5 animate-pulse" />,
  },
  formatting: {
    label: "Redactando respuesta...",
    icon: <FileText className="h-3.5 w-3.5 animate-pulse" />,
  },
  thinking: {
    label: "Preparando guía...",
    icon: <HelpCircle className="h-3.5 w-3.5 animate-pulse" />,
  },
};

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

  const hiddenColumns = new Set([
    "id",
    "contribuyente_ruc",
    "user_id",
    "created_at",
    "updated_at",
    "deleted_at",
  ]);
  const columns = Object.keys(rows[0])
    .filter((col) => !hiddenColumns.has(col))
    .slice(0, 5);
  if (!columns.length) {
    return null;
  }

  const limitedRows = rows.slice(0, 5);

  // Hide table if all cell values are null/undefined/empty
  const hasAnyValue = limitedRows.some((row) =>
    columns.some(
      (col) =>
        row[col] !== null && row[col] !== undefined && row[col] !== ""
    )
  );
  if (!hasAnyValue) {
    return null;
  }

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
                  <td
                    key={column}
                    className="px-2 py-1 text-muted-foreground"
                  >
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

function SearchSources({ sources }: { sources: string[] }) {
  if (!sources.length) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Globe className="h-3.5 w-3.5 text-primary" />
        Fuentes consultadas
      </div>
      <div className="mt-2 space-y-1.5">
        {sources.map((url) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Globe className="h-3 w-3 shrink-0" />
            {url.length > 60 ? url.slice(0, 60) + "..." : url}
          </a>
        ))}
      </div>
    </div>
  );
}

function NavigationActions({
  actions,
  onNavigate,
}: {
  actions: NavigationAction[];
  onNavigate: (route: string) => void;
}) {
  if (!actions.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.route}
          type="button"
          onClick={() => onNavigate(action.route)}
          className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 hover:border-primary/50"
        >
          <ArrowRight className="h-3 w-3" />
          {action.label}
        </button>
      ))}
    </div>
  );
}

function FollowUpSuggestions({
  followUp,
  followUps,
  onFollowUp,
  disabled,
}: {
  followUp?: string;
  followUps?: string[];
  onFollowUp: (question: string) => void;
  disabled: boolean;
}) {
  // Merge followUp (singular) and followUps (array) for backward compat
  const allSuggestions = [
    ...(followUps ?? []),
    ...(followUp && !followUps?.includes(followUp) ? [followUp] : []),
  ].filter(Boolean);

  if (!allSuggestions.length) return null;

  return (
    <div className="space-y-1.5">
      {allSuggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onFollowUp(suggestion)}
          disabled={disabled}
          className="flex w-full items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/20"
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          {suggestion}
        </button>
      ))}
    </div>
  );
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Respuesta copiada");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
      title="Copiar respuesta"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </button>
  );
}

function FeedbackButtons({
  messageId,
  currentFeedback,
  onFeedback,
}: {
  messageId: string;
  currentFeedback?: "positive" | "negative";
  onFeedback: (messageId: string, feedback: "positive" | "negative") => void;
}) {
  const handleFeedback = (feedback: "positive" | "negative") => {
    onFeedback(messageId, feedback);
    posthog.capture("ai_query_feedback", {
      rating: feedback,
      messageId,
    });
  };

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        type="button"
        onClick={() => handleFeedback("positive")}
        className={cn(
          "p-0.5 rounded hover:bg-muted transition-colors",
          currentFeedback === "positive" && "text-emerald-500 opacity-100"
        )}
        title="Buena respuesta"
      >
        <ThumbsUp className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => handleFeedback("negative")}
        className={cn(
          "p-0.5 rounded hover:bg-muted transition-colors",
          currentFeedback === "negative" && "text-destructive opacity-100"
        )}
        title="Mala respuesta"
      >
        <ThumbsDown className="h-3 w-3" />
      </button>
    </div>
  );
}

export function MessageList() {
  const {
    messages,
    isProcessing,
    streamPhase,
    askAgentStream,
    closePanel,
    setFeedback,
  } = useAiAgent();
  const { contribuyenteEfectivo: contribuyente } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  const handleFollowUp = async (followUpQuestion: string) => {
    if (!contribuyente?.ruc || isProcessing) return;
    await askAgentStream(followUpQuestion, contribuyente.ruc);
  };

  const handleSuggestionClick = async (question: string) => {
    if (!contribuyente?.ruc || isProcessing) return;
    await askAgentStream(question, contribuyente.ruc);
  };

  const handleNavigate = (route: string) => {
    router.push(route);
    closePanel();
  };

  const handleRetry = async (message: AgentMessage) => {
    if (!contribuyente?.ruc || isProcessing) return;
    // Find the user message right before this error
    const idx = messages.findIndex((m) => m.id === message.id);
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        await askAgentStream(messages[i].content, contribuyente.ruc);
        return;
      }
    }
  };

  // Show empty state when only the welcome message exists
  const showEmptyState = messages.length <= 1 && !isProcessing;

  if (!messages.length) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-col gap-3 overflow-y-auto pr-1"
    >
      {showEmptyState ? (
        <EmptyState onSuggestionClick={handleSuggestionClick} />
      ) : (
        messages.map((message) => {
          const isUser = message.role === "user";

          return (
            <div
              key={message.id}
              className={cn(
                "flex w-full animate-agent-fade-in",
                isUser ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "group relative flex max-w-[85%] flex-col gap-2 rounded-2xl border px-4 py-3 text-sm shadow-sm",
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
                    <UserRound
                      className="h-3.5 w-3.5 opacity-70"
                      aria-hidden
                    />
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
                  {!isUser && message.isStreaming && (
                    <span className="ml-auto inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
                  )}
                  {!isUser &&
                    !message.isStreaming &&
                    message.content &&
                    !message.isError && (
                      <div className="ml-auto flex items-center gap-1">
                        <CopyButton content={message.content} />
                        <FeedbackButtons
                          messageId={message.id}
                          currentFeedback={message.feedback}
                          onFeedback={setFeedback}
                        />
                      </div>
                    )}
                </div>

                {isUser ? (
                  <p className="whitespace-pre-line leading-relaxed">
                    {message.content}
                  </p>
                ) : message.content ? (
                  <div className="prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <p className="mb-2 leading-relaxed">{children}</p>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold">{children}</strong>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc pl-4 space-y-1">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal pl-4 space-y-1">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="leading-relaxed">{children}</li>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : null}

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

                {!isUser && message.chartConfig && (
                  <AgentChart config={message.chartConfig} />
                )}

                {!isUser && message.searchSources?.length ? (
                  <SearchSources sources={message.searchSources} />
                ) : null}

                {!isUser &&
                message.navigationActions?.length &&
                !message.isStreaming ? (
                  <NavigationActions
                    actions={message.navigationActions}
                    onNavigate={handleNavigate}
                  />
                ) : null}

                {!isUser && !message.isStreaming && !message.isError ? (
                  <FollowUpSuggestions
                    followUp={message.followUp}
                    followUps={message.followUps}
                    onFollowUp={handleFollowUp}
                    disabled={isProcessing}
                  />
                ) : null}

                {!isUser && message.isError && !message.isStreaming ? (
                  <button
                    type="button"
                    onClick={() => handleRetry(message)}
                    disabled={isProcessing}
                    className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reintentar
                  </button>
                ) : null}
              </div>
            </div>
          );
        })
      )}

      {isProcessing && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground animate-agent-fade-in">
          {streamPhase ? (
            <>
              {phaseConfig[streamPhase].icon}
              {phaseConfig[streamPhase].label}
            </>
          ) : (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generando respuesta segura...
            </>
          )}
        </div>
      )}
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
