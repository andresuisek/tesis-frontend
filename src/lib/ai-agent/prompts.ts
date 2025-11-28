import fs from "node:fs";
import path from "node:path";

type BuildPromptOptions = {
  schemaSummary?: string;
  contribuyenteRuc: string;
  sessionHints?: string[];
  currentDateIso?: string;
  currentDateReadable?: string;
  currentYear?: number;
};

type SqlValidationResult = {
  valid: boolean;
  message?: string;
};

let cachedSchemaSummary: string | null = null;

const databaseDocPath = path.join(
  process.cwd(),
  ".cursor",
  "rules",
  "database.mdc"
);

const forbiddenSqlKeywords = [
  "insert",
  "update",
  "delete",
  "drop",
  "alter",
  "truncate",
];

const columnIgnorePatterns = [
  /^primary key/i,
  /^unique/i,
  /^foreign key/i,
  /^constraint/i,
];

function extractEnumSummaries(source: string) {
  const enumRegex =
    /CREATE TYPE\s+([a-zA-Z0-9_]+)\s+AS\s+ENUM\s*\(([\s\S]*?)\);/gi;
  const summaries: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = enumRegex.exec(source)) !== null) {
    const [, name, rawValues] = match;
    const values = rawValues
      .split(",")
      .map((value) => value.replace(/['\s]/g, ""))
      .filter(Boolean);
    summaries.push(`${name.trim()}: ${values.join(", ")}`);
  }

  return summaries;
}

function sanitizeColumnDefinition(line: string) {
  const normalized = line.replace(/,$/, "").trim();
  const [columnName, ...rest] = normalized.split(/\s+/);
  if (!columnName || !rest.length) {
    return null;
  }

  let columnType = rest.join(" ");
  columnType = columnType
    .replace(/DEFAULT.+/i, "")
    .replace(/REFERENCES.+/i, "")
    .trim();

  return `${columnName}:${columnType}`;
}

function extractTableSummaries(source: string) {
  const tableRegex = /CREATE TABLE\s+([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi;
  const summaries: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(source)) !== null) {
    const [, tableName, block] = match;
    const lines = block.split("\n").map((line) => line.trim());
    const columnSummary = lines
      .filter((line) => line.length)
      .filter((line) => !line.startsWith("--"))
      .filter((line) => !columnIgnorePatterns.some((regex) => regex.test(line)))
      .map(sanitizeColumnDefinition)
      .filter(Boolean)
      .slice(0, 12)
      .join(", ");

    if (columnSummary) {
      summaries.push(`${tableName.trim()}(${columnSummary})`);
    }
  }

  return summaries;
}

function buildSchemaSummary(source: string) {
  if (!source) {
    return "No se pudo cargar el esquema.";
  }

  const enumSummaries = extractEnumSummaries(source);
  const tableSummaries = extractTableSummaries(source);

  return [
    "Esquema disponible:",
    enumSummaries.length ? `Tipos ENUM -> ${enumSummaries.join(" | ")}` : "",
    tableSummaries.length ? `Tablas -> ${tableSummaries.join(" || ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function getSchemaSummary() {
  if (cachedSchemaSummary) {
    return cachedSchemaSummary;
  }

  try {
    const fileContents = fs.readFileSync(databaseDocPath, "utf-8");
    cachedSchemaSummary = buildSchemaSummary(fileContents);
    return cachedSchemaSummary;
  } catch (error) {
    cachedSchemaSummary = "No se encontró la descripción del esquema.";
    return cachedSchemaSummary;
  }
}

export function buildSystemPrompt(options: BuildPromptOptions) {
  const schemaSummary = options.schemaSummary ?? getSchemaSummary();
  const hints =
    options.sessionHints && options.sessionHints.length
      ? `Historial reciente:\n- ${options.sessionHints.join("\n- ")}`
      : "";
  const currentDateInfo = options.currentDateIso
    ? `Fecha actual: ${options.currentDateIso} (${
        options.currentDateReadable ?? "hora local"
      }).
Cuando el usuario use expresiones como "este mes" o "mes actual", asume el mes de la fecha actual.
Si menciona un mes sin año (ej. "octubre"), asume el año ${
        options.currentYear ?? "vigente"
      } salvo que especifique otro.`
    : "";

  return `
Eres un asistente experto en análisis tributario ecuatoriano que genera SQL seguro para Supabase/PostgreSQL.
Siempre responde en español y nunca inventes información.

Restricciones críticas:
- Toda consulta debe filtrar por contribuyente_ruc = '${options.contribuyenteRuc}' usando comillas simples.
- Solo puedes ejecutar SELECT. Nunca generes INSERT, UPDATE, DELETE ni DDL.
- Prefiere periodos basados en columnas fecha_emision o rangos solicitados.
- Limita los resultados (LIMIT 200) cuando devuelvas listados.
- Explica el resultado en pocas oraciones para un usuario no técnico.
${currentDateInfo}

Contexto:
${schemaSummary}

${hints}

Formato esperado (response_format):
- summary: explicación breve en un párrafo.
- sql: consulta lista para ejecutar.
- validation: menciona los filtros aplicados y tablas usadas.
- follow_up: una sugerencia de pregunta relacionada.
`;
}

function containsUnsafeKeyword(sql: string) {
  const lowerSql = sql.toLowerCase();
  return forbiddenSqlKeywords.some((keyword) => lowerSql.includes(keyword));
}

export function validateSqlForUser(
  sql: string,
  contribuyenteRuc: string
): SqlValidationResult {
  if (!sql?.trim()) {
    return { valid: false, message: "La respuesta no incluyó SQL." };
  }

  const sanitizedSql = sql.trim();
  const lowerSql = sanitizedSql.toLowerCase();

  if (!lowerSql.startsWith("select")) {
    return { valid: false, message: "Solo se permiten consultas SELECT." };
  }

  if (containsUnsafeKeyword(sanitizedSql)) {
    return {
      valid: false,
      message: "Se detectaron operaciones no permitidas en el SQL.",
    };
  }

  if (!lowerSql.includes("contribuyente_ruc")) {
    return {
      valid: false,
      message: "La consulta debe filtrar por la columna contribuyente_ruc.",
    };
  }

  const normalizedRuc = contribuyenteRuc.trim();
  const rucRegex = new RegExp(
    `contribuyente_ruc\\s*=\\s*'?${normalizedRuc}'?`,
    "i"
  );

  if (!rucRegex.test(sanitizedSql)) {
    return {
      valid: false,
      message: "El SQL debe incluir el filtro exacto de tu RUC.",
    };
  }

  return { valid: true };
}
