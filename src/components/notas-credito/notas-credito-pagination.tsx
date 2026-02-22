"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface NotasCreditoPaginationProps {
  paginaActual: number;
  totalItems: number;
  itemsPorPagina: number;
  onPaginaChange: (pagina: number) => void;
}

export function NotasCreditoPagination({
  paginaActual,
  totalItems,
  itemsPorPagina,
  onPaginaChange,
}: NotasCreditoPaginationProps) {
  const totalPaginas = Math.ceil(totalItems / itemsPorPagina);

  if (totalItems === 0 || totalPaginas <= 1) {
    return null;
  }

  const primerItem = (paginaActual - 1) * itemsPorPagina + 1;
  const ultimoItem = Math.min(paginaActual * itemsPorPagina, totalItems);

  const irAPrimeraPagina = () => onPaginaChange(1);
  const irAPaginaAnterior = () => onPaginaChange(Math.max(1, paginaActual - 1));
  const irAPaginaSiguiente = () => onPaginaChange(Math.min(totalPaginas, paginaActual + 1));
  const irAUltimaPagina = () => onPaginaChange(totalPaginas);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      <div className="text-sm text-muted-foreground">
        Mostrando <span className="font-medium">{primerItem}</span> a{" "}
        <span className="font-medium">{ultimoItem}</span> de{" "}
        <span className="font-medium">{totalItems}</span> notas de credito
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={irAPrimeraPagina}
          disabled={paginaActual === 1}
          className="h-8 w-8 p-0"
        >
          <ChevronsLeft className="h-4 w-4" />
          <span className="sr-only">Primera pagina</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={irAPaginaAnterior}
          disabled={paginaActual === 1}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Pagina anterior</span>
        </Button>

        <div className="flex items-center gap-2 px-2">
          <span className="text-sm font-medium">
            Pagina {paginaActual} de {totalPaginas}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={irAPaginaSiguiente}
          disabled={paginaActual === totalPaginas}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Pagina siguiente</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={irAUltimaPagina}
          disabled={paginaActual === totalPaginas}
          className="h-8 w-8 p-0"
        >
          <ChevronsRight className="h-4 w-4" />
          <span className="sr-only">Ultima pagina</span>
        </Button>
      </div>
    </div>
  );
}
