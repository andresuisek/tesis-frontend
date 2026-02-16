"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { AgentPanel } from "@/components/ai-agent/agent-panel";
import { AgentLauncher } from "@/components/ai-agent/agent-launcher";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { AiAgentProvider } from "@/contexts/ai-agent-context";
import { useAuth } from "@/contexts/auth-context";

export function AppShell({ children }: { children: React.ReactNode }) {
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
            <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
              <SidebarTrigger className="-ml-1" />
              <div className="mx-1 h-4 w-px shrink-0 bg-border" />
              <BreadcrumbNav />
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


