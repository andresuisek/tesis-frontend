const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const ROUTER_MODEL = "gpt-4o-mini";

export type IntentResult = {
  intent: "database" | "web_search" | "both" | "app_help";
  searchQuery: string | null;
};

function getClassificationPrompt(): string {
  const today = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();
  return `Eres un clasificador de intención para un asistente tributario ecuatoriano.
Fecha actual: ${today}.

Clasifica la pregunta del usuario en una de estas categorías:
- "database": La pregunta requiere consultar datos fiscales del contribuyente (facturas, compras, ventas, retenciones, IVA, montos, listados).
- "web_search": La pregunta es sobre normativa, regulaciones, tasas, porcentajes legales, plazos del SRI, o conceptos tributarios generales que NO dependen de datos del contribuyente.
- "both": La pregunta necesita datos del contribuyente Y contexto normativo/legal.
- "app_help": La pregunta es sobre cómo usar el software, sus funcionalidades, módulos, navegación, o instrucciones paso a paso. Ejemplos: "cómo subo mis ventas", "dónde veo la liquidación", "qué puedo hacer aquí", "cómo agrego un cliente", "para qué sirve este módulo".

Responde SOLO con JSON: {"intent": "database"|"web_search"|"both"|"app_help", "search_query": "string o null"}
- search_query: si intent incluye búsqueda web, genera una consulta de búsqueda optimizada en español. Incluye el año actual (${year}) para obtener información vigente. Si es "database" o "app_help", usa null.`;
}

export async function classifyIntent(
  question: string
): Promise<IntentResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { intent: "database", searchQuery: null };
  }

  const hasTavily = !!process.env.TAVILY_API_KEY;

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: ROUTER_MODEL,
        temperature: 0,
        max_tokens: 150,
        messages: [
          { role: "system", content: getClassificationPrompt() },
          { role: "user", content: question },
        ],
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      console.error("[IntentRouter] API error:", response.status);
      return { intent: "database", searchQuery: null };
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content ?? "";

    // Extract JSON from the response (may be wrapped in markdown code block)
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { intent: "database", searchQuery: null };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const validIntents = ["database", "web_search", "both", "app_help"];
    let intent = validIntents.includes(parsed.intent)
      ? (parsed.intent as IntentResult["intent"])
      : "database";

    // Downgrade web-dependent intents when Tavily is unavailable
    if (!hasTavily && (intent === "web_search" || intent === "both")) {
      intent = "database";
    }

    return {
      intent,
      searchQuery: parsed.search_query ?? null,
    };
  } catch (error) {
    console.error("[IntentRouter] Classification failed:", error);
    return { intent: "database", searchQuery: null };
  }
}
