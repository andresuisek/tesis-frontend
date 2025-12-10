"use client";

import { createContext, useCallback, useMemo, useState } from "react";

type AgentRole = "user" | "assistant" | "system";

export type AgentMessage = {
  id: string;
  role: AgentRole;
  content: string;
  highlights?: string[];
  followUp?: string;
  rowCount?: number;
  previewRows?: Record<string, unknown>[];
  isError?: boolean;
  createdAt: string;
};

type AiAgentContextValue = {
  isPanelOpen: boolean;
  isProcessing: boolean;
  messages: AgentMessage[];
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setIsProcessing: (state: boolean) => void;
  pushMessage: (
    message: Omit<AgentMessage, "id" | "createdAt"> & { id?: string }
  ) => void;
  askAgent: (question: string, contribuyenteRuc: string) => Promise<void>;
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
          createdAt: new Date().toISOString(),
        },
      ]);
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

  const resetConversation = useCallback(() => {
    setMessages((prev) => (prev.length ? [prev[0]] : []));
    setIsProcessing(false);
  }, []);

  const value = useMemo(
    () => ({
      isPanelOpen,
      isProcessing,
      messages,
      openPanel,
      closePanel,
      togglePanel,
      setIsProcessing,
      pushMessage,
      askAgent,
      resetConversation,
    }),
    [
      isPanelOpen,
      isProcessing,
      messages,
      openPanel,
      closePanel,
      togglePanel,
      pushMessage,
      askAgent,
      resetConversation,
    ]
  );

  return (
    <AiAgentContext.Provider value={value}>{children}</AiAgentContext.Provider>
  );
}
