"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";

interface ComprasFiltersProps {
  mes: string;
  onMesChange: (value: string) => void;
  anio: string;
  onAnioChange: (value: string) => void;
}

const meses = [
  { value: "todos", label: "Todos los meses" },
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const generarAnios = () => {
  const anioActual = new Date().getFullYear();
  const anios = [{ value: "todos", label: "Todos los años" }];
  for (let i = anioActual; i >= anioActual - 5; i--) {
    anios.push({ value: i.toString(), label: i.toString() });
  }
  return anios;
};

export function ComprasFilters({
  mes,
  onMesChange,
  anio,
  onAnioChange,
}: ComprasFiltersProps) {
  const anios = generarAnios();

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filtros:</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Año:</span>
        <Select value={anio} onValueChange={onAnioChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {anios.map((anioItem) => (
              <SelectItem key={anioItem.value} value={anioItem.value}>
                {anioItem.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Mes:</span>
        <Select value={mes} onValueChange={onMesChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {meses.map((mesItem) => (
              <SelectItem key={mesItem.value} value={mesItem.value}>
                {mesItem.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

