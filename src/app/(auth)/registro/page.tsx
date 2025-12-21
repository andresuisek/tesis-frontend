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
  Calculator,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase, ActividadEconomica, UserType } from "@/lib/supabase";
import Link from "next/link";

// Tipo de datos para contribuyente
interface ContribuyenteFormData {
  ruc: string;
  first_name: string;
  last_name: string;
  telefono: string;
  direccion: string;
  cargas_familiares: number;
  obligado_contab: boolean;
  agente_retencion: boolean;
  tipo_obligacion: "mensual" | "semestral";
  actividades_economicas: string[];
}

// Tipo de datos para contador
interface ContadorFormData {
  first_name: string;
  last_name: string;
  telefono: string;
  email: string;
  direccion: string;
  numero_registro: string;
  especialidad: string;
}

interface RegistroFormData {
  // Paso 0: Tipo de cuenta
  accountType: UserType | null;

  // Paso 1: Datos de autenticación
  email: string;
  password: string;
  confirmPassword: string;

  // Datos específicos según tipo
  contribuyente: ContribuyenteFormData;
  contador: ContadorFormData;
}

// Pasos para Contribuyente
const STEPS_CONTRIBUYENTE = [
  {
    id: 0,
    title: "Tipo de Cuenta",
    description: "Selecciona el tipo de cuenta que deseas crear",
    icon: Users,
  },
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

// Pasos para Contador
const STEPS_CONTADOR = [
  {
    id: 0,
    title: "Tipo de Cuenta",
    description: "Selecciona el tipo de cuenta que deseas crear",
    icon: Users,
  },
  {
    id: 1,
    title: "Datos de Acceso",
    description: "Configura tu email y contraseña",
    icon: User,
  },
  {
    id: 2,
    title: "Información Profesional",
    description: "Datos del contador",
    icon: Calculator,
  },
];

export default function RegistroPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estado para actividades económicas (solo contribuyentes)
  const [actividadesDisponibles, setActividadesDisponibles] = useState<
    ActividadEconomica[]
  >([]);
  const [nuevaActividad, setNuevaActividad] = useState("");
  const [searchActividad, setSearchActividad] = useState("");

  const [formData, setFormData] = useState<RegistroFormData>({
    accountType: null,
    email: "",
    password: "",
    confirmPassword: "",
    contribuyente: {
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
    },
    contador: {
      first_name: "",
      last_name: "",
      telefono: "",
      email: "",
      direccion: "",
      numero_registro: "",
      especialidad: "",
    },
  });

  // Obtener los pasos según el tipo de cuenta
  const STEPS =
    formData.accountType === "contador" ? STEPS_CONTADOR : STEPS_CONTRIBUYENTE;

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
    field: string,
    value: string | number | boolean | string[]
  ) => {
    if (field.startsWith("contribuyente.")) {
      const subField = field.replace("contribuyente.", "");
      setFormData((prev) => ({
        ...prev,
        contribuyente: { ...prev.contribuyente, [subField]: value },
      }));
    } else if (field.startsWith("contador.")) {
      const subField = field.replace("contador.", "");
      setFormData((prev) => ({
        ...prev,
        contador: { ...prev.contador, [subField]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }

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
    return { isValid: true, message: "RUC válido" };
  };

  const validateStep = (step: number): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (step === 0) {
      if (!formData.accountType) {
        newErrors.accountType = "Debes seleccionar un tipo de cuenta";
      }
    }

    if (step === 1) {
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

    if (step === 2 && formData.accountType === "contribuyente") {
      const c = formData.contribuyente;
      if (!c.ruc) {
        newErrors["contribuyente.ruc"] = "El RUC es requerido";
      } else {
        const rucValidation = validateRUCInput(c.ruc);
        if (!rucValidation.isValid) {
          newErrors["contribuyente.ruc"] = rucValidation.message;
        }
      }

      if (!c.first_name.trim()) {
        newErrors["contribuyente.first_name"] = "El nombre es requerido";
      }
      if (!c.last_name.trim()) {
        newErrors["contribuyente.last_name"] = "El apellido es requerido";
      }
      if (!c.telefono.trim()) {
        newErrors["contribuyente.telefono"] = "El teléfono es requerido";
      } else if (!/^\d{10}$/.test(c.telefono.replace(/\D/g, ""))) {
        newErrors["contribuyente.telefono"] = "El teléfono debe tener 10 dígitos";
      }
      if (!c.direccion.trim()) {
        newErrors["contribuyente.direccion"] = "La dirección es requerida";
      }
      if (c.cargas_familiares < 0) {
        newErrors["contribuyente.cargas_familiares"] =
          "Las cargas familiares no pueden ser negativas";
      }
    }

    if (step === 2 && formData.accountType === "contador") {
      const ct = formData.contador;
      if (!ct.first_name.trim()) {
        newErrors["contador.first_name"] = "El nombre es requerido";
      }
      if (!ct.last_name.trim()) {
        newErrors["contador.last_name"] = "El apellido es requerido";
      }
      if (!ct.telefono.trim()) {
        newErrors["contador.telefono"] = "El teléfono es requerido";
      } else if (!/^\d{10}$/.test(ct.telefono.replace(/\D/g, ""))) {
        newErrors["contador.telefono"] = "El teléfono debe tener 10 dígitos";
      }
    }

    if (step === 3 && formData.accountType === "contribuyente") {
      if (formData.contribuyente.actividades_economicas.length === 0) {
        newErrors["contribuyente.actividades_economicas"] =
          "Debe seleccionar al menos una actividad económica";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const prevStep = () => {
    if (currentStep === 1) {
      // Volver a selección de tipo de cuenta
      setCurrentStep(0);
      setFormData((prev) => ({ ...prev, accountType: null }));
    } else {
      setCurrentStep((prev) => Math.max(prev - 1, 0));
    }
  };

  const agregarActividad = async () => {
    if (!nuevaActividad.trim()) return;

    const descripcionNormalizada = nuevaActividad.trim().toUpperCase();

    try {
      const { data: existente } = await supabase
        .from("actividades_economicas")
        .select("codigo, descripcion")
        .eq("descripcion", descripcionNormalizada)
        .maybeSingle();

      let codigo: string;

      if (existente) {
        codigo = existente.codigo;
        toast.info("Actividad encontrada");
      } else {
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

        const { error } = await supabase.from("actividades_economicas").insert({
          codigo,
          descripcion: descripcionNormalizada,
          aplica_iva: true,
        });

        if (error) throw error;

        const nuevaActividadObj: ActividadEconomica = {
          codigo,
          descripcion: descripcionNormalizada,
          aplica_iva: true,
        };
        setActividadesDisponibles((prev) => [...prev, nuevaActividadObj]);
        toast.success("Nueva actividad creada");
      }

      if (!formData.contribuyente.actividades_economicas.includes(codigo)) {
        handleInputChange("contribuyente.actividades_economicas", [
          ...formData.contribuyente.actividades_economicas,
          codigo,
        ]);
        toast.success("Actividad agregada a tu selección");
      } else {
        toast.info("Esta actividad ya está seleccionada");
      }

      setNuevaActividad("");
    } catch (error: unknown) {
      console.error("Error agregando actividad:", error);
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al agregar actividad: " + message);
    }
  };

  const toggleActividad = (codigo: string) => {
    const current = formData.contribuyente.actividades_economicas;
    if (current.includes(codigo)) {
      handleInputChange(
        "contribuyente.actividades_economicas",
        current.filter((c) => c !== codigo)
      );
    } else {
      handleInputChange("contribuyente.actividades_economicas", [
        ...current,
        codigo,
      ]);
    }
  };

  const handleRegistroContribuyente = async () => {
    if (!validateStep(3)) return;

    setLoading(true);
    const c = formData.contribuyente;

    try {
      // Usar API route para el registro (bypasea RLS)
      const response = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "contribuyente",
          email: formData.email,
          password: formData.password,
          ruc: c.ruc,
          first_name: c.first_name,
          last_name: c.last_name,
          telefono: c.telefono,
          direccion: c.direccion,
          cargas_familiares: c.cargas_familiares,
          obligado_contab: c.obligado_contab,
          agente_retencion: c.agente_retencion,
          tipo_obligacion: c.tipo_obligacion,
          actividades_economicas: c.actividades_economicas,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al registrar");
      }

      toast.success("¡Registro exitoso! Ya puedes iniciar sesión.");
      router.push("/login");
    } catch (error: unknown) {
      console.error("Error en registro:", error);
      const message =
        error instanceof Error ? error.message : "Error al registrar usuario";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistroContador = async () => {
    if (!validateStep(2)) return;

    setLoading(true);
    const ct = formData.contador;

    try {
      // Usar API route para el registro (bypasea RLS)
      const response = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "contador",
          email: formData.email,
          password: formData.password,
          first_name: ct.first_name,
          last_name: ct.last_name,
          telefono: ct.telefono,
          direccion: ct.direccion,
          numero_registro: ct.numero_registro || undefined,
          especialidad: ct.especialidad || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al registrar");
      }

      toast.success("¡Registro de contador exitoso! Ya puedes iniciar sesión.");
      router.push("/login");
    } catch (error: unknown) {
      console.error("Error en registro:", error);
      const message =
        error instanceof Error ? error.message : "Error al registrar usuario";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistro = () => {
    if (formData.accountType === "contribuyente") {
      handleRegistroContribuyente();
    } else {
      handleRegistroContador();
    }
  };

  const actividadesFiltradas = actividadesDisponibles.filter((actividad) =>
    actividad.descripcion.toLowerCase().includes(searchActividad.toLowerCase())
  );

  const renderAccountTypeSelection = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium mb-2">¿Qué tipo de cuenta deseas crear?</h3>
        <p className="text-sm text-muted-foreground">
          Selecciona según tu rol en el sistema tributario
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Opción Contribuyente */}
        <div
          onClick={() => handleInputChange("accountType", "contribuyente")}
          className={`relative p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg ${
            formData.accountType === "contribuyente"
              ? "border-primary bg-primary/5 shadow-md"
              : "border-border hover:border-primary/50"
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div
              className={`p-4 rounded-full ${
                formData.accountType === "contribuyente"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <Building className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-lg font-semibold">Contribuyente</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Persona natural o jurídica que declara impuestos
              </p>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Gestiona tus ventas y compras</li>
              <li>• Genera liquidaciones tributarias</li>
              <li>• Accede al asistente inteligente</li>
            </ul>
          </div>
          {formData.accountType === "contribuyente" && (
            <div className="absolute top-3 right-3">
              <Check className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>

        {/* Opción Contador */}
        <div
          onClick={() => handleInputChange("accountType", "contador")}
          className={`relative p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg ${
            formData.accountType === "contador"
              ? "border-primary bg-primary/5 shadow-md"
              : "border-border hover:border-primary/50"
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div
              className={`p-4 rounded-full ${
                formData.accountType === "contador"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <Calculator className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-lg font-semibold">Contador</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Profesional que gestiona múltiples contribuyentes
              </p>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Administra varios clientes</li>
              <li>• Acceso completo a datos tributarios</li>
              <li>• Panel de gestión de cartera</li>
            </ul>
          </div>
          {formData.accountType === "contador" && (
            <div className="absolute top-3 right-3">
              <Check className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>
      </div>

      {errors.accountType && (
        <p className="text-sm text-destructive text-center">
          {errors.accountType}
        </p>
      )}
    </div>
  );

  const renderAuthStep = () => (
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
        <FormFieldWrapper label="Contraseña" required error={errors.password}>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
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

  const renderContribuyenteInfo = () => {
    const c = formData.contribuyente;
    return (
      <div className="space-y-4">
        <FormFieldWrapper
          label="RUC"
          required
          error={errors["contribuyente.ruc"]}
          description="Registro Único de Contribuyentes (13 dígitos)"
        >
          <Input
            type="text"
            value={c.ruc}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 13);
              handleInputChange("contribuyente.ruc", value);
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
            error={errors["contribuyente.first_name"]}
          >
            <Input
              type="text"
              value={c.first_name}
              onChange={(e) =>
                handleInputChange("contribuyente.first_name", e.target.value)
              }
              placeholder="Juan Carlos"
              disabled={loading}
            />
          </FormFieldWrapper>

          <FormFieldWrapper
            label="Apellidos"
            required
            error={errors["contribuyente.last_name"]}
          >
            <Input
              type="text"
              value={c.last_name}
              onChange={(e) =>
                handleInputChange("contribuyente.last_name", e.target.value)
              }
              placeholder="Pérez González"
              disabled={loading}
            />
          </FormFieldWrapper>
        </div>

        <FormFieldWrapper
          label="Teléfono"
          required
          error={errors["contribuyente.telefono"]}
        >
          <Input
            type="tel"
            value={c.telefono}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 10);
              handleInputChange("contribuyente.telefono", value);
            }}
            placeholder="0987654321"
            disabled={loading}
            maxLength={10}
          />
        </FormFieldWrapper>

        <FormFieldWrapper
          label="Dirección"
          required
          error={errors["contribuyente.direccion"]}
        >
          <Input
            type="text"
            value={c.direccion}
            onChange={(e) =>
              handleInputChange("contribuyente.direccion", e.target.value)
            }
            placeholder="Av. Principal 123 y Secundaria"
            disabled={loading}
          />
        </FormFieldWrapper>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormFieldWrapper
            label="Cargas Familiares"
            error={errors["contribuyente.cargas_familiares"]}
          >
            <Input
              type="number"
              min="0"
              max="20"
              value={c.cargas_familiares}
              onChange={(e) =>
                handleInputChange(
                  "contribuyente.cargas_familiares",
                  parseInt(e.target.value) || 0
                )
              }
              placeholder="0"
              disabled={loading}
            />
          </FormFieldWrapper>

          <FormFieldWrapper label="Tipo de Obligación">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={c.tipo_obligacion}
              onChange={(e) =>
                handleInputChange(
                  "contribuyente.tipo_obligacion",
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
                  checked={c.obligado_contab}
                  onChange={(e) =>
                    handleInputChange(
                      "contribuyente.obligado_contab",
                      e.target.checked
                    )
                  }
                  disabled={loading}
                  className="h-4 w-4"
                />
                <span className="text-sm">Obligado a llevar contabilidad</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={c.agente_retencion}
                  onChange={(e) =>
                    handleInputChange(
                      "contribuyente.agente_retencion",
                      e.target.checked
                    )
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
  };

  const renderContadorInfo = () => {
    const ct = formData.contador;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormFieldWrapper
            label="Nombres"
            required
            error={errors["contador.first_name"]}
          >
            <Input
              type="text"
              value={ct.first_name}
              onChange={(e) =>
                handleInputChange("contador.first_name", e.target.value)
              }
              placeholder="María Elena"
              disabled={loading}
            />
          </FormFieldWrapper>

          <FormFieldWrapper
            label="Apellidos"
            required
            error={errors["contador.last_name"]}
          >
            <Input
              type="text"
              value={ct.last_name}
              onChange={(e) =>
                handleInputChange("contador.last_name", e.target.value)
              }
              placeholder="García López"
              disabled={loading}
            />
          </FormFieldWrapper>
        </div>

        <FormFieldWrapper
          label="Teléfono"
          required
          error={errors["contador.telefono"]}
        >
          <Input
            type="tel"
            value={ct.telefono}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 10);
              handleInputChange("contador.telefono", value);
            }}
            placeholder="0987654321"
            disabled={loading}
            maxLength={10}
          />
        </FormFieldWrapper>

        <FormFieldWrapper label="Dirección">
          <Input
            type="text"
            value={ct.direccion}
            onChange={(e) =>
              handleInputChange("contador.direccion", e.target.value)
            }
            placeholder="Av. Principal 123 y Secundaria"
            disabled={loading}
          />
        </FormFieldWrapper>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormFieldWrapper
            label="Número de Registro Profesional"
            description="CPA o número de registro contable"
          >
            <Input
              type="text"
              value={ct.numero_registro}
              onChange={(e) =>
                handleInputChange("contador.numero_registro", e.target.value)
              }
              placeholder="CPA-12345"
              disabled={loading}
            />
          </FormFieldWrapper>

          <FormFieldWrapper
            label="Especialidad"
            description="Área de especialización"
          >
            <Input
              type="text"
              value={ct.especialidad}
              onChange={(e) =>
                handleInputChange("contador.especialidad", e.target.value)
              }
              placeholder="Tributación, Auditoría..."
              disabled={loading}
            />
          </FormFieldWrapper>
        </div>
      </div>
    );
  };

  const renderActividadesEconomicas = () => (
    <div className="space-y-6">
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

      <div className="space-y-4">
        <h3 className="text-lg font-medium">O selecciona de las existentes</h3>
        <Input
          type="text"
          value={searchActividad}
          onChange={(e) => setSearchActividad(e.target.value)}
          placeholder="Buscar actividades..."
          disabled={loading}
        />
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2">
        {actividadesFiltradas.map((actividad) => (
          <div
            key={actividad.codigo}
            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
              formData.contribuyente.actividades_economicas.includes(
                actividad.codigo
              )
                ? "bg-primary/10 border-primary"
                : "hover:bg-muted"
            }`}
            onClick={() => toggleActividad(actividad.codigo)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{actividad.descripcion}</p>
                <p className="text-xs text-muted-foreground">
                  Código: {actividad.codigo}
                  {actividad.aplica_iva && " • Aplica IVA"}
                </p>
              </div>
              {formData.contribuyente.actividades_economicas.includes(
                actividad.codigo
              ) && <Check className="h-4 w-4 text-primary" />}
            </div>
          </div>
        ))}
      </div>

      {formData.contribuyente.actividades_economicas.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Actividades Seleccionadas</h3>
          <div className="space-y-2">
            {formData.contribuyente.actividades_economicas.map((codigo) => {
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

      {errors["contribuyente.actividades_economicas"] && (
        <p className="text-sm text-destructive">
          {errors["contribuyente.actividades_economicas"]}
        </p>
      )}
    </div>
  );

  const renderStepContent = () => {
    if (currentStep === 0) {
      return renderAccountTypeSelection();
    }

    if (currentStep === 1) {
      return renderAuthStep();
    }

    if (formData.accountType === "contribuyente") {
      if (currentStep === 2) return renderContribuyenteInfo();
      if (currentStep === 3) return renderActividadesEconomicas();
    } else if (formData.accountType === "contador") {
      if (currentStep === 2) return renderContadorInfo();
    }

    return null;
  };

  const isLastStep = currentStep === STEPS.length - 1;
  const currentStepData = STEPS[currentStep] || STEPS[0];

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
          <h1 className="text-2xl font-bold">
            {formData.accountType === "contador"
              ? "Registro de Contador"
              : formData.accountType === "contribuyente"
              ? "Registro de Contribuyente"
              : "Crear Cuenta"}
          </h1>
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
          <h2 className="text-xl font-semibold">{currentStepData.title}</h2>
          <p className="text-muted-foreground">{currentStepData.description}</p>
        </div>

        {/* Registration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="mr-2 h-5 w-5" />
              Paso {currentStep + 1} de {STEPS.length}
            </CardTitle>
            <CardDescription>{currentStepData.description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {renderStepContent()}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <div>
                {currentStep === 0 ? (
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
                {isLastStep ? (
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
