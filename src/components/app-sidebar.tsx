"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calculator,
  FileText,
  Home,
  Receipt,
  ShoppingCart,
  TrendingUp,
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
  SidebarRail,
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
    title: "Carga Tributaria",
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
];

// Menú exclusivo para contadores
const contadorItems = [
  {
    title: "Mis Clientes",
    url: "/modules/clientes",
    icon: Briefcase,
  },
];


export function AppSidebar() {
  const { user, userType, contribuyente, contador, contribuyenteActivo } =
    useAuth();
  const pathname = usePathname();

  // Helper para detectar ruta activa
  const isActive = (url: string) =>
    pathname === url || pathname.startsWith(url + "/");

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
  const showTributaryModules =
    userType === "contribuyente" ||
    (userType === "contador" && contribuyenteActivo !== null);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 bg-sidebar-primary text-sidebar-primary-foreground group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <FileText className="h-4 w-4" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold">Sistema Tributario</span>
            <span className="text-xs opacity-80">v1.0.0 - Profesional</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Selector de contribuyente para contadores */}
        {userType === "contador" && (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Cliente Activo</SidebarGroupLabel>
            <SidebarGroupContent>
              <SelectorContribuyente compact />
              {contribuyenteActivo && (
                <div className="mt-2 px-2 text-xs text-muted-foreground">
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
          <SidebarGroup>
            <SidebarGroupLabel>Gestión de Clientes</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {contadorItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Módulos principales - Solo visible cuando hay un contribuyente activo */}
        {showTributaryModules && (
          <SidebarGroup>
            <SidebarGroupLabel>Módulos Principales</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainItems.map((item) => {
                  const parentActive =
                    isActive(item.url) ||
                    !!item.items?.some((sub) => isActive(sub.url));

                  return (
                    <Collapsible
                      key={item.title}
                      asChild
                      defaultOpen={parentActive}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        {item.items ? (
                          <>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                tooltip={item.title}
                                isActive={parentActive}
                              >
                                <item.icon />
                                <span>{item.title}</span>
                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                <SidebarMenuSubItem>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={isActive(item.url)}
                                  >
                                    <Link href={item.url}>
                                      <span>Ver Todas</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                {item.items.map((subItem) => (
                                  <SidebarMenuSubItem key={subItem.title}>
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={isActive(subItem.url)}
                                    >
                                      <Link href={subItem.url}>
                                        <subItem.icon />
                                        <span>{subItem.title}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </>
                        ) : (
                          <SidebarMenuButton
                            asChild
                            isActive={isActive(item.url)}
                            tooltip={item.title}
                          >
                            <Link href={item.url}>
                              <item.icon />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}


        {/* Mensaje para contadores sin cliente activo */}
        {userType === "contador" && !contribuyenteActivo && (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <div className="mx-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 p-4">
              <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
                Selecciona un cliente para acceder a los módulos tributarios
              </p>
            </div>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:gap-0">
            <Avatar className="h-8 w-8 shrink-0 border-2 border-sidebar-primary">
              <AvatarImage src="/avatars/01.png" />
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-bold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold truncate max-w-[120px]">
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
          <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
            <ModeToggle />
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <Link href="/logout">
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Cerrar sesión</span>
              </Link>
            </Button>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
