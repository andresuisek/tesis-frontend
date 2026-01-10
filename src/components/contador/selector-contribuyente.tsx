"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  ChevronDown,
  Users,
  UserCheck,
  Search,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Contribuyente } from "@/lib/supabase";
import { Input } from "@/components/ui/input";

interface SelectorContribuyenteProps {
  compact?: boolean;
}

export function SelectorContribuyente({
  compact = false,
}: SelectorContribuyenteProps) {
  const {
    userType,
    contribuyentesAsignados,
    contribuyenteActivo,
    setContribuyenteActivo,
  } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);

  // Solo mostrar para contadores
  if (userType !== "contador") {
    return null;
  }

  const handleSeleccionar = (contribuyente: Contribuyente) => {
    setContribuyenteActivo(contribuyente);
    setOpen(false);
    toast.success(
      `Trabajando con ${contribuyente.first_name} ${contribuyente.last_name}`
    );
  };

  const handleIrAClientes = () => {
    setOpen(false);
    router.push("/modules/clientes");
  };

  // Filtrar contribuyentes
  const contribuyentesFiltrados = contribuyentesAsignados.filter((asignado) => {
    if (!asignado.contribuyente) return false;
    const c = asignado.contribuyente;
    const query = searchQuery.toLowerCase();
    return (
      c.ruc.toLowerCase().includes(query) ||
      c.first_name?.toLowerCase().includes(query) ||
      c.last_name?.toLowerCase().includes(query)
    );
  });

  // Vista compacta para el sidebar
  if (compact) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between gap-2 h-auto py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building className="h-4 w-4 shrink-0 text-primary" />
              <div className="text-left min-w-0">
                {contribuyenteActivo ? (
                  <>
                    <p className="text-xs font-medium truncate">
                      {contribuyenteActivo.first_name}{" "}
                      {contribuyenteActivo.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {contribuyenteActivo.ruc}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Seleccionar cliente
                  </p>
                )}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Cambiar Cliente
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Búsqueda */}
          <div className="px-2 py-1.5">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-7 text-sm"
              />
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Lista de contribuyentes */}
          <div className="max-h-60 overflow-y-auto">
            {contribuyentesFiltrados.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                {searchQuery
                  ? "No se encontraron clientes"
                  : "No tienes clientes asignados"}
              </div>
            ) : (
              contribuyentesFiltrados.map((asignado) => {
                const c = asignado.contribuyente!;
                const isActive = contribuyenteActivo?.ruc === c.ruc;

                return (
                  <DropdownMenuItem
                    key={asignado.id}
                    onClick={() => handleSeleccionar(c)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {c.first_name} {c.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {c.ruc}
                        </p>
                      </div>
                      {isActive && (
                        <Badge variant="secondary" className="shrink-0">
                          <UserCheck className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuItem>
                );
              })
            )}
          </div>

          <DropdownMenuSeparator />

          {/* Acciones */}
          <DropdownMenuItem
            onClick={handleIrAClientes}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Gestionar Clientes
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Vista expandida (para header o páginas)
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Building className="h-4 w-4" />
          {contribuyenteActivo ? (
            <span className="max-w-[200px] truncate">
              {contribuyenteActivo.first_name} {contribuyenteActivo.last_name}
            </span>
          ) : (
            <span className="text-muted-foreground">Seleccionar cliente</span>
          )}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Mis Clientes
          </div>
          <Badge variant="secondary">{contribuyentesAsignados.length}</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Búsqueda */}
        <div className="px-2 py-1.5">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nombre o RUC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Lista de contribuyentes */}
        <div className="max-h-72 overflow-y-auto">
          {contribuyentesFiltrados.length === 0 ? (
            <div className="px-2 py-6 text-center">
              <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "No se encontraron clientes"
                  : "No tienes clientes asignados"}
              </p>
            </div>
          ) : (
            contribuyentesFiltrados.map((asignado) => {
              const c = asignado.contribuyente!;
              const isActive = contribuyenteActivo?.ruc === c.ruc;

              return (
                <DropdownMenuItem
                  key={asignado.id}
                  onClick={() => handleSeleccionar(c)}
                  className={`cursor-pointer px-3 py-2 ${
                    isActive ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-full ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <Building className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {c.first_name} {c.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {c.ruc}
                        </p>
                      </div>
                    </div>
                    {isActive && (
                      <Badge variant="default" className="shrink-0">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Activo
                      </Badge>
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Botón para ir a gestión de clientes */}
        <div className="p-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleIrAClientes}
          >
            <Plus className="h-4 w-4 mr-2" />
            Gestionar Clientes
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


