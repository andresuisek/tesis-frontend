import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <div className="flex h-screen flex-col">
          <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">
                Sistema de Gestión Tributaria
              </h1>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-6">{children}</div>
        </div>
      </main>
    </SidebarProvider>
  );
}
