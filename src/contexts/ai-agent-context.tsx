"use client";

import { createContext, useCallback, useMemo, useState } from "react";

import { createSSEParser } from "@/lib/ai-agent/sse-parser";

type AgentRole = "user" | "assistant" | "system";

export type ChartType = "bar" | "line" | "pie";

export type AgentChartConfig = {
  type: ChartType;
  title: string;
  xKey: string;
  yKeys: string[];
  data: Record<string, unknown>[];
};

export type AgentMessage = {
  id: string;
  role: AgentRole;
  content: string;
  highlights?: string[];
  followUp?: string;
  rowCount?: number;
  previewRows?: Record<string, unknown>[];
  isError?: boolean;
  chartConfig?: AgentChartConfig;
  isStreaming?: boolean;
  searchSources?: string[];
  createdAt: string;
};

export type StreamPhase =
  | "routing"
  | "generating_sql"
  | "executing_query"
  | "formatting"
  | null;

type AiAgentContextValue = {
  isPanelOpen: boolean;
  isProcessing: boolean;
  messages: AgentMessage[];
  streamPhase: StreamPhase;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setIsProcessing: (state: boolean) => void;
  pushMessage: (
    message: Omit<AgentMessage, "id" | "createdAt"> & { id?: string }
  ) => void;
  updateMessage: (id: string, patch: Partial<AgentMessage>) => void;
  askAgent: (question: string, contribuyenteRuc: string) => Promise<void>;
  askAgentStream: (question: string, contribuyenteRuc: string) => Promise<void>;
  resetConversation: () => void;
};

export const AiAgentContext = createContext<AiAgentContextValue | null>(null);

