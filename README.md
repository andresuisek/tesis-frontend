# Sistema de Gestión Tributaria

Un sistema completo desarrollado en Next.js para la gestión de obligaciones tributarias empresariales, construido con las mejores prácticas y tecnologías modernas.

## 🚀 Características Principales

### Módulos Implementados

- **📊 Dashboard**: Panel principal con métricas y estadísticas
- **💰 Gestión de Ventas**: Registro y control de facturas de venta
- **🛒 Gestión de Compras**: Administración de facturas de proveedores
- **📋 Retenciones**: Cálculo y emisión de comprobantes de retención
- **🧮 Liquidación de Impuestos**: Cálculo automático de IVA y Renta
- **🏢 Consulta RUC**: Validación y consulta de datos tributarios
- **👥 Gestión de Usuarios**: Control de acceso y permisos
- **🤖 Chatbot Tributario**: Asistente virtual para consultas
- **⚙️ Configuración**: Personalización del sistema

### Tecnologías Utilizadas

- **Frontend**: Next.js 15, React 19, TypeScript 5
- **Estilos**: Tailwind CSS 4, shadcn/ui
- **Componentes**: Radix UI, Lucide React
- **Tablas**: TanStack Table
- **Temas**: next-themes (modo claro/oscuro)
- **Notificaciones**: Sonner

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── (app)/                 # Rutas protegidas de la aplicación
│   │   ├── dashboard/         # Panel principal
│   │   ├── modules/           # Módulos del sistema
│   │   │   ├── ventas/        # Gestión de ventas
│   │   │   ├── compras/       # Gestión de compras
│   │   │   ├── retenciones/   # Retenciones
│   │   │   ├── liquidacion/   # Liquidación de impuestos
│   │   │   ├── registro-ruc/  # Consulta RUC
│   │   │   ├── usuarios/      # Gestión de usuarios
│   │   │   └── chatbot/       # Asistente virtual
│   │   └── layout.tsx         # Layout con sidebar
│   ├── (auth)/                # Rutas de autenticación
│   │   └── login/             # Página de login
│   └── logout/                # Página de logout
├── components/
│   ├── ui/                    # Componentes de shadcn/ui
│   ├── forms/                 # Componentes de formularios
│   ├── tables/                # Componentes de tablas
│   ├── app-sidebar.tsx        # Sidebar principal
│   ├── mode-toggle.tsx        # Selector de tema
│   └── theme-provider.tsx     # Proveedor de temas
├── contexts/
│   └── app-context.tsx        # Context global de la app
└── lib/
    └── utils.ts               # Utilidades
```

## 🎨 Características de UI/UX

### Diseño Moderno

- **Interfaz limpia** con componentes de shadcn/ui
- **Modo oscuro/claro** con transiciones suaves
- **Responsive design** para todos los dispositivos
- **Iconografía consistente** con Lucide React

### Componentes Reutilizables

- **DataTable**: Tablas con búsqueda, paginación y ordenamiento
- **FormFieldWrapper**: Wrapper para campos de formulario
- **Cards informativos** con métricas y estadísticas
- **Sidebar navegable** con todos los módulos

### Experiencia de Usuario

- **Navegación intuitiva** con sidebar colapsible
- **Feedback visual** con notificaciones toast
- **Estados de carga** y validaciones en tiempo real
- **Búsqueda y filtrado** en todas las tablas

## 📊 Funcionalidades por Módulo

### Dashboard

- Métricas principales (ventas, compras, IVA, retenciones)
- Actividad reciente del sistema
- Próximos vencimientos tributarios
- Gráficos y estadísticas visuales

### Ventas

- Registro de facturas y notas de crédito/débito
- Cálculo automático de IVA
- Búsqueda y filtrado por cliente
- Métricas de ventas mensuales

### Compras

- Registro de facturas de proveedores
- Control de retenciones aplicadas
- Análisis por tipo de comprobante
- Estado de conciliación

### Retenciones

- Emisión de comprobantes de retención
- Calculadora automática de retenciones
- Códigos de retención frecuentes
- Validación de porcentajes según tipo

### Liquidación

- Cálculo automático de IVA mensual
- Liquidación de Impuesto a la Renta
- Generación de formularios (F104, F103)
- Control de fechas de vencimiento

### Consulta RUC

- Validación de formato de RUC
- Consulta de datos tributarios
- Información de actividades económicas
- Datos de representante legal

### Usuarios

- Gestión de cuentas de usuario
- Sistema de roles y permisos
- Registro de actividad
- Control de acceso por módulos

### Chatbot

- Asistente virtual tributario
- Preguntas frecuentes
- Calculadoras rápidas
- Respuestas contextuales

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js 18+
- npm o yarn

### Pasos de instalación

1. **Clonar el repositorio**

```bash
git clone <repository-url>
cd tesis-frontend
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Ejecutar en desarrollo**

