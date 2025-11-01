"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, XCircle, Mail, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function ConfirmarEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const confirmEmail = async () => {
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      if (!token_hash || type !== "email") {
        setStatus("error");
        setMessage("Enlace de confirmación inválido");
        return;
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: "email",
        });

        if (error) {
          throw error;
        }

        setStatus("success");
        setMessage("¡Email confirmado exitosamente!");

        // Redirigir al dashboard después de 3 segundos
        setTimeout(() => {
          router.push("/dashboard");
        }, 3000);
      } catch (error: any) {
        console.error("Error confirmando email:", error);
        setStatus("error");
        setMessage(error.message || "Error al confirmar el email");
      }
    };

    confirmEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {status === "loading" && (
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              )}
              {status === "success" && (
                <CheckCircle className="h-12 w-12 text-green-500" />
              )}
              {status === "error" && (
                <XCircle className="h-12 w-12 text-red-500" />
              )}
            </div>

            <CardTitle className="text-xl">
              {status === "loading" && "Confirmando Email..."}
              {status === "success" && "¡Email Confirmado!"}
              {status === "error" && "Error de Confirmación"}
            </CardTitle>

            <CardDescription>
              {status === "loading" &&
                "Por favor espera mientras verificamos tu email"}
              {status === "success" &&
                "Tu cuenta ha sido activada exitosamente"}
              {status === "error" && "Hubo un problema al confirmar tu email"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">{message}</p>

            {status === "success" && (
              <div className="space-y-3">
                <p className="text-sm text-green-600">
                  Serás redirigido al panel de control en unos segundos...
                </p>
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="w-full"
                >
                  Ir al Panel de Control
                </Button>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Si el problema persiste, contacta al soporte técnico.
                </p>
                <div className="space-y-2">
                  <Link href="/login">
                    <Button variant="outline" className="w-full">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Volver al Login
                    </Button>
                  </Link>
                  <Link href="/registro">
                    <Button variant="ghost" className="w-full">
                      <Mail className="mr-2 h-4 w-4" />
                      Registrarse Nuevamente
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
