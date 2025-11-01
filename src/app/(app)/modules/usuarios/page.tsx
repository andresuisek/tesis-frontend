"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  Users,
  Shield,
  Settings,
  MoreHorizontal,
  UserCheck,
  UserX,
} from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Tipo de datos para usuarios
type Usuario = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: "Administrador" | "Contador" | "Asistente" | "Solo Lectura";
  estado: "Activo" | "Inactivo" | "Suspendido";
  fechaCreacion: string;
  ultimoAcceso: string;
  avatar?: string;
  permisos: string[];
  empresa?: string;
};

// Datos de ejemplo
const usuariosData: Usuario[] = [
  {
    id: "1",
    nombre: "Juan Carlos",
    apellido: "Pérez López",
    email: "juan.perez@empresa.com",
    rol: "Administrador",
    estado: "Activo",
    fechaCreacion: "2023-01-15",
    ultimoAcceso: "2024-01-15T10:30:00",
    permisos: ["todos"],
    empresa: "Mi Empresa S.A.",
  },
  {
    id: "2",
    nombre: "María Elena",
    apellido: "González Ruiz",
    email: "maria.gonzalez@empresa.com",
    rol: "Contador",
    estado: "Activo",
    fechaCreacion: "2023-03-10",
    ultimoAcceso: "2024-01-14T16:45:00",
    permisos: ["ventas", "compras", "retenciones", "liquidacion"],
    empresa: "Mi Empresa S.A.",
  },
  {
    id: "3",
    nombre: "Carlos Alberto",
    apellido: "Mendoza Silva",
    email: "carlos.mendoza@empresa.com",
    rol: "Asistente",
    estado: "Activo",
    fechaCreacion: "2023-06-20",
    ultimoAcceso: "2024-01-13T09:15:00",
    permisos: ["ventas", "compras"],
    empresa: "Mi Empresa S.A.",
  },
  {
    id: "4",
    nombre: "Ana Patricia",
    apellido: "Morales Vega",
    email: "ana.morales@empresa.com",
    rol: "Solo Lectura",
    estado: "Inactivo",
    fechaCreacion: "2023-09-05",
    ultimoAcceso: "2023-12-20T14:20:00",
    permisos: ["dashboard"],
    empresa: "Mi Empresa S.A.",
  },
];

