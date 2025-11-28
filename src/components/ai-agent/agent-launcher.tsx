"use client";

import { Sparkles, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAiAgent } from "@/hooks/use-ai-agent";

export function AgentLauncher() {
  const { openPanel, isProcessing } = useAiAgent();

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <div className="rounded-2xl bg-background/90 px-4 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur">
        ¿Necesitas ayuda? Pregúntale al agente inteligente.
      </div>
      <Button
        type="button"
        size="lg"
        className="pointer-events-auto flex items-center gap-2 rounded-full px-5 py-6 shadow-2xl"
        onClick={openPanel}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {isProcessing ? "Generando..." : "Abrir asistente"}
      </Button>
    </div>
  );
}

