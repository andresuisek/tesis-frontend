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
import { Input } from "@/components/ui/input";
import { FormFieldWrapper } from "@/components/forms/form-field-wrapper";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, LogIn, Shield, FileText } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);

    // Simulación de login
    setTimeout(() => {
      if (
        formData.email === "admin@empresa.com" &&
        formData.password === "123456"
      ) {
        toast.success("¡Bienvenido al sistema!");
        // Aquí redirigirías al dashboard
        window.location.href = "/dashboard";
      } else {
        toast.error("Credenciales incorrectas");
      }
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="h-6 w-6" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Sistema Tributario</h1>
          <p className="text-muted-foreground">
            Accede a tu cuenta para gestionar tus obligaciones tributarias
          </p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl flex items-center">
              <LogIn className="mr-2 h-5 w-5" />
              Iniciar Sesión
            </CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
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

            <Button className="w-full" onClick={handleLogin} disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Iniciar Sesión
                </>
              )}
            </Button>

            <div className="text-center">
              <Button variant="link" className="text-sm">
                ¿Olvidaste tu contraseña?
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Shield className="mr-2 h-4 w-4" />
              Credenciales de Demostración
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email:</span>
                <Badge variant="outline" className="font-mono">
                  admin@empresa.com
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Contraseña:
                </span>
                <Badge variant="outline" className="font-mono">
                  123456
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Usa estas credenciales para probar el sistema
            </p>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="space-y-2">
            <div className="w-8 h-8 mx-auto bg-primary/10 rounded-lg flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-medium">Seguro</h3>
            <p className="text-xs text-muted-foreground">
              Datos protegidos con encriptación
            </p>
          </div>
          <div className="space-y-2">
            <div className="w-8 h-8 mx-auto bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-medium">Completo</h3>
            <p className="text-xs text-muted-foreground">
              Gestión tributaria integral
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          © 2024 Sistema Tributario. Todos los derechos reservados.
        </div>
      </div>
    </div>
  );
}
