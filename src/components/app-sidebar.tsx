"use client";

import {
  Building2,
  Calculator,
  ChartBar,
  FileText,
  Home,
  MessageSquare,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Users,
  Settings,
  LogOut,
  FileX,
  ChevronRight,
  Briefcase,
  Sparkles,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/mode-toggle";
import { SelectorContribuyente } from "@/components/contador/selector-contribuyente";
import { useAuth } from "@/contexts/auth-context";

// Menú de navegación principal (común para todos)
const mainItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Asistente",
    url: "/modules/assistant",
    icon: Sparkles,
  },
  {
    title: "Ventas",
    url: "/modules/ventas",
    icon: TrendingUp,
    items: [
      {
        title: "Notas de Crédito",
        url: "/modules/notas-credito",
        icon: FileX,
      },
      {
        title: "Retenciones",
        url: "/modules/retenciones",
        icon: Receipt,
      },
    ],
  },
  {
    title: "Compras",
    url: "/modules/compras",
    icon: ShoppingCart,
  },
  {
    title: "Liquidación",
    url: "/modules/liquidacion",
    icon: Calculator,
  },
  {
    title: "Registro RUC",
    url: "/modules/registro-ruc",
    icon: Building2,
  },
];

// Menú exclusivo para contadores
const contadorItems = [
  {
    title: "Mis Clientes",
    url: "/modules/clientes",
    icon: Briefcase,
  },
];

// Menú de administración
const adminItems = [
  {
    title: "Usuarios",
    url: "/modules/usuarios",
    icon: Users,
  },
  {
    title: "Reportes",
    url: "/modules/reportes",
    icon: ChartBar,
  },
  {
    title: "Chatbot",
    url: "/modules/chatbot",
    icon: MessageSquare,
  },
  {
    title: "Configuración",
    url: "/modules/ajustes",
    icon: Settings,
  },
];

