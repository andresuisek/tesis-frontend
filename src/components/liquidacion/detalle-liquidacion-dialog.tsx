"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TaxLiquidation } from "@/lib/supabase";
import { mapTaxLiquidationToSummary } from "@/lib/liquidacion";
import { LiquidacionSummary } from "./liquidacion-summary";

interface DetalleLiquidacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liquidacion: TaxLiquidation | null;
}

export function DetalleLiquidacionDialog({
  open,
  onOpenChange,
  liquidacion,
}: DetalleLiquidacionDialogProps) {
  const resumen = liquidacion ? mapTaxLiquidationToSummary(liquidacion) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-full max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Detalle del cierre {resumen?.periodo.label ?? ""}
          </DialogTitle>
        </DialogHeader>
        <LiquidacionSummary resumen={resumen} />
      </DialogContent>
    </Dialog>
  );
}



