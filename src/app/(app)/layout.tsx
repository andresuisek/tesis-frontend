"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { AgentPanel } from "@/components/ai-agent/agent-panel";
import { AgentLauncher } from "@/components/ai-agent/agent-launcher";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AiAgentProvider } from "@/contexts/ai-agent-context";
import { useAuth } from "@/contexts/auth-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { userType, contribuyenteActivo } = useAuth();

  // Mostrar el asistente solo si:
  // - Es un contribuyente (siempre tiene su propio contribuyente)
  // - O es un contador Y tiene un cliente activo seleccionado
  const showAgent = userType === "contribuyente" || 
    (userType === "contador" && contribuyenteActivo !== null);

  return (
    <AiAgentProvider>
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1">
          <div className="flex h-screen flex-col">
            <header className="flex items-center gap-4 border-b bg-background px-6 py-4">
              <SidebarTrigger />
              <div className="flex flex-1 flex-col">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Plataforma de control fiscal
                </p>
                <h1 className="text-lg font-semibold text-foreground">
                  Sistema de Gestión Tributaria
                </h1>
              </div>
            </header>
            <div className="flex-1 overflow-auto p-6">{children}</div>
          </div>
        </main>
        {showAgent && (
          <>
            <AgentLauncher />
            <AgentPanel />
          </>
        )}
      </SidebarProvider>
    </AiAgentProvider>
  );
}
