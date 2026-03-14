import {
  buildSystemPrompt,
  buildFriendlyStreamingPrompt,
  getSchemaSummary,
  validateSqlForUser,
} from "@/lib/ai-agent/prompts";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getPostHogClient } from "@/lib/posthog-server";
import {
  getAuthenticatedUser,
  verifyRucOwnership,
} from "@/lib/auth-helpers";
import { classifyIntent } from "@/lib/ai-agent/intent-router";
import { searchTavily } from "@/lib/ai-agent/tavily-search";
import {
  buildAppHelpPrompt,
  appHelpResponseFormat,
} from "@/lib/ai-agent/app-help-prompt";

type AgentRequestPayload = {
  question?: string;
  contribuyenteRuc?: string;
  sessionHints?: string[];
  currentPath?: string;
  userType?: "contribuyente" | "contador";
};

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

// --- Rate limiting ---
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ruc: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ruc);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ruc, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// --- SSE helpers ---

function sseEvent(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// --- OpenAI helpers ---

type OpenAiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

async function callOpenAiJson({
  messages,
  responseFormat,
  temperature = 0.2,
}: {
  messages: OpenAiMessage[];
  responseFormat: Record<string, unknown>;
  temperature?: number;
}) {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature,
      response_format: responseFormat,
      messages,
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      err?.error?.message ?? "OpenAI API error"
    );
  }

  const completion = await response.json();
  const raw = completion?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned empty content");
  return JSON.parse(raw);
}

async function* streamOpenAiText({
  messages,
  temperature = 0.3,
}: {
  messages: OpenAiMessage[];
  temperature?: number;
}): AsyncGenerator<string> {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature,
      stream: true,
      messages,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "OpenAI streaming error");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const payload = trimmed.slice(6);
        if (payload === "[DONE]") return;

        try {
          const chunk = JSON.parse(payload);
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // skip malformed chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// --- Response formats ---

const sqlResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "consulta_tributaria",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { type: "string" },
        sql: { type: "string" },
        validation: { type: "string" },
        follow_up: { type: "string" },
      },
      required: ["summary", "sql"],
    },
  },
};

const metadataResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "metadata_tributaria",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        highlights: {
          type: "array",
          items: { type: "string" },
          description: "3-5 hallazgos clave del resultado",
        },
        follow_up: {
          type: "string",
          description: "Siguiente pregunta sugerida",
        },
        chart: {
          type: ["object", "null"],
          description:
            "Configuracion de grafico si aplica. null si no tiene sentido graficar.",
          properties: {
            type: {
              type: "string",
              enum: ["bar", "line", "pie"],
              description:
                "bar: comparaciones entre categorias. line: tendencias temporales. pie: distribuciones/proporciones.",
            },
            title: { type: "string" },
            xKey: {
              type: "string",
              description: "Nombre exacto de la columna para el eje X",
            },
            yKeys: {
              type: "array",
              items: { type: "string" },
              description: "Nombres exactos de las columnas para eje Y",
            },
          },
          required: ["type", "title", "xKey", "yKeys"],
          additionalProperties: false,
        },
      },
      required: ["highlights", "follow_up", "chart"],
    },
  },
};

// --- DB execution ---

async function executeQueryViaRpc(sql: string, allowedRuc: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.rpc("execute_sql_query", {
    query_text: sql,
    allowed_ruc: allowedRuc,
  });

  if (error) {
    console.error("Supabase RPC error:", JSON.stringify(error, null, 2));
    console.error("SQL that failed:", sql);
    throw new Error(
      `No fue posible ejecutar la consulta en Supabase: ${error.message} (code: ${error.code})`
    );
  }

  return (Array.isArray(data) ? data : []) as Record<string, unknown>[];
}

