"use client";

import { useState, useEffect } from "react";
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
import { FormFieldWrapper } from "@/components/forms/form-field-wrapper";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  EyeOff,
  UserPlus,
  FileText,
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Building,
  Briefcase,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase, ActividadEconomica } from "@/lib/supabase";
import Link from "next/link";

interface RegistroFormData {
  // Paso 1: Datos de autenticación
  email: string;
  password: string;
  confirmPassword: string;

  // Paso 2: Datos personales y tributarios
  ruc: string;
  first_name: string;
  last_name: string;
  telefono: string;
  direccion: string;
  cargas_familiares: number;
  obligado_contab: boolean;
  agente_retencion: boolean;
  tipo_obligacion: "mensual" | "semestral";

  // Paso 3: Actividades económicas
  actividades_economicas: string[];
}

const STEPS = [
  {
    id: 1,
    title: "Datos de Acceso",
    description: "Configura tu email y contraseña",
    icon: User,
  },
  {
    id: 2,
    title: "Información Personal",
    description: "Datos del contribuyente",
    icon: Building,
  },
  {
    id: 3,
    title: "Actividades Económicas",
    description: "Selecciona tus actividades",
    icon: Briefcase,
  },
];

export default function RegistroPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estado para actividades económicas
  const [actividadesDisponibles, setActividadesDisponibles] = useState<
    ActividadEconomica[]
  >([]);
  const [nuevaActividad, setNuevaActividad] = useState("");
  const [searchActividad, setSearchActividad] = useState("");

  const [formData, setFormData] = useState<RegistroFormData>({
    email: "",
    password: "",
    confirmPassword: "",
    ruc: "",
    first_name: "",
    last_name: "",
    telefono: "",
    direccion: "",
    cargas_familiares: 0,
    obligado_contab: false,
    agente_retencion: false,
    tipo_obligacion: "mensual",
    actividades_economicas: [],
  });

  // Cargar actividades económicas disponibles
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

  const handleInputChange = (
    field: keyof RegistroFormData,
    value: string | number | boolean | string[]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateRUCInput = (
    ruc: string
  ): { isValid: boolean; message: string } => {
    if (!/^\d{13}$/.test(ruc)) {
      return {
        isValid: false,
        message: "El RUC debe tener exactamente 13 dígitos",
      };
    }

    return {
      isValid: true,
      message: "RUC válido",
    };
  };

  const validateStep = (step: number): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (step === 1) {
      // Validaciones Paso 1: Autenticación
      if (!formData.email) {
        newErrors.email = "El email es requerido";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Email inválido";
      }

      if (!formData.password) {
        newErrors.password = "La contraseña es requerida";
      } else if (formData.password.length < 6) {
        newErrors.password = "La contraseña debe tener al menos 6 caracteres";
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Confirma tu contraseña";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Las contraseñas no coinciden";
      }
    }

    if (step === 2) {
      // Validaciones Paso 2: Datos personales
      if (!formData.ruc) {
        newErrors.ruc = "El RUC es requerido";
      } else {
        const rucValidation = validateRUCInput(formData.ruc);
        if (!rucValidation.isValid) {
          newErrors.ruc = rucValidation.message;
        }
      }

      if (!formData.first_name.trim()) {
        newErrors.first_name = "El nombre es requerido";
      }

      if (!formData.last_name.trim()) {
        newErrors.last_name = "El apellido es requerido";
      }

      if (!formData.telefono.trim()) {
        newErrors.telefono = "El teléfono es requerido";
      } else if (!/^\d{10}$/.test(formData.telefono.replace(/\D/g, ""))) {
        newErrors.telefono = "El teléfono debe tener 10 dígitos";
      }

      if (!formData.direccion.trim()) {
        newErrors.direccion = "La dirección es requerida";
      }

      if (formData.cargas_familiares < 0) {
        newErrors.cargas_familiares =
          "Las cargas familiares no pueden ser negativas";
      }
    }

    if (step === 3) {
      // Validaciones Paso 3: Actividades económicas
      if (formData.actividades_economicas.length === 0) {
        newErrors.actividades_economicas =
          "Debe seleccionar al menos una actividad económica";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const agregarActividad = async () => {
    if (!nuevaActividad.trim()) return;

    const descripcionNormalizada = nuevaActividad.trim().toUpperCase();

    try {
      // Buscar si ya existe una actividad con esa descripción
      const { data: existente } = await supabase
        .from("actividades_economicas")
        .select("codigo, descripcion")
        .eq("descripcion", descripcionNormalizada)
        .maybeSingle();

      let codigo: string;

      if (existente) {
        // Ya existe, usar el código existente
        codigo = existente.codigo;
        toast.info("Actividad encontrada");
      } else {
        // No existe, crear nueva actividad
        const { data: ultimaActividad } = await supabase
          .from("actividades_economicas")
          .select("codigo")
          .order("codigo", { ascending: false })
          .limit(1)
          .maybeSingle();

        let siguienteNumero = 1;
        if (ultimaActividad?.codigo) {
          const numeroActual = parseInt(
            ultimaActividad.codigo.replace(/\D/g, "")
          );
          siguienteNumero = numeroActual + 1;
        }

        codigo = `ACT${siguienteNumero.toString().padStart(6, "0")}`;

        // Crear la nueva actividad
        const { error } = await supabase.from("actividades_economicas").insert({
          codigo,
          descripcion: descripcionNormalizada,
          aplica_iva: true,
        });

        if (error) throw error;

        // Actualizar lista local
        const nuevaActividadObj: ActividadEconomica = {
          codigo,
          descripcion: descripcionNormalizada,
          aplica_iva: true,
        };
        setActividadesDisponibles((prev) => [...prev, nuevaActividadObj]);
        toast.success("Nueva actividad creada");
      }

      // Agregar a las actividades seleccionadas si no está ya
      if (!formData.actividades_economicas.includes(codigo)) {
        handleInputChange("actividades_economicas", [
          ...formData.actividades_economicas,
          codigo,
        ]);
        toast.success("Actividad agregada a tu selección");
      } else {
        toast.info("Esta actividad ya está seleccionada");
      }

      setNuevaActividad("");
    } catch (error: any) {
      console.error("Error agregando actividad:", error);
      toast.error("Error al agregar actividad: " + error.message);
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

  const handleRegistro = async () => {
    if (!validateStep(3)) return;

    setLoading(true);

    try {
      // 1. Crear usuario en auth.users
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            ruc: formData.ruc,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Error al crear usuario");

      // 2. Crear registro en tabla contribuyentes
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
          user_id: authData.user.id,
        });

      if (contribuyenteError) {
        console.error("Error al crear contribuyente:", contribuyenteError);
        throw new Error(
          `Error al crear el perfil del contribuyente: ${contribuyenteError.message}`
        );
      }

      // 3. Insertar actividades económicas del contribuyente
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
          throw new Error("Error al asociar actividades económicas");
        }
      }

      toast.success("¡Registro exitoso! Ya puedes iniciar sesión.");
      router.push("/login");
    } catch (error: any) {
      console.error("Error en registro:", error);
      toast.error(error.message || "Error al registrar usuario");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar actividades para búsqueda
  const actividadesFiltradas = actividadesDisponibles.filter((actividad) =>
    actividad.descripcion.toLowerCase().includes(searchActividad.toLowerCase())
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <FormFieldWrapper
              label="Correo Electrónico"
              required
              error={errors.email}
            >
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="usuario@empresa.com"
                disabled={loading}
              />
            </FormFieldWrapper>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormFieldWrapper
                label="Contraseña"
                required
                error={errors.password}
              >
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </FormFieldWrapper>

              <FormFieldWrapper
                label="Confirmar Contraseña"
                required
                error={errors.confirmPassword}
              >
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </FormFieldWrapper>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <FormFieldWrapper
              label="RUC"
              required
              error={errors.ruc}
              description="Registro Único de Contribuyentes (13 dígitos)"
            >
              <Input
                type="text"
                value={formData.ruc}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 13);
                  handleInputChange("ruc", value);
                }}
                placeholder="1234567890001"
                disabled={loading}
                maxLength={13}
              />
            </FormFieldWrapper>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  disabled={loading}
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
                  disabled={loading}
                />
              </FormFieldWrapper>
            </div>

            <FormFieldWrapper label="Teléfono" required error={errors.telefono}>
              <Input
                type="tel"
                value={formData.telefono}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                  handleInputChange("telefono", value);
                }}
                placeholder="0987654321"
                disabled={loading}
                maxLength={10}
              />
            </FormFieldWrapper>

            <FormFieldWrapper
              label="Dirección"
              required
              error={errors.direccion}
            >
              <Input
                type="text"
                value={formData.direccion}
                onChange={(e) => handleInputChange("direccion", e.target.value)}
                placeholder="Av. Principal 123 y Secundaria"
                disabled={loading}
              />
            </FormFieldWrapper>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormFieldWrapper
                label="Cargas Familiares"
                error={errors.cargas_familiares}
              >
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={formData.cargas_familiares}
                  onChange={(e) =>
                    handleInputChange(
                      "cargas_familiares",
                      parseInt(e.target.value) || 0
                    )
                  }
                  placeholder="0"
                  disabled={loading}
                />
              </FormFieldWrapper>

              <FormFieldWrapper label="Tipo de Obligación">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.tipo_obligacion}
                  onChange={(e) =>
                    handleInputChange(
                      "tipo_obligacion",
                      e.target.value as "mensual" | "semestral"
                    )
                  }
                  disabled={loading}
                >
                  <option value="mensual">Mensual</option>
                  <option value="semestral">Semestral</option>
                </select>
              </FormFieldWrapper>

              <div className="space-y-3">
                <label className="text-sm font-medium">Características</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.obligado_contab}
                      onChange={(e) =>
                        handleInputChange("obligado_contab", e.target.checked)
                      }
                      disabled={loading}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">
                      Obligado a llevar contabilidad
                    </span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.agente_retencion}
                      onChange={(e) =>
                        handleInputChange("agente_retencion", e.target.checked)
                      }
                      disabled={loading}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Agente de retención</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Agregar nueva actividad */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Agregar Nueva Actividad</h3>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={nuevaActividad}
                  onChange={(e) => setNuevaActividad(e.target.value)}
                  placeholder="Describe tu actividad económica..."
                  disabled={loading}
                  onKeyPress={(e) => e.key === "Enter" && agregarActividad()}
                />
                <Button
                  type="button"
                  onClick={agregarActividad}
                  disabled={loading || !nuevaActividad.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Buscar actividades existentes */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                O selecciona de las existentes
              </h3>
              <Input
                type="text"
                value={searchActividad}
                onChange={(e) => setSearchActividad(e.target.value)}
                placeholder="Buscar actividades..."
                disabled={loading}
              />
            </div>

            {/* Lista de actividades disponibles */}
            <div className="max-h-60 overflow-y-auto space-y-2">
              {actividadesFiltradas.map((actividad) => (
                <div
                  key={actividad.codigo}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.actividades_economicas.includes(actividad.codigo)
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => toggleActividad(actividad.codigo)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {actividad.descripcion}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Código: {actividad.codigo}
                        {actividad.aplica_iva && " • Aplica IVA"}
                      </p>
                    </div>
                    {formData.actividades_economicas.includes(
                      actividad.codigo
                    ) && <Check className="h-4 w-4 text-primary" />}
                  </div>
                </div>
              ))}
            </div>

            {/* Actividades seleccionadas */}
            {formData.actividades_economicas.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">
                  Actividades Seleccionadas
                </h3>
                <div className="space-y-2">
                  {formData.actividades_economicas.map((codigo) => {
                    const actividad = actividadesDisponibles.find(
                      (a) => a.codigo === codigo
                    );
                    return (
                      <div
                        key={codigo}
                        className="flex items-center justify-between p-2 bg-primary/5 rounded-lg"
                      >
                        <span className="text-sm">
                          {actividad?.descripcion || codigo}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActividad(codigo)}
                          disabled={loading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {errors.actividades_economicas && (
              <p className="text-sm text-destructive">
                {errors.actividades_economicas}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="h-6 w-6" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Registro de Contribuyente</h1>
          <p className="text-muted-foreground">
            Completa la información en {STEPS.length} pasos sencillos
          </p>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-center space-x-4">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isCompleted
                      ? "bg-primary border-primary text-primary-foreground"
                      : isCurrent
                      ? "border-primary text-primary"
                      : "border-muted-foreground text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-2 ${
                      isCompleted ? "bg-primary" : "bg-muted-foreground"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Info */}
        <div className="text-center">
          <h2 className="text-xl font-semibold">
            {STEPS[currentStep - 1].title}
          </h2>
          <p className="text-muted-foreground">
            {STEPS[currentStep - 1].description}
          </p>
        </div>

        {/* Registration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="mr-2 h-5 w-5" />
              Paso {currentStep} de {STEPS.length}
            </CardTitle>
            <CardDescription>
              {STEPS[currentStep - 1].description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {renderStepContent()}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <div>
                {currentStep === 1 ? (
                  <Link href="/login">
                    <Button variant="outline">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Volver al Login
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={loading}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Anterior
                  </Button>
                )}
              </div>

              <div>
                {currentStep === STEPS.length ? (
                  <Button
                    onClick={handleRegistro}
                    disabled={loading}
                    size="lg"
                    className="min-w-40"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Registrando...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Crear Cuenta
                      </>
                    )}
                  </Button>
                ) : (
                  <Button onClick={nextStep} disabled={loading} size="lg">
                    Siguiente
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          © 2024 Sistema Tributario. Todos los derechos reservados.
        </div>
      </div>
    </div>
  );
}
