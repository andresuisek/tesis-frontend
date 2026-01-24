"use client";

import { Sparkles, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAiAgent } from "@/hooks/use-ai-agent";

export function AgentLauncher() {
  const { openPanel, isProcessing } = useAiAgent();

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
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
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <p>¿Necesitas ayuda? Pregúntale al agente inteligente.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