export function AppSidebar() {
  const { user, userType, contribuyente, contador, contribuyenteActivo } =
    useAuth();

  // Obtener nombre para mostrar
  const displayName = (() => {
    if (userType === "contador" && contador) {
      return `${contador.first_name} ${contador.last_name}`;
    }
    if (userType === "contribuyente" && contribuyente) {
      return `${contribuyente.first_name} ${contribuyente.last_name}`;
    }
    return user?.email || "Usuario";
  })();

  // Obtener iniciales para el avatar
  const initials = (() => {
    if (userType === "contador" && contador) {
      return `${contador.first_name?.[0] || ""}${contador.last_name?.[0] || ""}`.toUpperCase();
    }
    if (userType === "contribuyente" && contribuyente) {
      return `${contribuyente.first_name?.[0] || ""}${contribuyente.last_name?.[0] || ""}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  })();

  // Rol para mostrar
  const roleLabel = userType === "contador" ? "Contador" : "Contribuyente";

  // Determinar si debe mostrar los módulos tributarios
  // - Contribuyentes: siempre ven los módulos
  // - Contadores: solo ven los módulos si tienen un cliente activo seleccionado
  const showTributaryModules = userType === "contribuyente" || 
    (userType === "contador" && contribuyenteActivo !== null);

  return (
    <Sidebar className="border-r border-gray-200 dark:border-gray-800">
      <SidebarHeader className="p-4 bg-gradient-to-r from-[#0A192F] to-[#1D4ED8] text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold">Sistema Tributario</span>
            <span className="text-xs text-white/80">v1.0.0 - Profesional</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white dark:bg-gray-950">
        {/* Selector de contribuyente para contadores */}
        {userType === "contador" && (
          <SidebarGroup className="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
            <SidebarGroupLabel className="text-[#0A192F] dark:text-white font-semibold text-xs uppercase tracking-wide mb-2">
              Cliente Activo
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SelectorContribuyente compact />
              {contribuyenteActivo && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Trabajando con:{" "}
                  <span className="font-medium">
                    {contribuyenteActivo.first_name}{" "}
                    {contribuyenteActivo.last_name}
                  </span>
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Módulos exclusivos para contadores */}
        {userType === "contador" && (
          <SidebarGroup className="px-3 py-2">
            <SidebarGroupLabel className="text-[#0A192F] dark:text-white font-semibold text-xs uppercase tracking-wide mb-2">
              Gestión de Clientes
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {contadorItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className="hover:bg-[#14B8A6]/10 hover:text-[#14B8A6] transition-all duration-200 rounded-lg group"
                    >
                      <a
                        href={item.url}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <item.icon className="h-4 w-4 text-[#0A192F] dark:text-white group-hover:text-[#14B8A6]" />
                        <span className="text-[#0A192F] dark:text-white group-hover:text-[#14B8A6] font-medium">
                          {item.title}
                        </span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Módulos principales - Solo visible cuando hay un contribuyente activo */}
        {showTributaryModules && (
          <SidebarGroup className="px-3 py-2">
            <SidebarGroupLabel className="text-[#0A192F] dark:text-white font-semibold text-xs uppercase tracking-wide mb-2">
              Módulos Principales
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {mainItems.map((item) => (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={false}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      {item.items ? (
                        <>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton className="hover:bg-[#1D4ED8]/10 hover:text-[#1D4ED8] transition-all duration-200 rounded-lg group">
                              <item.icon className="h-4 w-4 text-[#0A192F] dark:text-white group-hover:text-[#1D4ED8]" />
                              <span className="text-[#0A192F] dark:text-white group-hover:text-[#1D4ED8] font-medium">
                                {item.title}
                              </span>
                              <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild>
                                  <a href={item.url}>
                                    <span>Ver Todas</span>
                                  </a>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              {item.items.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton asChild>
                                    <a href={subItem.url}>
                                      <subItem.icon className="h-4 w-4" />
                                      <span>{subItem.title}</span>
                                    </a>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </>
                      ) : (
                        <SidebarMenuButton
                          asChild
                          className="hover:bg-[#1D4ED8]/10 hover:text-[#1D4ED8] transition-all duration-200 rounded-lg group"
                        >
                          <a
                            href={item.url}
                            className="flex items-center gap-3 px-3 py-2"
                          >
                            <item.icon className="h-4 w-4 text-[#0A192F] dark:text-white group-hover:text-[#1D4ED8]" />
                            <span className="text-[#0A192F] dark:text-white group-hover:text-[#1D4ED8] font-medium">
                              {item.title}
                            </span>
                          </a>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  </Collapsible>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Administración - Solo visible cuando hay un contribuyente activo */}
        {showTributaryModules && (
          <SidebarGroup className="px-3 py-2">
            <SidebarGroupLabel className="text-[#0A192F] dark:text-white font-semibold text-xs uppercase tracking-wide mb-2">
              Administración
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className="hover:bg-[#14B8A6]/10 hover:text-[#14B8A6] transition-all duration-200 rounded-lg group"
                    >
                      <a
                        href={item.url}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <item.icon className="h-4 w-4 text-[#0A192F] dark:text-white group-hover:text-[#14B8A6]" />
                        <span className="text-[#0A192F] dark:text-white group-hover:text-[#14B8A6] font-medium">
                          {item.title}
                        </span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Mensaje para contadores sin cliente activo */}
        {userType === "contador" && !contribuyenteActivo && (
          <SidebarGroup className="px-3 py-4">
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 p-4">
              <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
                Selecciona un cliente para acceder a los módulos tributarios
              </p>
            </div>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-[#1D4ED8]">
              <AvatarImage src="/avatars/01.png" />
              <AvatarFallback className="bg-[#1D4ED8] text-white font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#0A192F] dark:text-white truncate max-w-[120px]">
                {displayName}
              </span>
              <Badge
                variant={userType === "contador" ? "default" : "secondary"}
                className="text-xs w-fit"
              >
                {roleLabel}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors"
            >
              <a href="/logout">
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Cerrar sesión</span>
              </a>
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
