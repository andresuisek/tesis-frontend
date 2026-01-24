"use client";

import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, CheckCircle } from "lucide-react";
import posthog from "posthog-js";

export default function LogoutPage() {
  useEffect(() => {
    // Capture logout event and reset PostHog user
    posthog.capture("user_logged_out");
    posthog.reset();

    // Aquí harías la limpieza de la sesión
    // localStorage.clear()
    // sessionStorage.clear()

    // Redirigir después de 3 segundos
    const timer = setTimeout(() => {
      window.location.href = "/login";
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <CardTitle>Sesión Cerrada</CardTitle>
          <CardDescription>
            Has cerrado sesión exitosamente del sistema
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            Serás redirigido automáticamente en unos segundos...
          </div>

          <Button className="w-full" asChild>
            <a href="/login">
              <LogOut className="mr-2 h-4 w-4" />
              Volver a Iniciar Sesión
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