function prepareRowsForModel(
  rows: Record<string, unknown>[],
  limit = 20,
  maxColumns = 20
) {
  return rows.slice(0, limit).map((row) => {
    const entries = Object.entries(row)
      .slice(0, maxColumns)
      .map(([key, value]) => [
        key,
        value instanceof Date
          ? value.toISOString()
          : typeof value === "object" && value !== null
          ? JSON.stringify(value)
          : value,
      ]);
    return Object.fromEntries(entries);
  });
}

function computeAggregates(rows: Record<string, unknown>[]) {
  if (!rows.length) return null;

  const numericColumns = Object.keys(rows[0]).filter((key) => {
    const val = rows[0][key];
    return typeof val === "number" || (typeof val === "string" && !isNaN(Number(val)) && val.trim() !== "");
  });

  if (!numericColumns.length) return null;

  const aggregates: Record<string, { sum: number; min: number; max: number; avg: number }> = {};

  for (const col of numericColumns) {
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    let count = 0;

    for (const row of rows) {
      const val = Number(row[col]);
      if (!isNaN(val)) {
        sum += val;
        if (val < min) min = val;
        if (val > max) max = val;
        count++;
      }
    }

    if (count > 0) {
      aggregates[col] = {
        sum: Math.round(sum * 100) / 100,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        avg: Math.round((sum / count) * 100) / 100,
      };
    }
  }

  return Object.keys(aggregates).length ? aggregates : null;
}

function sanitizeSql(sql: string) {
  // Strip trailing semicolons and keep only the first statement if multiple were generated
  const trimmed = sql.trim().replace(/;+\s*$/g, "");
  const firstStatement = trimmed.split(";")[0].trim();
  return firstStatement;
}

// --- Main handler ---

