"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Si el usuario está autenticado, redirigir al dashboard
        console.log(
          "Usuario detectado en página principal, redirigiendo al dashboard"
        );
        router.push("/dashboard");
      } else {
        // Si no está autenticado, redirigir al login
        console.log("Usuario no autenticado, redirigiendo al login");
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  // Mostrar loading mientras se verifica la autenticación
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Cargando Sistema Tributario...</p>
      </div>
    </div>
  );
}
