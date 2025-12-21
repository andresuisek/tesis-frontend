"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormFieldWrapper } from "@/components/forms/form-field-wrapper";
import {
  Users,
  Plus,
  Search,
  Building,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  UserCheck,
  Loader2,
  AlertCircle,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase, Contribuyente, ActividadEconomica } from "@/lib/supabase";

interface NuevoContribuyenteForm {
  ruc: string;
  first_name: string;
  last_name: string;
  telefono: string;
  email: string;
  direccion: string;
  cargas_familiares: number;
  obligado_contab: boolean;
  agente_retencion: boolean;
  tipo_obligacion: "mensual" | "semestral";
  actividades_economicas: string[];
}

export default function ClientesPage() {
  const {
    userType,
    contador,
    contribuyentesAsignados,
    contribuyenteActivo,
    setContribuyenteActivo,
    refreshContribuyentesAsignados,
    loading: authLoading,
  } = useAuth();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vincularDialogOpen, setVincularDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vincularRuc, setVincularRuc] = useState("");
  const [vincularLoading, setVincularLoading] = useState(false);

  // Estado para actividades económicas
  const [actividadesDisponibles, setActividadesDisponibles] = useState<
    ActividadEconomica[]
  >([]);
  const [searchActividad, setSearchActividad] = useState("");

  const [formData, setFormData] = useState<NuevoContribuyenteForm>({
    ruc: "",
    first_name: "",
    last_name: "",
    telefono: "",
    email: "",
    direccion: "",
    cargas_familiares: 0,
    obligado_contab: false,
    agente_retencion: false,
    tipo_obligacion: "mensual",
    actividades_economicas: [],
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Redireccionar si no es contador (solo cuando ya sabemos el tipo)
  useEffect(() => {
    // Solo redirigir si ya terminó de cargar Y el tipo de usuario está definido Y no es contador
    if (!authLoading && userType !== null && userType !== "contador") {
      router.push("/dashboard");
    }
  }, [authLoading, userType, router]);

  // Cargar actividades económicas
  useEffect(() => {
    const cargarActividades = async () => {
      try {
        const { data, error } = await supabase
          .from("actividades_economicas")
          .select("*")
          .order("descripcion");

        if (error) throw error;
        setActividadesDisponibles(data || []);
      } catch (error) {
        console.error("Error cargando actividades:", error);
      }
    };

    cargarActividades();
  }, []);

  // Filtrar contribuyentes según búsqueda
  const contribuyentesFiltrados = contribuyentesAsignados.filter((asignado) => {
    if (!asignado.contribuyente) return false;
    const c = asignado.contribuyente;
    const query = searchQuery.toLowerCase();
    return (
      c.ruc.toLowerCase().includes(query) ||
      c.first_name?.toLowerCase().includes(query) ||
      c.last_name?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query)
    );
  });

  // Filtrar actividades para búsqueda
  const actividadesFiltradas = actividadesDisponibles.filter((actividad) =>
    actividad.descripcion.toLowerCase().includes(searchActividad.toLowerCase())
  );

  const handleInputChange = (
    field: keyof NuevoContribuyenteForm,
    value: string | number | boolean | string[]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const toggleActividad = (codigo: string) => {
    const current = formData.actividades_economicas;
    if (current.includes(codigo)) {
      handleInputChange(
        "actividades_economicas",
        current.filter((c) => c !== codigo)
      );
    } else {
      handleInputChange("actividades_economicas", [...current, codigo]);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.ruc) {
      newErrors.ruc = "El RUC es requerido";
    } else if (!/^\d{13}$/.test(formData.ruc)) {
      newErrors.ruc = "El RUC debe tener exactamente 13 dígitos";
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = "El nombre es requerido";
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = "El apellido es requerido";
    }
    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }
    if (!formData.telefono.trim()) {
      newErrors.telefono = "El teléfono es requerido";
    }
    if (formData.actividades_economicas.length === 0) {
      newErrors.actividades_economicas =
        "Debe seleccionar al menos una actividad";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCrearContribuyente = async () => {
    if (!validateForm() || !contador) return;

    setLoading(true);

    try {
      // 1. Crear el contribuyente (sin user_id ya que no tiene cuenta propia)
      const { error: contribuyenteError } = await supabase
        .from("contribuyentes")
        .insert({
          ruc: formData.ruc,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          telefono: formData.telefono,
          direccion: formData.direccion,
          cargas_familiares: formData.cargas_familiares,
          obligado_contab: formData.obligado_contab,
          agente_retencion: formData.agente_retencion,
          tipo_obligacion: formData.tipo_obligacion,
          estado: "activo",
          user_id: null, // No tiene cuenta propia, es gestionado por el contador
        });

      if (contribuyenteError) {
        if (contribuyenteError.code === "23505") {
          throw new Error("Ya existe un contribuyente con ese RUC");
        }
        throw new Error(contribuyenteError.message);
      }

      // 2. Crear las actividades económicas
      if (formData.actividades_economicas.length > 0) {
        const actividadesRelaciones = formData.actividades_economicas.map(
          (codigo) => ({
            contribuyente_ruc: formData.ruc,
            actividad_codigo: codigo,
          })
        );

        const { error: actividadesError } = await supabase
          .from("contribuyente_actividad")
          .insert(actividadesRelaciones);

        if (actividadesError) {
          console.error("Error al asociar actividades:", actividadesError);
        }
      }

      // 3. Crear la relación contador-contribuyente
      const { error: relacionError } = await supabase
        .from("contador_contribuyente")
        .insert({
          contador_id: contador.id,
          contribuyente_ruc: formData.ruc,
          estado: "activo",
        });

      if (relacionError) {
        throw new Error(
          `Error al vincular contribuyente: ${relacionError.message}`
        );
      }

      toast.success("Contribuyente creado y vinculado exitosamente");
      setDialogOpen(false);
      resetForm();
      refreshContribuyentesAsignados();
    } catch (error: unknown) {
      console.error("Error al crear contribuyente:", error);
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVincularExistente = async () => {
    if (!vincularRuc.trim() || !contador) {
      toast.error("Ingresa el RUC del contribuyente");
      return;
    }

    if (!/^\d{13}$/.test(vincularRuc)) {
      toast.error("El RUC debe tener 13 dígitos");
      return;
    }

    setVincularLoading(true);

    try {
      // Usar función RPC para buscar contribuyente (bypasea RLS)
      const { data: resultados, error: searchError } = await supabase
        .rpc("buscar_contribuyente_para_vincular", { p_ruc: vincularRuc });

      if (searchError) {
        console.error("Error en búsqueda:", searchError);
        throw new Error("Error al buscar el contribuyente");
      }

      if (!resultados || resultados.length === 0) {
        throw new Error("No se encontró un contribuyente activo con ese RUC");
      }

      const contribuyente = resultados[0];

      // Verificar si ya está vinculado
      if (contribuyente.ya_vinculado) {
        throw new Error("Este contribuyente ya está vinculado a tu cuenta");
      }

      // Crear la relación
      const { error: relacionError } = await supabase
        .from("contador_contribuyente")
        .insert({
          contador_id: contador.id,
          contribuyente_ruc: vincularRuc,
          estado: "activo",
        });

      if (relacionError) {
        throw new Error(relacionError.message);
      }

      toast.success(
        `Contribuyente ${contribuyente.first_name} ${contribuyente.last_name} vinculado exitosamente`
      );
      setVincularDialogOpen(false);
      setVincularRuc("");
      refreshContribuyentesAsignados();
    } catch (error: unknown) {
      console.error("Error al vincular contribuyente:", error);
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error(message);
    } finally {
      setVincularLoading(false);
    }
  };

  const handleDesvincular = async (contribuyenteRuc: string) => {
    if (!contador) return;

    try {
      const { error } = await supabase
        .from("contador_contribuyente")
        .update({ estado: "inactivo", fecha_desactivacion: new Date().toISOString() })
        .eq("contador_id", contador.id)
        .eq("contribuyente_ruc", contribuyenteRuc);

      if (error) throw error;

      toast.success("Contribuyente desvinculado");

      // Si era el activo, limpiar
      if (contribuyenteActivo?.ruc === contribuyenteRuc) {
        setContribuyenteActivo(null);
      }

      refreshContribuyentesAsignados();
    } catch (error) {
      console.error("Error al desvincular:", error);
      toast.error("Error al desvincular contribuyente");
    }
  };

  const handleSeleccionar = (contribuyente: Contribuyente) => {
    setContribuyenteActivo(contribuyente);
    toast.success(
      `Trabajando con ${contribuyente.first_name} ${contribuyente.last_name}`
    );
    router.push("/dashboard");
  };

  const resetForm = () => {
    setFormData({
      ruc: "",
      first_name: "",
      last_name: "",
      telefono: "",
      email: "",
      direccion: "",
      cargas_familiares: 0,
      obligado_contab: false,
      agente_retencion: false,
      tipo_obligacion: "mensual",
      actividades_economicas: [],
    });
    setErrors({});
    setSearchActividad("");
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userType !== "contador") {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Mis Clientes
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tu cartera de contribuyentes
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={vincularDialogOpen} onOpenChange={setVincularDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <LinkIcon className="h-4 w-4 mr-2" />
                Vincular Existente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Vincular Contribuyente Existente</DialogTitle>
                <DialogDescription>
                  Ingresa el RUC de un contribuyente ya registrado en el sistema
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <FormFieldWrapper label="RUC del Contribuyente" required>
                  <Input
                    type="text"
                    value={vincularRuc}
                    onChange={(e) =>
                      setVincularRuc(
                        e.target.value.replace(/\D/g, "").slice(0, 13)
                      )
                    }
                    placeholder="1234567890001"
                    maxLength={13}
                  />
                </FormFieldWrapper>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setVincularDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleVincularExistente}
                  disabled={vincularLoading}
                >
                  {vincularLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <LinkIcon className="h-4 w-4 mr-2" />
                  )}
                  Vincular
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Contribuyente</DialogTitle>
                <DialogDescription>
                  Crea un nuevo contribuyente y vincúlalo a tu cartera
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* RUC */}
                <FormFieldWrapper
                  label="RUC"
                  required
                  error={errors.ruc}
                  description="Registro Único de Contribuyentes (13 dígitos)"
                >
                  <Input
                    type="text"
                    value={formData.ruc}
                    onChange={(e) =>
                      handleInputChange(
                        "ruc",
                        e.target.value.replace(/\D/g, "").slice(0, 13)
                      )
                    }
                    placeholder="1234567890001"
                    maxLength={13}
                  />
                </FormFieldWrapper>

                {/* Nombres */}
                <div className="grid grid-cols-2 gap-4">
                  <FormFieldWrapper
                    label="Nombres"
                    required
                    error={errors.first_name}
                  >
                    <Input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) =>
                        handleInputChange("first_name", e.target.value)
                      }
                      placeholder="Juan Carlos"
                    />
                  </FormFieldWrapper>

                  <FormFieldWrapper
                    label="Apellidos"
                    required
                    error={errors.last_name}
                  >
                    <Input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) =>
                        handleInputChange("last_name", e.target.value)
                      }
                      placeholder="Pérez González"
                    />
                  </FormFieldWrapper>
                </div>

                {/* Contacto */}
                <div className="grid grid-cols-2 gap-4">
                  <FormFieldWrapper
                    label="Email"
                    required
                    error={errors.email}
                  >
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      placeholder="cliente@email.com"
                    />
                  </FormFieldWrapper>

                  <FormFieldWrapper
                    label="Teléfono"
                    required
                    error={errors.telefono}
                  >
                    <Input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) =>
                        handleInputChange(
                          "telefono",
                          e.target.value.replace(/\D/g, "").slice(0, 10)
                        )
                      }
                      placeholder="0987654321"
                      maxLength={10}
                    />
                  </FormFieldWrapper>
                </div>

                {/* Dirección */}
                <FormFieldWrapper label="Dirección">
                  <Input
                    type="text"
                    value={formData.direccion}
                    onChange={(e) =>
                      handleInputChange("direccion", e.target.value)
                    }
                    placeholder="Av. Principal 123"
                  />
                </FormFieldWrapper>

                {/* Configuración tributaria */}
                <div className="grid grid-cols-3 gap-4">
                  <FormFieldWrapper label="Cargas Familiares">
                    <Input
                      type="number"
                      min="0"
                      value={formData.cargas_familiares}
                      onChange={(e) =>
                        handleInputChange(
                          "cargas_familiares",
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  </FormFieldWrapper>

                  <FormFieldWrapper label="Tipo Obligación">
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.tipo_obligacion}
                      onChange={(e) =>
                        handleInputChange(
                          "tipo_obligacion",
                          e.target.value as "mensual" | "semestral"
                        )
                      }
                    >
                      <option value="mensual">Mensual</option>
                      <option value="semestral">Semestral</option>
                    </select>
                  </FormFieldWrapper>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Opciones</label>
                    <div className="space-y-1">
                      <label className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.obligado_contab}
                          onChange={(e) =>
                            handleInputChange(
                              "obligado_contab",
                              e.target.checked
                            )
                          }
                          className="h-4 w-4"
                        />
                        <span>Obligado contab.</span>
                      </label>
                      <label className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.agente_retencion}
                          onChange={(e) =>
                            handleInputChange(
                              "agente_retencion",
                              e.target.checked
                            )
                          }
                          className="h-4 w-4"
                        />
                        <span>Agente retención</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Actividades Económicas */}
                <div className="space-y-3">
                  <FormFieldWrapper
                    label="Actividades Económicas"
                    required
                    error={errors.actividades_economicas}
                  >
                    <Input
                      type="text"
                      value={searchActividad}
                      onChange={(e) => setSearchActividad(e.target.value)}
                      placeholder="Buscar actividades..."
                    />
                  </FormFieldWrapper>

                  <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2">
                    {actividadesFiltradas.slice(0, 20).map((actividad) => (
                      <div
                        key={actividad.codigo}
                        onClick={() => toggleActividad(actividad.codigo)}
                        className={`p-2 rounded cursor-pointer text-sm ${
                          formData.actividades_economicas.includes(
                            actividad.codigo
                          )
                            ? "bg-primary/10 border border-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{actividad.descripcion}</span>
                          {formData.actividades_economicas.includes(
                            actividad.codigo
                          ) && <CheckCircle className="h-4 w-4 text-primary" />}
                        </div>
                      </div>
                    ))}
                  </div>

                  {formData.actividades_economicas.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {formData.actividades_economicas.map((codigo) => {
                        const act = actividadesDisponibles.find(
                          (a) => a.codigo === codigo
                        );
                        return (
                          <Badge
                            key={codigo}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => toggleActividad(codigo)}
                          >
                            {act?.descripcion || codigo}
                            <XCircle className="h-3 w-3 ml-1" />
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCrearContribuyente} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Crear y Vincular
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {contribuyentesAsignados.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {
                contribuyentesAsignados.filter(
                  (a) => a.contribuyente?.estado === "activo"
                ).length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cliente Activo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold truncate">
              {contribuyenteActivo
                ? `${contribuyenteActivo.first_name} ${contribuyenteActivo.last_name}`
                : "Ninguno seleccionado"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por RUC, nombre o email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de Clientes */}
      {contribuyentesFiltrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No hay clientes</h3>
            <p className="text-muted-foreground text-center mt-1">
              {searchQuery
                ? "No se encontraron clientes con esa búsqueda"
                : "Comienza agregando tu primer cliente"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contribuyentesFiltrados.map((asignado) => {
            const c = asignado.contribuyente!;
            const isActive = contribuyenteActivo?.ruc === c.ruc;

            return (
              <Card
                key={asignado.id}
                className={`relative transition-all hover:shadow-md ${
                  isActive ? "ring-2 ring-primary" : ""
                }`}
              >
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="default" className="text-xs">
                      <UserCheck className="h-3 w-3 mr-1" />
                      Activo
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" />
                    {c.first_name} {c.last_name}
                  </CardTitle>
                  <CardDescription className="font-mono">
                    RUC: {c.ruc}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    {c.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                    {c.telefono && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{c.telefono}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Vinculado:{" "}
                        {new Date(asignado.fecha_asignacion).toLocaleDateString(
                          "es-EC"
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Badge
                      variant={c.estado === "activo" ? "default" : "secondary"}
                    >
                      {c.estado === "activo" ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {c.estado}
                    </Badge>
                    <Badge variant="outline">
                      {c.tipo_obligacion === "mensual" ? "Mensual" : "Semestral"}
                    </Badge>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant={isActive ? "secondary" : "default"}
                      className="flex-1"
                      onClick={() => handleSeleccionar(c)}
                      disabled={isActive}
                    >
                      {isActive ? "Seleccionado" : "Trabajar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDesvincular(c.ruc)}
                    >
                      Desvincular
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