export async function POST(req: Request) {
  // Authentication
  const auth = await getAuthenticatedUser();
  if (!auth.authenticated) {
    return new Response(
      JSON.stringify({ error: "No autenticado." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  let payload: AgentRequestPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "JSON invalido" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const question = payload.question?.trim();
  if (!question) {
    return new Response(
      JSON.stringify({ error: "Falta 'question'" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const contribuyenteRuc = payload.contribuyenteRuc?.trim();
  if (!contribuyenteRuc) {
    return new Response(
      JSON.stringify({ error: "Falta 'contribuyenteRuc'" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Authorization
  const hasAccess = await verifyRucOwnership(auth.user.id, contribuyenteRuc);
  if (!hasAccess) {
    return new Response(
      JSON.stringify({ error: "Sin acceso a este contribuyente." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // Rate limiting
  if (!checkRateLimit(contribuyenteRuc)) {
    return new Response(
      JSON.stringify({ error: "Demasiadas consultas. Espera un momento e intenta de nuevo." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: contribuyenteRuc,
    event: "ai_query_submitted",
    properties: { question_length: question.length, contribuyente_ruc: contribuyenteRuc },
  });

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(new TextEncoder().encode(sseEvent(event, data)));
      };

      try {
        // Phase 1: Routing
        console.info("[AI-Agent-Stream] Processing question:", question.slice(0, 80));
        send("phase", { phase: "routing" });

        const intentResult = await classifyIntent(question);
        console.info("[AI-Agent-Stream] Intent:", intentResult.intent);

        posthog.capture({
          distinctId: contribuyenteRuc,
          event: "ai_query_intent",
          properties: { intent: intentResult.intent, contribuyente_ruc: contribuyenteRuc },
        });

        // --- App help path (no SQL, no web search) ---
        if (intentResult.intent === "app_help") {
          send("phase", { phase: "thinking" });

          const userType = payload.userType ?? "contribuyente";
          const helpPrompt = buildAppHelpPrompt({
            userType,
            currentPath: payload.currentPath,
            hasActiveContribuyente: !!contribuyenteRuc,
          });

          const helpResponse = await callOpenAiJson({
            responseFormat: appHelpResponseFormat,
            temperature: 0.3,
            messages: [
              { role: "system", content: helpPrompt },
              { role: "user", content: question },
            ],
          });

          // Stream the narrative in chunks for consistent UX
          const narrative: string = helpResponse.narrative ?? "";
          const chunkSize = 12;
          for (let i = 0; i < narrative.length; i += chunkSize) {
            send("delta", { text: narrative.slice(i, i + chunkSize) });
          }

          send("metadata", {
            navigationActions: helpResponse.navigation_actions ?? [],
            followUps: helpResponse.follow_ups ?? [],
            followUp: helpResponse.follow_ups?.[0] ?? "",
          });

          posthog.capture({
            distinctId: contribuyenteRuc,
            event: "ai_query_streamed",
            properties: {
              contribuyente_ruc: contribuyenteRuc,
              intent: "app_help",
              has_nav_actions: (helpResponse.navigation_actions?.length ?? 0) > 0,
            },
          });

          send("done", {});
          return;
        }

        // Start web search in parallel if needed
        let searchResultsPromise: Promise<
          { title: string; url: string; content: string }[]
        > | null = null;
        if (
          intentResult.intent === "web_search" ||
          intentResult.intent === "both"
        ) {
          searchResultsPromise = searchTavily(
            intentResult.searchQuery ?? question
          );
        }

        let rows: Record<string, unknown>[] = [];
        let previewRows: Record<string, unknown>[] = [];
        let rowCount = 0;
        let sqlExecuted = false;

        // Phase 2: SQL generation (if needed)
        if (
          intentResult.intent === "database" ||
          intentResult.intent === "both"
        ) {
          send("phase", { phase: "generating_sql" });

          const now = new Date();
          const schemaSummary = getSchemaSummary();
          const systemPrompt = buildSystemPrompt({
            schemaSummary,
            contribuyenteRuc,
            sessionHints: payload.sessionHints,
            currentDateIso: now.toISOString(),
            currentDateReadable: now.toLocaleString("es-EC", {
              timeZone: "America/Guayaquil",
              dateStyle: "full",
              timeStyle: "short",
            }),
            currentYear: now.getFullYear(),
          });

          const sqlResponse = await callOpenAiJson({
            responseFormat: sqlResponseFormat,
            temperature: 0.1,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: question },
            ],
          });

          const sanitized = sanitizeSql(sqlResponse.sql);
          const validation = validateSqlForUser(sanitized, contribuyenteRuc);

          if (!validation.valid) {
            send("delta", {
              text: validation.message ?? "La consulta generada no paso las validaciones de seguridad.",
            });
            send("done", {});
            controller.close();
            return;
          }

          // Phase 3: Execute query
          send("phase", { phase: "executing_query" });
          console.info("[AI-Agent-Stream] Executing:", sanitized);

          rows = await executeQueryViaRpc(sanitized, contribuyenteRuc);
          previewRows = prepareRowsForModel(rows);
          rowCount = rows.length;
          sqlExecuted = true;
        }

        // Wait for web search results
        const searchResults = searchResultsPromise
          ? await searchResultsPromise
          : [];

        if (searchResults.length > 0) {
          posthog.capture({
            distinctId: contribuyenteRuc,
            event: "ai_query_web_search",
            properties: {
              source_count: searchResults.length,
              contribuyente_ruc: contribuyenteRuc,
            },
          });
        }

        // Phase 4: Format response (streaming)
        send("phase", { phase: "formatting" });

        // Stage 1.5: Metadata (non-streaming, in parallel with narrative)
        const metadataPromise = sqlExecuted
          ? callOpenAiJson({
              responseFormat: metadataResponseFormat,
              temperature: 0.2,
              messages: [
                {
                  role: "system",
                  content: `Eres un analista tributario. Analiza los datos y genera metadata estructurada.
Guias para chart:
- bar: comparaciones entre categorias (compras por proveedor, impuestos por tipo)
- line: tendencias temporales (ventas mensuales, IVA por periodo)
- pie: distribuciones/proporciones (gastos por rubro)
- null: respuestas de valor unico, textuales, o cuando hay menos de 2 filas de datos
Los xKey y yKeys deben ser nombres EXACTOS de columnas del resultado.`,
                },
                {
                  role: "user",
                  content: JSON.stringify({
                    question,
                    rowCount,
                    sampleRows: previewRows.slice(0, 10),
                    columns: previewRows.length
                      ? Object.keys(previewRows[0])
                      : [],
                  }),
                },
              ],
            })
          : Promise.resolve({ highlights: [], follow_up: "", chart: null });

        // Build web search context for the narrative prompt
        let webContext = "";
        const searchSources: string[] = [];
        if (searchResults.length > 0) {
          webContext =
            "\n\nContexto normativo (fuentes web):\n" +
            searchResults
              .map((r) => {
                searchSources.push(r.url);
                return `- [${r.title}]: ${r.content.slice(0, 300)} (Fuente: ${r.url})`;
              })
              .join("\n");
        }

        // Stage 2: Streaming narrative
        const narrativeSystemPrompt = buildFriendlyStreamingPrompt(webContext);

        // Compute real aggregates from ALL rows to avoid hallucinated totals
        const aggregates = sqlExecuted ? computeAggregates(rows) : null;

        const narrativeUserContent = sqlExecuted
          ? JSON.stringify({
              question,
              contribuyenteRuc,
              rowCount,
              ...(aggregates
                ? { aggregates, note: "Usa SIEMPRE los valores de 'aggregates' para cifras y totales. Son calculados con TODOS los datos reales. Las sampleRows son solo una muestra parcial, NO las uses para calcular totales." }
                : {}),
              sampleRows: previewRows,
            })
          : `Pregunta: ${question}\n\nNo se consultaron datos del contribuyente. Responde solo con el contexto normativo proporcionado.`;

        const textStream = streamOpenAiText({
          temperature: 0.3,
          messages: [
            { role: "system", content: narrativeSystemPrompt },
            { role: "user", content: narrativeUserContent },
          ],
        });

        for await (const token of textStream) {
          send("delta", { text: token });
        }

        // Await metadata and send it
        const metadata = await metadataPromise;

        const chartConfig = metadata.chart
          ? {
              type: metadata.chart.type,
              title: metadata.chart.title,
              xKey: metadata.chart.xKey,
              yKeys: metadata.chart.yKeys,
              data: previewRows,
            }
          : undefined;

        if (chartConfig) {
          posthog.capture({
            distinctId: contribuyenteRuc,
            event: "ai_query_chart_generated",
            properties: {
              chart_type: chartConfig.type,
              contribuyente_ruc: contribuyenteRuc,
            },
          });
        }

        send("metadata", {
          highlights: metadata.highlights ?? [],
          followUp: metadata.follow_up ?? "",
          chartConfig: chartConfig ?? null,
          rowCount,
          previewRows: previewRows.slice(0, 5),
          searchSources,
        });

        // Track success
        posthog.capture({
          distinctId: contribuyenteRuc,
          event: "ai_query_streamed",
          properties: {
            contribuyente_ruc: contribuyenteRuc,
            row_count: rowCount,
            intent: intentResult.intent,
            has_chart: !!chartConfig,
            has_web_sources: searchSources.length > 0,
          },
        });

        send("done", {});
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Error inesperado procesando la consulta.";
        console.error("[AI-Agent-Stream] Error:", message);

        posthog.capture({
          distinctId: contribuyenteRuc,
          event: "ai_query_failed",
          properties: {
            contribuyente_ruc: contribuyenteRuc,
            error_message: message,
          },
        });

        send("delta", {
          text: `Lo siento, ocurrio un problema: ${message}`,
        });
        send("done", {});
      } finally {
        try {
          controller.close();
        } catch {
          // Controller may already be closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
