"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAiAgent } from "@/hooks/use-ai-agent";

export function AgentBar() {
  const { openPanel, isProcessing } = useAiAgent();

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-4 py-3 shadow-sm dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500 dark:text-slate-300">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        <span>Agente inteligente</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <p className="flex-1 text-left text-[0.9rem] text-slate-600 dark:text-slate-200">
          Formula consultas en lenguaje natural y obtén SQL seguro para tus datos.
        </p>
        <Button size="sm" variant="secondary" onClick={openPanel} disabled={isProcessing}>
          {isProcessing ? "Pensando..." : "Abrir asistente"}
        </Button>
      </div>
    </div>
  );
}

