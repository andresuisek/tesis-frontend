"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeclaracionRentaSummaryData } from "@/lib/declaracion-renta";
import { DeclaracionRentaSummary } from "./declaracion-renta-summary";

interface DetalleDeclaracionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumen: DeclaracionRentaSummaryData | null;
}

export function DetalleDeclaracionDialog({
  open,
  onOpenChange,
  resumen,
}: DetalleDeclaracionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-full max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Detalle declaración {resumen?.anioFiscal ?? ""}
          </DialogTitle>
        </DialogHeader>
        <DeclaracionRentaSummary resumen={resumen} />
      </DialogContent>
    </Dialog>
  );
}
