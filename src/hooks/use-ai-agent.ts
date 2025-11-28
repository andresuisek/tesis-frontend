"use client";

import { useContext } from "react";

import { AiAgentContext } from "@/contexts/ai-agent-context";

export function useAiAgent() {
  const context = useContext(AiAgentContext);

  if (!context) {
    throw new Error("useAiAgent debe usarse dentro de un AiAgentProvider");
  }

  return context;
}

