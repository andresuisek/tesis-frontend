import {
  getModulesForUser,
  findModuleByRoute,
  type AppModule,
} from "./app-knowledge-base";

function formatModuleForPrompt(mod: AppModule): string {
  const guides = mod.guides
    .map(
      (g) =>
        `  Tarea: "${g.task}"\n  Pasos:\n${g.steps.map((s, i) => `    ${i + 1}. ${s}`).join("\n")}`
    )
    .join("\n");

  return `### ${mod.name} (${mod.route})
Descripción: ${mod.description}
Funcionalidades: ${mod.features.join(", ")}
Guías:
${guides}`;
}

export function buildAppHelpPrompt(options: {
  userType: "contribuyente" | "contador";
  currentPath?: string;
  hasActiveContribuyente: boolean;
}): string {
  const { userType, currentPath, hasActiveContribuyente } = options;
  const modules = getModulesForUser(userType);
  const currentModule = currentPath
    ? findModuleByRoute(currentPath)
    : undefined;

  const modulesDocs = modules.map(formatModuleForPrompt).join("\n\n");

  const currentContext = currentModule
    ? `\nEl usuario está actualmente en el módulo "${currentModule.name}" (${currentModule.route}). Prioriza información relevante a este módulo en tu respuesta.`
    : "";

  const clientContext =
    userType === "contador" && !hasActiveContribuyente
      ? "\nEl usuario es un contador y NO tiene un cliente activo seleccionado. Recomiéndale ir a 'Mis Clientes' para seleccionar un cliente antes de usar otros módulos."
      : "";

  return `Eres el asistente de ayuda de una aplicación web de gestión tributaria ecuatoriana. Tu rol es guiar al usuario sobre cómo usar la aplicación, explicar módulos y dar instrucciones paso a paso.

Tipo de usuario: ${userType}${currentContext}${clientContext}

## Módulos disponibles para este usuario:

${modulesDocs}

## Instrucciones:
- Responde siempre en español ecuatoriano, de forma clara y amigable
- Usa pasos numerados cuando expliques procedimientos
- Si la pregunta se refiere a un módulo específico, incluye su ruta en navigation_actions
- Si la pregunta es general ("qué puedo hacer", "para qué sirve la app"), da un overview con los módulos más relevantes
- Sugiere 2-3 preguntas de seguimiento relevantes en follow_ups
- NO inventes funcionalidades que no estén en la documentación
- NO consultes datos fiscales del usuario, solo explica cómo usar la app

Responde SOLO con JSON válido en este formato exacto:
{
  "narrative": "Tu respuesta en markdown con pasos numerados si aplica",
  "navigation_actions": [{"label": "Texto del botón", "route": "/ruta"}],
  "follow_ups": ["Pregunta sugerida 1", "Pregunta sugerida 2"]
}`;
}

export const appHelpResponseFormat = {
  type: "json_schema" as const,
  json_schema: {
    name: "app_help_response",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        narrative: {
          type: "string",
          description: "Respuesta en markdown con instrucciones paso a paso",
        },
        navigation_actions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              label: { type: "string" },
              route: { type: "string" },
            },
            required: ["label", "route"],
          },
          description: "Botones de navegación con rutas de la app",
        },
        follow_ups: {
          type: "array",
          items: { type: "string" },
          description: "2-3 preguntas de seguimiento sugeridas",
        },
      },
      required: ["narrative", "navigation_actions", "follow_ups"],
    },
  },
};
