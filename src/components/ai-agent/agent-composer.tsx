"use client";

import { FormEvent, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAiAgent } from "@/hooks/use-ai-agent";
import { useAuth } from "@/contexts/auth-context";

const defaultSuggestions = [
  "¿Cuál es mi IVA a pagar este mes?",
  "Listar compras mayores a 500 USD en 2024.",
  "Resumen de retenciones emitidas este trimestre.",
];

export function AgentComposer() {
  const [question, setQuestion] = useState("");
  const { contribuyente } = useAuth();
  const { askAgent, isProcessing } = useAiAgent();

  const submitQuestion = async () => {
    if (!question.trim()) {
      return;
    }

    if (!contribuyente?.ruc) {
      toast.error("No encontramos un RUC activo en tu sesión.");
      return;
    }

    await askAgent(question, contribuyente.ruc);
    setQuestion("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitQuestion();
  };

  const handleTextareaKeyDown = async (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await submitQuestion();
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setQuestion(suggestion);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {defaultSuggestions.map((suggestion) => (
          <Button
            key={suggestion}
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-dashed text-xs"
            onClick={() => handleSuggestion(suggestion)}
            disabled={isProcessing}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
            {suggestion}
          </Button>
        ))}
      </div>

      <div className="rounded-2xl border border-border/60 bg-background/80 p-3 shadow-inner">
        <Textarea
          placeholder="Escribe tu consulta en lenguaje natural..."
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={handleTextareaKeyDown}
          rows={3}
          className="min-h-[120px] resize-none border-none bg-transparent focus-visible:ring-0"
          disabled={isProcessing}
        />
        <div className="mt-2 flex items-center justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={!question.trim() || isProcessing}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {isProcessing ? "Generando..." : "Consultar"}
          </Button>
        </div>
      </div>
    </form>
  );
}