// Definición de columnas para la tabla
const columns: ColumnDef<Usuario>[] = [
  {
    accessorKey: "usuario",
    header: "Usuario",
    cell: ({ row }) => {
      const usuario = row.original;
      const iniciales = `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(
        0
      )}`;
      return (
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={usuario.avatar} />
            <AvatarFallback>{iniciales}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">
              {usuario.nombre} {usuario.apellido}
            </div>
            <div className="text-sm text-muted-foreground">{usuario.email}</div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "rol",
    header: "Rol",
    cell: ({ row }) => {
      const rol = row.getValue("rol") as string;
      return (
        <Badge
          variant={
            rol === "Administrador"
              ? "default"
              : rol === "Contador"
              ? "secondary"
              : rol === "Asistente"
              ? "outline"
              : "destructive"
          }
        >
          {rol}
        </Badge>
      );
    },
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => {
      const estado = row.getValue("estado") as string;
      return (
        <Badge
          variant={
            estado === "Activo"
              ? "default"
              : estado === "Inactivo"
              ? "secondary"
              : "destructive"
          }
        >
          {estado}
        </Badge>
      );
    },
  },
  {
    accessorKey: "ultimoAcceso",
    header: "Último Acceso",
    cell: ({ row }) => {
      const fecha = new Date(row.getValue("ultimoAcceso"));
      return (
        <div className="text-sm">
          <div>{fecha.toLocaleDateString("es-EC")}</div>
          <div className="text-muted-foreground">
            {fecha.toLocaleTimeString("es-EC", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      );
    },
  },
  {
    id: "acciones",
    cell: ({ row }) => {
      const usuario = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem>
              {usuario.estado === "Activo" ? (
                <>
                  <UserX className="mr-2 h-4 w-4" />
                  Desactivar
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Activar
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function UsuariosPage() {
  const [showNewUserForm, setShowNewUserForm] = useState(false);

  // Calcular estadísticas
  const totalUsuarios = usuariosData.length;
  const usuariosActivos = usuariosData.filter(
    (u) => u.estado === "Activo"
  ).length;
  const administradores = usuariosData.filter(
    (u) => u.rol === "Administrador"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground">
            Administra usuarios, roles y permisos del sistema
          </p>
        </div>
        <Button onClick={() => setShowNewUserForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Métricas de usuarios */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Usuarios
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsuarios}</div>
            <p className="text-xs text-muted-foreground">
              Registrados en el sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Usuarios Activos
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usuariosActivos}</div>
            <p className="text-xs text-muted-foreground">
              Con acceso al sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Administradores
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{administradores}</div>
            <p className="text-xs text-muted-foreground">
              Con permisos completos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conexiones Hoy
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              Accesos en las últimas 24h
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>
            Gestiona todos los usuarios registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={usuariosData}
            searchKey="usuario"
            searchPlaceholder="Buscar por nombre o email..."
          />
        </CardContent>
      </Card>

      {/* Sección de roles y permisos */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Roles del Sistema</CardTitle>
            <CardDescription>
              Configuración de roles y sus permisos asociados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  rol: "Administrador",
                  descripcion: "Acceso completo a todas las funciones",
                  permisos: [
                    "Todos los módulos",
                    "Gestión de usuarios",
                    "Configuración",
                  ],
                  color: "bg-red-500",
                },
                {
                  rol: "Contador",
                  descripcion: "Acceso a módulos contables y tributarios",
                  permisos: ["Ventas", "Compras", "Retenciones", "Liquidación"],
                  color: "bg-blue-500",
                },
                {
                  rol: "Asistente",
                  descripcion: "Acceso limitado a módulos operativos",
                  permisos: ["Ventas", "Compras", "Dashboard"],
                  color: "bg-green-500",
                },
                {
                  rol: "Solo Lectura",
                  descripcion: "Solo visualización de reportes",
                  permisos: ["Dashboard", "Reportes"],
                  color: "bg-gray-500",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start space-x-3 p-3 border rounded-lg"
                >
                  <div className={`w-3 h-3 rounded-full ${item.color} mt-1`} />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{item.rol}</h4>
                      <Badge variant="outline">
                        {usuariosData.filter((u) => u.rol === item.rol).length}{" "}
                        usuarios
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.descripcion}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.permisos.map((permiso, j) => (
                        <Badge key={j} variant="secondary" className="text-xs">
                          {permiso}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              Últimas acciones realizadas por los usuarios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  usuario: "Juan Carlos Pérez",
                  accion: "Inició sesión",
                  tiempo: "Hace 2 horas",
                  tipo: "login",
                },
                {
                  usuario: "María Elena González",
                  accion: "Creó una nueva venta",
                  tiempo: "Hace 4 horas",
                  tipo: "create",
                },
                {
                  usuario: "Carlos Alberto Mendoza",
                  accion: "Actualizó información de compra",
                  tiempo: "Ayer",
                  tipo: "update",
                },
                {
                  usuario: "Juan Carlos Pérez",
                  accion: "Creó nuevo usuario",
                  tiempo: "Hace 2 días",
                  tipo: "admin",
                },
              ].map((item, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      item.tipo === "login"
                        ? "bg-green-500"
                        : item.tipo === "create"
                        ? "bg-blue-500"
                        : item.tipo === "update"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{item.usuario}</span>{" "}
                      {item.accion}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.tiempo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal para nuevo usuario - placeholder */}
      {showNewUserForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Nuevo Usuario</CardTitle>
              <CardDescription>
                Crear una nueva cuenta de usuario en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Formulario de nuevo usuario será implementado aquí...
              </p>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewUserForm(false)}
                >
                  Cancelar
                </Button>
                <Button>Crear Usuario</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
