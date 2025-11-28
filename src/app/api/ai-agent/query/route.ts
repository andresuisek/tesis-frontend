import { NextResponse } from "next/server";

import {
  buildSystemPrompt,
  getSchemaSummary,
  validateSqlForUser,
} from "@/lib/ai-agent/prompts";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type AgentRequestPayload = {
  question?: string;
  schemaSummary?: string;
  contribuyenteRuc?: string;
  sessionHints?: string[];
};

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const controllerTimeout = 45_000;

const sqlResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "consulta_tributaria",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: {
          type: "string",
          description: "Explicación breve en español apta para el usuario",
        },
        sql: {
          type: "string",
          description:
            "Consulta SQL en formato compatible con Supabase/PostgreSQL",
        },
        validation: {
          type: "string",
          description: "Describe los filtros de seguridad aplicados en el SQL",
        },
        follow_up: {
          type: "string",
          description: "Pregunta sugerida para continuar la conversación",
        },
      },
      required: ["summary", "sql"],
    },
  },
};

const friendlyResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "respuesta_tributaria",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: {
          type: "string",
          description:
            "Respuesta narrativa amigable para usuarios no técnicos.",
        },
        highlights: {
          type: "array",
          items: { type: "string" },
          description: "Viñetas con hallazgos clave.",
        },
        follow_up: {
          type: "string",
          description: "Siguiente pregunta sugerida.",
        },
      },
      required: ["summary"],
    },
  },
};

type OpenAiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

async function callOpenAi({
  messages,
  responseFormat,
  temperature = 0.2,
}: {
  messages: OpenAiMessage[];
  responseFormat: Record<string, unknown>;
  temperature?: number;
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Falta la variable de entorno OPENAI_API_KEY");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), controllerTimeout);

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature,
        response_format: responseFormat,
        messages,
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      const message =
        errorPayload?.error?.message ??
        "La API de OpenAI no pudo procesar la consulta. Intenta nuevamente.";
      throw new Error(message);
    }

    const completion = await response.json();
    const rawContent = completion?.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("OpenAI no devolvió contenido utilizable.");
    }

    return JSON.parse(rawContent);
  } catch (error) {
    clearTimeout(timeout);

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("La petición a OpenAI excedió el tiempo de espera");
    }

    throw error;
  }
}

function prepareRowsForModel(
  rows: Record<string, unknown>[],
  limit = 20,
  maxColumns = 12
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

export async function POST(req: Request) {
  let payload: AgentRequestPayload;

  try {
    payload = await req.json();
  } catch (error) {
    return NextResponse.json(
      { error: "El cuerpo de la petición no es un JSON válido" },
      { status: 400 }
    );
  }

  const question = payload.question?.trim();
  if (!question) {
    return NextResponse.json(
      { error: "Debes enviar la propiedad 'question' con tu consulta" },
      { status: 400 }
    );
  }

  const contribuyenteRuc = payload.contribuyenteRuc ?? "desconocido";
  const schemaSummary = payload.schemaSummary ?? getSchemaSummary();

  const now = new Date();

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

  try {
    const sqlResponse = await callOpenAi({
      responseFormat: sqlResponseFormat,
      temperature: 0.1,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    });

    const sanitizedSql = sanitizeSql(sqlResponse.sql);

    const validationResult = validateSqlForUser(sanitizedSql, contribuyenteRuc);
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: validationResult.message, sql: sanitizedSql },
        { status: 400 }
      );
    }

    console.info("[AI-Agent] Ejecutando SQL seguro:", sanitizedSql);
    const rows = await executeQueryViaRpc(sanitizedSql);
    const previewRows = prepareRowsForModel(rows);

    const friendlyResponse = await callOpenAi({
      responseFormat: friendlyResponseFormat,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Eres un asesor tributario que explica resultados en español claro. Nunca muestres el SQL ni detalles técnicos. Resume en uno o dos párrafos, añade viñetas si ayudan y sugiere próximos pasos.",
        },
        {
          role: "user",
          content: JSON.stringify({
            question,
            contribuyenteRuc,
            rowCount: rows.length,
            sampleRows: previewRows,
          }),
        },
      ],
    });

    return NextResponse.json({
      summary: friendlyResponse.summary,
      highlights: friendlyResponse.highlights ?? [],
      followUp: friendlyResponse.follow_up,
      rowCount: rows.length,
      previewRows,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Ocurrió un error inesperado procesando la consulta.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

async function executeQueryViaRpc(sql: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.rpc("execute_sql_query", {
    query_text: sql,
  });

  if (error) {
    console.error("Supabase RPC error:", error);
    throw new Error(
      "No fue posible ejecutar la consulta en Supabase. Verifica la información solicitada."
    );
  }

  const rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[];

  return rows;
}

function sanitizeSql(sql: string) {
  const trimmed = sql.trim();
  return trimmed.replace(/;+\s*$/g, "");
}
