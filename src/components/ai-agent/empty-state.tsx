"use client";

import {
  Bot,
  Calculator,
  ShoppingCart,
  Receipt,
  HelpCircle,
  BookOpen,
} from "lucide-react";

const suggestions = [
  {
    icon: Calculator,
    label: "Cuanto IVA debo pagar este mes?",
    color: "text-blue-500",
  },
  {
    icon: ShoppingCart,
    label: "Mis 5 proveedores con mas compras",
    color: "text-emerald-500",
  },
  {
    icon: HelpCircle,
    label: "Cómo cargo mis datos tributarios?",
    color: "text-violet-500",
  },
  {
    icon: Receipt,
    label: "Resumen de retenciones del trimestre",
    color: "text-amber-500",
  },
  {
    icon: BookOpen,
    label: "Qué puedo hacer en esta app?",
    color: "text-rose-500",
  },
];

type EmptyStateProps = {
  onSuggestionClick: (question: string) => void;
};

export function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8 animate-agent-fade-in">
      <div className="relative">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Bot className="h-7 w-7 text-primary" />
        </div>
        <div className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
      </div>

      <div className="text-center">
        <h3 className="text-base font-semibold text-foreground">
          Como puedo ayudarte?
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Preguntame sobre tus datos tributarios o cómo usar la app
        </p>
      </div>

      <div className="grid w-full max-w-sm grid-cols-2 gap-2">
        {suggestions.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onSuggestionClick(s.label)}
            className="group flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-background/80 p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
          >
            <s.icon className={`h-4 w-4 ${s.color}`} />
            <span className="text-xs leading-snug text-muted-foreground group-hover:text-foreground">
              {s.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
