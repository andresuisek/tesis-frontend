"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Link as LinkIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface LinkClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contadorId: string;
  onSuccess: () => void;
}

export function LinkClientDialog({ open, onOpenChange, contadorId, onSuccess }: LinkClientDialogProps) {
  const [vincularRuc, setVincularRuc] = useState("");
  const [vincularLoading, setVincularLoading] = useState(false);

  const handleVincular = async () => {
    if (!vincularRuc.trim()) {
      toast.error("Ingresa el RUC del contribuyente");
      return;
    }
    if (!/^\d{13}$/.test(vincularRuc)) {
      toast.error("El RUC debe tener 13 dígitos");
      return;
    }

    setVincularLoading(true);
    try {
      const { data: resultados, error: searchError } = await supabase.rpc(
        "buscar_contribuyente_para_vincular",
        { p_ruc: vincularRuc },
      );

      if (searchError) {
        console.error("Error en búsqueda:", searchError);
        throw new Error("Error al buscar el contribuyente");
      }

      if (!resultados || resultados.length === 0) {
        throw new Error("No se encontró un contribuyente activo con ese RUC");
      }

      const contribuyente = resultados[0];

      if (contribuyente.ya_vinculado) {
        throw new Error("Este contribuyente ya está vinculado a tu cuenta");
      }

      const { error: relacionError } = await supabase.from("contador_contribuyente").insert({
        contador_id: contadorId,
        contribuyente_ruc: vincularRuc,
        estado: "activo",
      });

      if (relacionError) throw new Error(relacionError.message);

      toast.success(
        `Contribuyente ${contribuyente.first_name} ${contribuyente.last_name} vinculado exitosamente`,
      );
      onOpenChange(false);
      setVincularRuc("");
      onSuccess();
    } catch (error: unknown) {
      console.error("Error al vincular contribuyente:", error);
      const message = error instanceof Error ? error.message : "Error desconocido";
      toast.error(message);
    } finally {
      setVincularLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <LinkIcon className="h-4 w-4 mr-2" />
          Vincular Existente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular Contribuyente Existente</DialogTitle>
          <DialogDescription>Ingresa el RUC de un contribuyente ya registrado en el sistema</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <FormFieldWrapper label="RUC del Contribuyente" required>
            <Input
              type="text"
              value={vincularRuc}
              onChange={(e) => setVincularRuc(e.target.value.replace(/\D/g, "").slice(0, 13))}
              placeholder="1234567890001"
              maxLength={13}
            />
          </FormFieldWrapper>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleVincular} disabled={vincularLoading}>
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
  );
}
