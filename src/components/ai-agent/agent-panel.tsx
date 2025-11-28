"use client";

import { Lightbulb, Shield } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MessageList } from "@/components/ai-agent/message-list";
import { AgentComposer } from "@/components/ai-agent/agent-composer";
import { useAiAgent } from "@/hooks/use-ai-agent";

export function AgentPanel() {
  const { isPanelOpen, openPanel, closePanel } = useAiAgent();

  return (
    <Sheet
      open={isPanelOpen}
      onOpenChange={(open) => (open ? openPanel() : closePanel())}
    >
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b px-6 pb-4 pt-8">
          <SheetTitle className="text-left text-2xl font-semibold">
            Asistente Tributario
          </SheetTitle>
          <SheetDescription className="text-left text-sm">
            Describe tu necesidad y el agente ejecutará las consultas en
            Supabase para mostrarte información amigable.
          </SheetDescription>
        </SheetHeader>

        <div className="flex h-full flex-1 flex-col gap-4 overflow-hidden px-6 pb-6 pt-4">
          <div className="flex-1 overflow-hidden rounded-2xl border border-border/50 bg-muted/30 p-4 backdrop-blur-sm">
            <MessageList />
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden />
              <span>
                Describe qué necesitas y recibirás resultados listos para usar
              </span>
            </div>
            <AgentComposer />
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-muted/60 px-4 py-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4 text-emerald-500" aria-hidden />
            Tu RUC y filtros obligatorios se aplican automáticamente en cada
            consulta.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
