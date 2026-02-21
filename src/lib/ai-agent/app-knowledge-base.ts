export type AppModule = {
  id: string;
  name: string;
  route: string;
  description: string;
  availableFor: ("contribuyente" | "contador")[];
  features: string[];
  guides: { task: string; steps: string[] }[];
  relatedModules: string[];
};

export const APP_MODULES: AppModule[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    route: "/dashboard",
    description:
      "Pantalla principal con resumen de tu situación tributaria. Muestra KPIs de ventas, compras e IVA, gráficos de tendencias, estado de tu declaración mensual y fecha límite del SRI según tu noveno dígito.",
    availableFor: ["contribuyente", "contador"],
    features: [
      "KPIs de ventas, compras e IVA del período actual",
      "Gráfico de tendencias de IVA (ventas vs compras)",
      "Tarjeta de estado tributario con semáforo (al día, próximo, vencido)",
      "Actividad reciente (últimas transacciones registradas)",
      "Fecha límite de declaración según noveno dígito del RUC",
    ],
    guides: [
      {
        task: "Ver mi resumen tributario",
        steps: [
          "Navega a Dashboard desde el menú lateral",
          "En la parte superior verás los KPIs principales: ventas, compras e IVA",
          "El gráfico muestra la evolución mensual del IVA",
          "La tarjeta de estado tributario indica si estás al día con tus declaraciones",
        ],
      },
    ],
    relatedModules: ["carga-tributaria", "liquidacion"],
  },
  {
    id: "carga-tributaria",
    name: "Carga Tributaria (Asistente de Carga)",
    route: "/modules/assistant",
    description:
      "Wizard guiado de 7 pasos para cargar toda tu información tributaria de un período fiscal. Permite importar ventas, notas de crédito, retenciones y compras desde archivos TXT o XML del SRI.",
    availableFor: ["contribuyente", "contador"],
    features: [
      "Selección de período fiscal (mes y año)",
      "Importación de ventas desde archivo TXT del SRI",
      "Carga de notas de crédito en ventas",
      "Importación de retenciones desde archivo XML",
      "Importación de compras desde archivo TXT del SRI",
      "Procesamiento automático de todos los datos",
      "Resumen final con totales del período",
    ],
    guides: [
      {
        task: "Cargar datos tributarios de un mes",
        steps: [
          "Ve a Carga Tributaria en el menú lateral",
          "Paso 1: Selecciona el período (mes y año) que deseas cargar",
          "Paso 2: Sube el archivo TXT de ventas descargado del SRI",
          "Paso 3: Si tienes notas de crédito en ventas, cárgalas aquí (opcional)",
          "Paso 4: Sube el archivo XML de retenciones recibidas (opcional)",
          "Paso 5: Sube el archivo TXT de compras descargado del SRI",
          "Paso 6: El sistema procesa y valida todos los datos automáticamente",
          "Paso 7: Revisa el resumen con los totales del período",
        ],
      },
      {
        task: "Descargar archivos del SRI para importar",
        steps: [
          "Ingresa a SRI en Línea (sri.gob.ec) con tu clave",
          "Ve a Consultas > Comprobantes Electrónicos",
          "Selecciona el período y tipo de comprobante",
          "Descarga el archivo en formato TXT (ventas/compras) o XML (retenciones)",
          "Usa ese archivo en el Asistente de Carga de la aplicación",
        ],
      },
    ],
    relatedModules: ["ventas", "compras", "retenciones", "notas-credito"],
  },
  {
    id: "ventas",
    name: "Ventas",
    route: "/modules/ventas",
    description:
      "Módulo para gestionar todas tus facturas de ventas. Permite ver, crear, importar y administrar ventas, así como crear notas de crédito y retenciones asociadas.",
    availableFor: ["contribuyente", "contador"],
    features: [
      "Listado de ventas con filtros por período, cliente y monto",
      "Crear venta manualmente",
      "Importar ventas desde archivo TXT",
      "Ver detalle completo de cada venta",
      "Crear nota de crédito asociada a una venta",
      "Crear retención asociada a una venta",
    ],
    guides: [
      {
        task: "Importar ventas desde TXT",
        steps: [
          "Ve al módulo de Ventas",
          "Haz clic en el botón 'Importar' en la parte superior",
          "Selecciona el archivo TXT descargado del SRI",
          "El sistema procesará y mostrará las ventas encontradas",
          "Confirma la importación",
        ],
      },
      {
        task: "Crear una nota de crédito desde una venta",
        steps: [
          "Ve al módulo de Ventas",
          "Busca la venta a la que necesitas asociar una nota de crédito",
          "Haz clic en la venta para ver su detalle",
          "Selecciona la opción 'Crear Nota de Crédito'",
          "Completa los datos requeridos y guarda",
        ],
      },
    ],
    relatedModules: ["notas-credito", "retenciones", "carga-tributaria"],
  },
  {
    id: "compras",
    name: "Compras",
    route: "/modules/compras",
    description:
      "Módulo para gestionar todas tus facturas de compras. Permite filtrar por rubro, proveedor y deducibilidad, y manejar gastos personales para la declaración.",
    availableFor: ["contribuyente", "contador"],
    features: [
      "Listado de compras con filtros por período, proveedor y rubro",
      "Crear compra manualmente",
      "Importar compras desde archivo TXT",
      "Filtrar por deducibilidad (gasto deducible / no deducible)",
      "Clasificación de gastos personales",
      "Ver detalle completo de cada compra",
    ],
    guides: [
      {
        task: "Ver compras por proveedor",
        steps: [
          "Ve al módulo de Compras",
          "Usa el filtro de proveedor en la parte superior",
          "Escribe el nombre o RUC del proveedor",
          "Los resultados se filtrarán automáticamente",
        ],
      },
      {
        task: "Importar compras desde TXT",
        steps: [
          "Ve al módulo de Compras",
          "Haz clic en el botón 'Importar'",
          "Selecciona el archivo TXT de compras del SRI",
          "Revisa el resumen de importación",
          "Confirma para guardar las compras",
        ],
      },
    ],
    relatedModules: ["carga-tributaria", "liquidacion"],
  },
  {
    id: "liquidacion",
    name: "Liquidación de IVA",
    route: "/modules/liquidacion",
    description:
      "Módulo que genera la liquidación mensual de IVA calculando automáticamente el impuesto a pagar o el crédito tributario a favor, siguiendo la normativa del SRI y la prelación del crédito tributario.",
    availableFor: ["contribuyente", "contador"],
    features: [
      "Generación automática de liquidación de IVA mensual",
      "Cálculo de IVA en ventas e IVA en compras (crédito tributario)",
      "Aplicación de prelación de crédito tributario (F104)",
      "Detalle desglosado por tarifa de IVA",
      "Exportación de historial de liquidaciones",
      "Comparación entre períodos",
    ],
    guides: [
      {
        task: "Generar la liquidación de IVA de un mes",
        steps: [
          "Asegúrate de haber cargado ventas y compras del período (usa el Asistente de Carga)",
          "Ve al módulo de Liquidación de IVA",
          "Selecciona el período (mes y año)",
          "Haz clic en 'Generar Liquidación'",
          "El sistema calculará automáticamente el IVA a pagar o crédito tributario",
          "Revisa el detalle y descárgalo si lo necesitas",
        ],
      },
    ],
    relatedModules: ["ventas", "compras", "carga-tributaria"],
  },
  {
    id: "notas-credito",
    name: "Notas de Crédito",
    route: "/modules/notas-credito",
    description:
      "Módulo para visualizar y gestionar las notas de crédito emitidas en ventas. Permite filtrar por período y ver el detalle de cada nota.",
    availableFor: ["contribuyente", "contador"],
    features: [
      "Listado de notas de crédito con filtros por período",
      "Ver detalle completo de cada nota de crédito",
      "Asociación automática con la venta original",
    ],
    guides: [
      {
        task: "Ver notas de crédito de un período",
        steps: [
          "Ve al módulo de Notas de Crédito",
          "Selecciona el período usando los filtros de fecha",
          "Verás el listado de notas de crédito del período",
          "Haz clic en cualquier nota para ver su detalle",
        ],
      },
    ],
    relatedModules: ["ventas"],
  },
  {
    id: "retenciones",
    name: "Retenciones",
    route: "/modules/retenciones",
    description:
      "Módulo para gestionar las retenciones de IVA y renta recibidas. Permite importar retenciones desde archivos XML y filtrar por período.",
    availableFor: ["contribuyente", "contador"],
    features: [
      "Listado de retenciones con filtros por período",
      "Importar retenciones desde archivo XML",
      "Ver detalle de cada retención (impuestos retenidos, porcentajes)",
      "Resumen de retenciones por tipo de impuesto",
    ],
    guides: [
      {
        task: "Importar retenciones desde XML",
        steps: [
          "Ve al módulo de Retenciones",
          "Haz clic en 'Importar XML'",
          "Selecciona el archivo XML de retenciones",
          "El sistema procesará y mostrará las retenciones encontradas",
          "Confirma la importación",
        ],
      },
    ],
    relatedModules: ["ventas", "carga-tributaria"],
  },
  {
    id: "clientes",
    name: "Mis Clientes",
    route: "/modules/clientes",
    description:
      "Módulo exclusivo para contadores. Permite gestionar la cartera de clientes (contribuyentes), vincular nuevos clientes, cambiar el cliente activo para trabajar con sus datos, y ver un timeline de vencimientos.",
    availableFor: ["contador"],
    features: [
      "Listado de clientes vinculados",
      "Crear y vincular nuevos clientes",
      "Cambiar el cliente activo para operar con sus datos",
      "Timeline de vencimientos de declaraciones de todos los clientes",
      "Datos del contribuyente (RUC, razón social, dirección)",
    ],
    guides: [
      {
        task: "Agregar un nuevo cliente",
        steps: [
          "Ve al módulo Mis Clientes",
          "Haz clic en 'Nuevo Cliente'",
          "Ingresa el RUC del contribuyente",
          "Completa los datos solicitados (razón social, etc.)",
          "Guarda para vincular al cliente a tu cuenta",
        ],
      },
      {
        task: "Cambiar el cliente activo",
        steps: [
          "Ve al módulo Mis Clientes o usa el selector de cliente en la barra superior",
          "Selecciona el cliente con el que deseas trabajar",
          "Todos los módulos ahora mostrarán los datos de ese cliente",
        ],
      },
    ],
    relatedModules: ["dashboard", "carga-tributaria"],
  },
];

export function getModulesForUser(
  userType: "contribuyente" | "contador"
): AppModule[] {
  return APP_MODULES.filter((m) => m.availableFor.includes(userType));
}

export function findModuleByRoute(route: string): AppModule | undefined {
  return APP_MODULES.find(
    (m) => route === m.route || route.startsWith(m.route + "/")
  );
}