```bash
npm run dev
```

4. **Abrir en el navegador**

```
http://localhost:3000
```

### Configuración del agente inteligente

1. **Definir variables de entorno**

   Crea un archivo `.env.local` en la raíz del proyecto con:

   ```
   OPENAI_API_KEY=sk-xxxx
   OPENAI_MODEL=gpt-4o-mini
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   ```

   El `SUPABASE_SERVICE_ROLE_KEY` se obtiene desde la consola de Supabase (Settings → API). No lo expongas en el frontend.

2. **Endpoint disponible**

   Envía solicitudes `POST` a `/api/ai-agent/query` con el cuerpo:

   ```json
   {
     "question": "¿Cuál fue mi total de ventas en marzo?",
     "contribuyenteRuc": "1790012345001"
   }
   ```

   El backend generará el SQL, lo ejecutará en Supabase y devolverá únicamente un resumen amigable,
   viñetas con hallazgos y una sugerencia para continuar la conversación.

### Credenciales de prueba

- **Email**: admin@empresa.com
- **Contraseña**: 123456

## 🛠️ Scripts Disponibles

```bash
npm run dev      # Ejecutar en desarrollo con Turbopack
npm run build    # Construir para producción
npm run start    # Ejecutar build de producción
npm run lint     # Ejecutar ESLint
```

## 📱 Responsive Design

El sistema está optimizado para:

- **Desktop** (1024px+): Experiencia completa con sidebar
- **Tablet** (768px-1023px): Layout adaptado con navegación colapsible
- **Mobile** (320px-767px): Interfaz móvil optimizada

## 🔧 Personalización

### Temas

El sistema soporta modo claro y oscuro automático:

- Variables CSS personalizables en `globals.css`
- Configuración de colores en `tailwind.config.js`
- Componentes con soporte nativo para dark mode

### Componentes

Todos los componentes son modulares y reutilizables:

- Fácil personalización de estilos
- Props configurables para diferentes casos de uso
- Documentación integrada con TypeScript

## 🔒 Seguridad

- **Validación de formularios** en cliente y servidor
- **Sanitización de datos** de entrada
- **Control de acceso** basado en roles
- **Sesiones seguras** con tokens JWT (preparado)

## 📈 Rendimiento

- **Server Components** de React 19
- **Lazy loading** de componentes pesados
- **Optimización de imágenes** automática
- **Bundle splitting** inteligente

## 🧪 Testing (Preparado)

Estructura preparada para:

- Unit tests con Jest
- Integration tests con React Testing Library
- E2E tests con Playwright

## 📝 Próximas Funcionalidades

- [ ] Integración con API del SRI
- [ ] Reportes PDF avanzados
- [ ] Sincronización con sistemas contables
- [ ] Notificaciones push
- [ ] Backup automático de datos
- [ ] Multi-empresa

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👨‍💻 Autor

**Andrés Ontiveros**

- Proyecto de Tesis de Grado
- Universidad: [Tu Universidad]
- Año: 2024

## 📞 Soporte

Para soporte técnico o consultas:

- Email: [tu-email@universidad.edu]
- Issues: [GitHub Issues](link-to-issues)

---

⭐ **¡Si te gusta este proyecto, dale una estrella!** ⭐
