"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, CheckCircle, Loader2 } from "lucide-react";
import posthog from "posthog-js";
import { useAuth } from "@/contexts/auth-context";

export default function LogoutPage() {
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(true);

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Cerrar sesión de Supabase (elimina cookies y sesión)
        await signOut();

        // Capture logout event and reset PostHog user
        posthog.capture("user_logged_out");
        posthog.reset();
      } catch (error) {
        console.error("Error durante el logout:", error);
      } finally {
        setSigningOut(false);
      }

      // Redirigir después de 2 segundos
      const timer = setTimeout(() => {
        window.location.href = "/login";
      }, 2000);

      return () => clearTimeout(timer);
    };

    performLogout();
  }, [signOut]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            {signingOut ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            )}
          </div>
          <CardTitle>
            {signingOut ? "Cerrando sesión..." : "Sesión Cerrada"}
          </CardTitle>
          <CardDescription>
            {signingOut
              ? "Espera un momento mientras cerramos tu sesión"
              : "Has cerrado sesión exitosamente del sistema"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            Serás redirigido automáticamente en unos segundos...
          </div>

          <Button className="w-full" asChild disabled={signingOut}>
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