const createMessageId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `agent-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function AiAgentProvider({ children }: { children: React.ReactNode }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamPhase, setStreamPhase] = useState<StreamPhase>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: "welcome-message",
      role: "assistant",
      content:
        "Hola, soy tu agente inteligente. Puedo ayudarte a entender tus datos tributarios.",
      createdAt: new Date().toISOString(),
    },
  ]);

  const openPanel = useCallback(() => setIsPanelOpen(true), []);
  const closePanel = useCallback(() => setIsPanelOpen(false), []);
  const togglePanel = useCallback(() => setIsPanelOpen((prev) => !prev), []);

  const pushMessage = useCallback(
    (message: Omit<AgentMessage, "id" | "createdAt"> & { id?: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: message.id ?? createMessageId(),
          role: message.role,
          content: message.content,
          highlights: message.highlights,
          followUp: message.followUp,
          rowCount: message.rowCount,
          previewRows: message.previewRows,
          isError: message.isError,
          chartConfig: message.chartConfig,
          isStreaming: message.isStreaming,
          searchSources: message.searchSources,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    []
  );

  const updateMessage = useCallback(
    (id: string, patch: Partial<AgentMessage>) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? { ...msg, ...patch } : msg))
      );
    },
    []
  );

  const askAgent = useCallback(
    async (question: string, contribuyenteRuc: string) => {
      const trimmedQuestion = question.trim();
      if (!trimmedQuestion) {
        return;
      }

      const userMessage: AgentMessage = {
        id: createMessageId(),
        role: "user",
        content: trimmedQuestion,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsProcessing(true);

      const sessionHints = messages
        .filter((message) => message.role === "user")
        .slice(-3)
        .map((message) => message.content);

      try {
        const response = await fetch("/api/ai-agent/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: trimmedQuestion,
            contribuyenteRuc,
            sessionHints,
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          pushMessage({
            role: "assistant",
            content:
              payload?.error ??
              "No pude generar una respuesta segura. Intenta reformular tu pregunta.",
            isError: true,
          });
          return;
        }

        pushMessage({
          role: "assistant",
          content: payload.summary ?? "Aquí tienes la respuesta solicitada.",
          highlights: payload.highlights,
          followUp: payload.followUp,
          rowCount: payload.rowCount,
          previewRows: payload.previewRows,
          chartConfig: payload.chartConfig,
        });
      } catch {
        pushMessage({
          role: "assistant",
          content:
            "Hubo un problema de conexión con OpenAI. Por favor, intenta nuevamente en unos segundos.",
          isError: true,
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [messages, pushMessage]
  );

  const askAgentStream = useCallback(
    async (question: string, contribuyenteRuc: string) => {
      const trimmedQuestion = question.trim();
      if (!trimmedQuestion) return;

      // Push user message
      const userMessage: AgentMessage = {
        id: createMessageId(),
        role: "user",
        content: trimmedQuestion,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsProcessing(true);
      setStreamPhase("routing");

      // Create placeholder assistant message
      const assistantId = createMessageId();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          isStreaming: true,
          createdAt: new Date().toISOString(),
        },
      ]);

      const sessionHints = messages
        .filter((m) => m.role === "user")
        .slice(-3)
        .map((m) => m.content);

      let accumulatedText = "";
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const resetTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? {
                    ...msg,
                    content:
                      accumulatedText ||
                      "La respuesta tardo demasiado. Intenta de nuevo.",
                    isStreaming: false,
                    isError: !accumulatedText,
                  }
                : msg
            )
          );
          setIsProcessing(false);
          setStreamPhase(null);
        }, 30_000);
      };

      try {
        const response = await fetch("/api/ai-agent/query-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: trimmedQuestion,
            contribuyenteRuc,
            sessionHints,
          }),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? {
                    ...msg,
                    content:
                      errorPayload?.error ??
                      "No pude procesar tu consulta. Intenta de nuevo.",
                    isStreaming: false,
                    isError: true,
                  }
                : msg
            )
          );
          setIsProcessing(false);
          setStreamPhase(null);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        const parser = createSSEParser();

        resetTimeout();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          resetTimeout();
          const chunk = decoder.decode(value, { stream: true });
          const events = parser.feed(chunk);

          for (const evt of events) {
            if (evt.event === "phase") {
              try {
                const { phase } = JSON.parse(evt.data);
                setStreamPhase(phase);
              } catch {
                // ignore malformed phase
              }
            } else if (evt.event === "delta") {
              try {
                const { text } = JSON.parse(evt.data);
                accumulatedText += text;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantId
                      ? { ...msg, content: accumulatedText }
                      : msg
                  )
                );
              } catch {
                // ignore malformed delta
              }
            } else if (evt.event === "metadata") {
              try {
                const meta = JSON.parse(evt.data);
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantId
                      ? {
                          ...msg,
                          highlights: meta.highlights,
                          followUp: meta.followUp,
                          rowCount: meta.rowCount,
                          previewRows: meta.previewRows,
                          chartConfig: meta.chartConfig ?? undefined,
                          searchSources: meta.searchSources,
                        }
                      : msg
                  )
                );
              } catch {
                // ignore malformed metadata
              }
            } else if (evt.event === "done") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? { ...msg, isStreaming: false }
                    : msg
                )
              );
            }
          }
        }

        // Flush remaining events
        const remaining = parser.flush();
        for (const evt of remaining) {
          if (evt.event === "delta") {
            try {
              const { text } = JSON.parse(evt.data);
              accumulatedText += text;
            } catch {
              // ignore
            }
          }
        }

        // Ensure streaming is marked complete
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: accumulatedText, isStreaming: false }
              : msg
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content:
                    accumulatedText ||
                    "Hubo un problema de conexion. Por favor, intenta nuevamente.",
                  isStreaming: false,
                  isError: !accumulatedText,
                }
              : msg
          )
        );
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        setIsProcessing(false);
        setStreamPhase(null);
      }
    },
    [messages]
  );

  const resetConversation = useCallback(() => {
    setMessages((prev) => (prev.length ? [prev[0]] : []));
    setIsProcessing(false);
    setStreamPhase(null);
  }, []);

  const value = useMemo(
    () => ({
      isPanelOpen,
      isProcessing,
      messages,
      streamPhase,
      openPanel,
      closePanel,
      togglePanel,
      setIsProcessing,
      pushMessage,
      updateMessage,
      askAgent,
      askAgentStream,
      resetConversation,
    }),
    [
      isPanelOpen,
      isProcessing,
      messages,
      streamPhase,
      openPanel,
      closePanel,
      togglePanel,
      pushMessage,
      updateMessage,
      askAgent,
      askAgentStream,
      resetConversation,
    ]
  );

  return (
    <AiAgentContext.Provider value={value}>{children}</AiAgentContext.Provider>
  );
}
