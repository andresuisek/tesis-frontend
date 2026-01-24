# 📊 Configuración de PostHog

Este documento describe la configuración de PostHog para error tracking, analytics y session replay en el Sistema de Gestión Tributaria.

## ✅ Estado de la Instalación

PostHog está **completamente configurado y funcionando** en este proyecto.

### Paquetes Instalados

- `posthog-js` v1.335.2 - Cliente para el navegador
- `posthog-node` v5.24.2 - Cliente para el servidor (API routes)

## 🔧 Configuración

### 1. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con:

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_s3wIhdrNbubbi9WqWIFuixvqnpbkYudRzqtsiDdmbJ2
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### 2. Archivos de Configuración

#### `instrumentation-client.ts` (Raíz del proyecto)

Inicialización del cliente de PostHog con:
- ✅ Reverse proxy configurado (`/ingest`)
- ✅ Error tracking automático (`capture_exceptions: true`)
- ✅ Debug mode en desarrollo

#### `next.config.mjs`

Configuración del reverse proxy para:
- Mejorar la confiabilidad del tracking
- Evitar bloqueos de ad-blockers
- Cumplir con políticas de CORS

#### `src/lib/posthog-server.ts`

Cliente singleton para tracking server-side en API routes.

## 📈 Eventos Implementados

### Autenticación

| Evento | Descripción | Archivo |
|--------|-------------|---------|
| `user_login_success` | Login exitoso con identificación de usuario | `src/app/(auth)/login/page.tsx` |
| `user_login_failed` | Intento de login fallido | `src/app/(auth)/login/page.tsx` |
| `user_signup_started` | Usuario inició registro | `src/app/(auth)/registro/page.tsx` |
| `user_signup_completed` | Registro completado | `src/app/(auth)/registro/page.tsx` |
| `user_signup_failed` | Error en registro | `src/app/(auth)/registro/page.tsx` |
| `user_logged_out` | Usuario cerró sesión | `src/app/logout/page.tsx` |

### Operaciones Tributarias

| Evento | Descripción | Archivo |
|--------|-------------|---------|
| `venta_created` | Nueva venta/factura creada | `src/app/(app)/modules/ventas/page.tsx` |
| `ventas_imported` | Importación de ventas desde TXT | `src/app/(app)/modules/ventas/page.tsx` |
| `compra_created` | Nueva compra registrada | `src/app/(app)/modules/compras/page.tsx` |
| `compras_imported` | Importación de compras desde TXT | `src/app/(app)/modules/compras/page.tsx` |
| `compra_deleted` | Compra eliminada | `src/app/(app)/modules/compras/page.tsx` |
| `liquidacion_created` | Liquidación de IVA generada | `src/app/(app)/modules/liquidacion/page.tsx` |

### Asistente IA

| Evento | Descripción | Archivo |
|--------|-------------|---------|
| `chatbot_message_sent` | Mensaje enviado al chatbot | `src/app/(app)/modules/chatbot/page.tsx` |
| `ai_query_submitted` | Query procesada por IA (server-side) | `src/app/api/ai-agent/query/route.ts` |
| `ai_query_success` | Query exitosa | `src/app/api/ai-agent/query/route.ts` |
| `ai_query_failed` | Query fallida | `src/app/api/ai-agent/query/route.ts` |

## 🎯 Funcionalidades Activas

### 1. Error Tracking

PostHog captura automáticamente:
- ✅ Excepciones no manejadas
- ✅ Errores de JavaScript
- ✅ Errores de API
- ✅ Errores de autenticación

**Uso manual:**

```typescript
import posthog from "posthog-js";

try {
  // código que puede fallar
} catch (error) {
  posthog.captureException(error);
  throw error;
}
```

### 2. User Identification

Los usuarios se identifican automáticamente al hacer login:

```typescript
posthog.identify(userId, {
  email: user.email,
  user_type: user.user_metadata?.user_type,
});
```

Al hacer logout, se resetea la sesión:

```typescript
posthog.reset();
```

### 3. Custom Events

Para trackear eventos personalizados:

```typescript
import posthog from "posthog-js";

posthog.capture("event_name", {
  property1: "value1",
  property2: "value2",
});
```

### 4. Session Replay

PostHog graba automáticamente las sesiones de usuario para debugging visual.

## 📊 Dashboards de PostHog

PostHog ha creado automáticamente estos dashboards:

1. **[Analytics Basics](https://us.posthog.com/project/297559/dashboard/1125640)** - Métricas core
2. **[User Authentication Funnel](https://us.posthog.com/project/297559/insights/6eI0ek4a)** - Conversión signup → login
3. **[Sales & Purchases Activity](https://us.posthog.com/project/297559/insights/c6HeuDHR)** - Actividad diaria
4. **[AI Assistant Usage](https://us.posthog.com/project/297559/insights/Lg2Nu5Ht)** - Uso del chatbot
5. **[Tax Liquidations Generated](https://us.posthog.com/project/297559/insights/jOpJOo4t)** - Liquidaciones mensuales
6. **[Login Success Rate](https://us.posthog.com/project/297559/insights/4iWE46pU)** - Tasa de éxito de login

## 🚀 Próximos Pasos

### Agregar Más Eventos

Para trackear nuevas funcionalidades:

1. Importa PostHog:
```typescript
import posthog from "posthog-js";
```

2. Captura el evento:
```typescript
posthog.capture("nombre_evento", {
  propiedad: "valor",
});
```

### Server-Side Tracking

Para eventos en API routes:

```typescript
import { getPostHogClient } from "@/lib/posthog-server";

const posthog = getPostHogClient();
posthog.capture({
  distinctId: userId,
  event: "nombre_evento",
  properties: {
    propiedad: "valor",
  },
});
```

## 🔒 Seguridad y Privacidad

- ✅ Las claves de API están en variables de entorno
- ✅ El reverse proxy protege contra ad-blockers
- ✅ Los datos sensibles NO se envían a PostHog
- ✅ Session replay respeta configuraciones de privacidad

## 🐛 Troubleshooting

### Los eventos no aparecen en PostHog

1. Verifica que `.env.local` exista y tenga las variables correctas
2. Abre la consola del navegador y busca errores de PostHog
3. Verifica que el debug mode esté activo en desarrollo:
   ```typescript
   debug: process.env.NODE_ENV === "development"
   ```

### Error de CORS

El reverse proxy debería resolver esto. Si persiste:
- Verifica que `next.config.mjs` tenga los rewrites correctos
- Reinicia el servidor de desarrollo

### Build Fails

Si el build falla después de instalar PostHog:
- Ejecuta `npm run build` para ver errores específicos
- Verifica que todas las importaciones sean correctas
- Asegúrate de que `.env.local` exista (aunque no se use en build)

## 📚 Recursos

- [Documentación de PostHog](https://posthog.com/docs)
- [Next.js Integration Guide](https://posthog.com/docs/libraries/next-js)
- [PostHog API Reference](https://posthog.com/docs/api)
- [Session Replay](https://posthog.com/docs/session-replay)
- [Feature Flags](https://posthog.com/docs/feature-flags)

## 💡 Tips

- Usa nombres de eventos descriptivos en snake_case: `user_login_success`
- Agrega contexto útil en las propiedades de los eventos
- Revisa regularmente los dashboards para insights
- Usa session replay para debugging de bugs reportados por usuarios
- Configura alertas en PostHog para eventos críticos

---

**Última actualización:** Enero 2026  
**Versión de PostHog:** posthog-js@1.335.2, posthog-node@5.24.2

