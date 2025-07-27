# SRI Digital - Sistema de Gestión Tributaria

Sistema web para la gestión tributaria de contribuyentes en Ecuador, desarrollado con Next.js 15, React 19 y TypeScript.

## 🚀 Características Principales

### 📊 Dashboard
- Resumen de métricas tributarias
- Visualización de ventas, compras y retenciones
- Obligaciones tributarias próximas
- Actividades recientes del sistema

### 👥 Registro de Usuarios
- Gestión de contribuyentes con datos del RUC
- Carga manual o desde PDF del SRI
- Campos obligatorios según normativa ecuatoriana
- Clasificación de obligaciones tributarias

### 🧾 Registro de Ventas
- Gestión de facturas y documentos de venta
- Cálculo automático de IVA (0%, 8%, 15%)
- Totales automáticos
- Exportación de datos para declaraciones

### 📋 Registro de Retenciones
- Gestión de retenciones de IVA e Impuesto a la Renta
- Porcentajes predefinidos según normativa
- Comprobantes de retención
- Cálculos automáticos

### 🛒 Registro de Compras
- Clasificación por rubros contables
- Gastos deducibles para Impuesto a la Renta
- Análisis por categorías
- Control de crédito tributario

### 🧮 Liquidación de Impuestos
- Cálculo automático de IVA a pagar/favor
- Liquidación de Impuesto a la Renta
- Generación de declaraciones
- Fechas de vencimiento

### 🤖 Asistente Virtual
- Chatbot integrado para consultas
- Respuestas sobre normativa tributaria
- Guías paso a paso
- Soporte en lenguaje natural

## 🛠️ Tecnologías Utilizadas

- **Frontend**: Next.js 15 con App Router
- **UI**: React 19 con TypeScript
- **Estilos**: Tailwind CSS 4
- **Iconos**: Heroicons (SVG)
- **Fuentes**: Geist Sans & Geist Mono

## 📁 Estructura del Proyecto

```
src/
├── app/                    # App Router de Next.js
│   ├── dashboard/          # Dashboard principal
│   ├── usuarios/           # Registro de contribuyentes
│   ├── ventas/            # Gestión de ventas
│   ├── retenciones/       # Gestión de retenciones
│   ├── compras/           # Gestión de compras
│   ├── liquidacion/       # Liquidación de impuestos
│   ├── layout.tsx         # Layout raíz
│   ├── page.tsx           # Página de inicio
│   └── globals.css        # Estilos globales
└── components/
    ├── layout/            # Componentes de layout
    │   ├── Sidebar.tsx    # Navegación lateral
    │   ├── Header.tsx     # Encabezado
    │   └── MainLayout.tsx # Layout principal
    ├── ui/                # Componentes UI reutilizables
    │   └── FormComponents.tsx # Inputs, botones, cards
    └── chatbot/           # Asistente virtual
        └── Chatbot.tsx    # Componente del chatbot
```

## 🎨 Diseño y UI

### Colores del Sistema
- **Azul SRI**: Colores corporativos del SRI Ecuador
- **Azul Primario**: `#1e3a8a` (sri-blue)
- **Azul Claro**: `#3b82f6` (sri-light-blue)
- **Azul Oscuro**: `#1e40af` (sri-dark-blue)
- **Azul Acento**: `#0ea5e9` (sri-accent)

### Componentes
- Navegación lateral colapsable
- Tarjetas informativas (cards)
- Formularios responsivos
- Tablas con paginación
- Chatbot flotante

## 🔧 Instalación y Desarrollo

### Prerrequisitos
- Node.js 18+ 
- npm, yarn o pnpm

### Instalación
```bash
# Clonar el repositorio
git clone [URL_DEL_REPOSITORIO]

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
```

### Scripts Disponibles
```bash
npm run dev     # Desarrollo con Turbopack
npm run build   # Construcción para producción
npm run start   # Servidor de producción
npm run lint    # Linting con ESLint
```

## 📋 Módulos del Sistema

### 1. Registro de Usuario
**Campos obligatorios según SRI:**
- Nombre y apellido
- RUC (Primary Key)
- Estado (Activo/Inactivo)
- Obligado a llevar contabilidad
- Agente de retención
- Teléfono, correo, dirección
- Actividades económicas
- Obligaciones tributarias (Mensual/Semestral/RIMPE)

### 2. Registro de Ventas
**Campos para declaraciones:**
- RUC del cliente
- Razón social
- Fecha de emisión
- Tipo y número de comprobante
- Subtotales por tarifa IVA (0%, 8%, 15%)
- IVA calculado automáticamente
- Total de la transacción

### 3. Registro de Retenciones
**Tipos de retención:**
- **IVA**: 30% (servicios), 70% (construcción), 100% (bienes 0%)
- **Renta**: 1% (intereses), 2% (servicios), 8% (construcción), 10% (transporte)

### 4. Registro de Compras
**Clasificación por rubros:**
- Gastos administrativos
- Gastos de ventas
- Costo de ventas
- Activos fijos
- Servicios profesionales
- Otros gastos deducibles

### 5. Liquidaci��n de Impuestos
**Cálculos automáticos:**
- IVA a pagar = IVA ventas - IVA compras - Retenciones IVA
- Base Renta = Ingresos - Gastos deducibles
- Impuesto Renta = Base × 2% (personas naturales)

## 🤖 Asistente Virtual

El chatbot integrado puede ayudar con:
- Consultas sobre normativa tributaria
- Explicación de procedimientos
- Fechas de vencimiento
- Tipos de retenciones
- Clasificación de rubros contables
- Guías paso a paso

**Comandos útiles:**
- `ayuda` - Lista de temas disponibles
- `iva` - Información sobre IVA
- `retenciones` - Tipos de retenciones
- `fechas` - Fechas de vencimiento
- `rubros` - Clasificación contable

## 📅 Obligaciones Tributarias

### Fechas de Vencimiento
- **IVA Mensual**: 28 del mes siguiente
- **Retenciones**: 28 del mes siguiente
- **Impuesto a la Renta**: Según 9no dígito del RUC
- **Anexos**: Marzo del año siguiente

### Tarifas de IVA Ecuador
- **0%**: Productos de canasta básica, medicinas, servicios básicos
- **8%**: Servicios digitales (desde 2025)
- **15%**: Servicios y productos gravados en general

## 🔒 Seguridad y Validaciones

- Validación de RUC ecuatoriano
- Campos obligatorios según normativa
- Cálculos automáticos para evitar errores
- Respaldos de formularios
- Validación de formatos de fecha y moneda

## 🚀 Deployment

### Netlify (Recomendado)
```bash
npm run build
# Subir carpeta .next a Netlify
```

### Vercel
```bash
vercel --prod
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📞 Soporte

Para soporte técnico o consultas:
- Email: andres.ontiveros24@gmail.com
- Documentación: [Wiki del proyecto]
- Issues: [GitHub Issues]

---

**Desarrollado por Andrés Ontiveros - Tesis de Grado 2025**

*Sistema diseñado para cumplir con la normativa tributaria del Ecuador según el SRI (Servicio de Rentas Internas).*
