-- =============================================================================
-- SCHEMA DE BASE DE DATOS - SUPABASE
-- =============================================================================
-- Proyecto: Sistema de Gestión Tributaria
-- Base de Datos: PostgreSQL 17.4.1.064
-- Fecha de exportación: 2025-12-21
-- Generado desde: Supabase (tqrxlnopvqusqxaljzlz)
--
-- 📊 DIAGRAMA ER: Ver archivo diagrama-er.md para visualización interactiva
-- =============================================================================

-- -----------------------------------------------------------------------------
-- EXTENSIONES
-- -----------------------------------------------------------------------------

-- Extensión para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

-- Extensión para funciones criptográficas
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;

-- Extensión para estadísticas de SQL
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" SCHEMA extensions;

-- Extensión para GraphQL
CREATE EXTENSION IF NOT EXISTS "pg_graphql" SCHEMA graphql;

-- Extensión Supabase Vault
CREATE EXTENSION IF NOT EXISTS "supabase_vault" SCHEMA vault;


-- -----------------------------------------------------------------------------
-- TIPOS ENUM PERSONALIZADOS
-- -----------------------------------------------------------------------------

-- Tipo: Estado del contribuyente
CREATE TYPE contribuyente_estado AS ENUM (
    'activo',
    'inactivo'
);

-- Tipo: Tipo de obligación tributaria
CREATE TYPE tipo_obligacion AS ENUM (
    'mensual',
    'semestral',
    'anual'
);

-- Tipo: Rubro de compra (para deducciones)
CREATE TYPE rubro_compra AS ENUM (
    'no_definido',
    'vivienda',
    'alimentacion',
    'salud',
    'educacion',
    'vestimenta',
    'turismo',
    'actividad_profesional'
);

-- Tipo: Tipo de comprobante fiscal
CREATE TYPE tipo_comprobante AS ENUM (
    'factura',
    'nota_credito',
    'liquidacion_compra',
    'retencion',
    'otros'
);


-- =============================================================================
-- TABLAS PRINCIPALES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABLA: contribuyentes
-- Descripción: Almacena información de los contribuyentes (usuarios RUC)
-- -----------------------------------------------------------------------------
CREATE TABLE contribuyentes (
    -- Identificación
    ruc CHAR(13) PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Información personal
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(120),
    direccion TEXT,
    
    -- Estado y configuración tributaria
    estado contribuyente_estado NOT NULL DEFAULT 'activo',
    tipo_obligacion tipo_obligacion NOT NULL DEFAULT 'mensual',
    cargas_familiares SMALLINT NOT NULL DEFAULT 0 CHECK (cargas_familiares >= 0),
    obligado_contab BOOLEAN NOT NULL DEFAULT false,
    agente_retencion BOOLEAN NOT NULL DEFAULT false,
    
    -- Auditoría
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Índices para contribuyentes
CREATE INDEX idx_contribuyentes_user_id ON contribuyentes(user_id);
CREATE INDEX idx_contribuyentes_email ON contribuyentes(email);

COMMENT ON TABLE contribuyentes IS 'Tabla principal de contribuyentes registrados en el sistema';
COMMENT ON COLUMN contribuyentes.ruc IS 'RUC de 13 dígitos del contribuyente (PK)';
COMMENT ON COLUMN contribuyentes.user_id IS 'Referencia al usuario de autenticación de Supabase';
COMMENT ON COLUMN contribuyentes.cargas_familiares IS 'Número de cargas familiares para deducciones';


-- -----------------------------------------------------------------------------
-- TABLA: actividades_economicas
-- Descripción: Catálogo de actividades económicas del SRI
-- -----------------------------------------------------------------------------
CREATE TABLE actividades_economicas (
    codigo VARCHAR(10) PRIMARY KEY,
    descripcion TEXT NOT NULL,
    aplica_iva BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON TABLE actividades_economicas IS 'Catálogo de actividades económicas según clasificación del SRI';
COMMENT ON COLUMN actividades_economicas.aplica_iva IS 'Indica si la actividad está gravada con IVA';


-- -----------------------------------------------------------------------------
-- TABLA: contribuyente_actividad
-- Descripción: Relación muchos a muchos entre contribuyentes y actividades económicas
-- -----------------------------------------------------------------------------
CREATE TABLE contribuyente_actividad (
    contribuyente_ruc CHAR(13) NOT NULL REFERENCES contribuyentes(ruc) ON DELETE CASCADE,
    actividad_codigo VARCHAR(10) NOT NULL REFERENCES actividades_economicas(codigo),
    PRIMARY KEY (contribuyente_ruc, actividad_codigo)
);

-- Índice para la relación
CREATE INDEX idx_contribuyente_actividad ON contribuyente_actividad(contribuyente_ruc, actividad_codigo);

COMMENT ON TABLE contribuyente_actividad IS 'Relaciona contribuyentes con sus actividades económicas registradas';


-- -----------------------------------------------------------------------------
-- TABLA: ventas
-- Descripción: Registro de facturas de venta emitidas
-- -----------------------------------------------------------------------------
CREATE TABLE ventas (
    -- Identificación
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    contribuyente_ruc CHAR(13) REFERENCES contribuyentes(ruc) ON DELETE CASCADE,
    
    -- Datos del cliente
    ruc_cliente CHAR(13),
    razon_social_cliente VARCHAR(255),
    
    -- Datos del comprobante
    fecha_emision DATE NOT NULL,
    tipo_comprobante tipo_comprobante NOT NULL DEFAULT 'factura',
    numero_comprobante VARCHAR(30) NOT NULL,
    
    -- Valores tributarios
    subtotal_0 NUMERIC(12,2) DEFAULT 0,
    subtotal_8 NUMERIC(12,2) DEFAULT 0,
    subtotal_15 NUMERIC(12,2) DEFAULT 0,
    iva NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) NOT NULL,
    
    -- Relaciones con otros documentos
    nota_credito_id UUID REFERENCES notas_credito(id) ON DELETE SET NULL,
    retencion_id UUID REFERENCES retenciones(id) ON DELETE SET NULL,
    
    -- Auditoría
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Índices para ventas
CREATE INDEX idx_ventas_contribuyente ON ventas(contribuyente_ruc);

COMMENT ON TABLE ventas IS 'Registro de facturas de venta y otros comprobantes de ingreso';
COMMENT ON COLUMN ventas.subtotal_0 IS 'Subtotal con tarifa 0% de IVA';
COMMENT ON COLUMN ventas.subtotal_8 IS 'Subtotal con tarifa 8% de IVA';
COMMENT ON COLUMN ventas.subtotal_15 IS 'Subtotal con tarifa 15% de IVA';


-- -----------------------------------------------------------------------------
-- TABLA: compras
-- Descripción: Registro de compras y gastos deducibles
-- -----------------------------------------------------------------------------
CREATE TABLE compras (
    -- Identificación
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    contribuyente_ruc CHAR(13) REFERENCES contribuyentes(ruc) ON DELETE CASCADE,
    
    -- Datos del proveedor
    ruc_proveedor CHAR(13),
    razon_social_proveedor VARCHAR(255),
    
    -- Datos del comprobante
    fecha_emision DATE NOT NULL,
    tipo_comprobante tipo_comprobante,
    numero_comprobante VARCHAR(30),
    clave_acceso VARCHAR(49) UNIQUE,
    
    -- Clasificación fiscal
    rubro rubro_compra DEFAULT 'no_definido',
    
    -- Valores tributarios
    valor_sin_impuesto NUMERIC(12,2) DEFAULT 0,
    subtotal_0 NUMERIC(12,2) DEFAULT 0,
    subtotal_8 NUMERIC(12,2) DEFAULT 0,
    subtotal_15 NUMERIC(12,2) DEFAULT 0,
    iva NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) NOT NULL,
    
    -- Auditoría
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Índices para compras
CREATE INDEX idx_compras_contribuyente ON compras(contribuyente_ruc);
CREATE UNIQUE INDEX compras_clave_acceso_unique ON compras(clave_acceso);

COMMENT ON TABLE compras IS 'Registro de compras y gastos para deducciones tributarias';
COMMENT ON COLUMN compras.rubro IS 'Clasificación del gasto para deducciones de gastos personales';
COMMENT ON COLUMN compras.clave_acceso IS 'Clave de acceso del comprobante electrónico (49 dígitos)';


-- -----------------------------------------------------------------------------
-- TABLA: notas_credito
-- Descripción: Notas de crédito emitidas
-- -----------------------------------------------------------------------------
CREATE TABLE notas_credito (
    -- Identificación
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    contribuyente_ruc CHAR(13) REFERENCES contribuyentes(ruc) ON DELETE CASCADE,
    
    -- Datos del comprobante
    fecha_emision DATE NOT NULL,
    tipo_comprobante tipo_comprobante NOT NULL DEFAULT 'nota_credito',
    numero_comprobante VARCHAR(30) NOT NULL,
    
    -- Valores tributarios
    subtotal_0 NUMERIC(12,2) DEFAULT 0,
    subtotal_8 NUMERIC(12,2) DEFAULT 0,
    subtotal_15 NUMERIC(12,2) DEFAULT 0,
    iva NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) NOT NULL,
    
    -- Auditoría
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE notas_credito IS 'Notas de crédito emitidas para anulaciones o devoluciones';


-- -----------------------------------------------------------------------------
-- TABLA: retenciones
-- Descripción: Comprobantes de retención emitidos
-- -----------------------------------------------------------------------------
CREATE TABLE retenciones (
    -- Identificación
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    contribuyente_ruc CHAR(13) REFERENCES contribuyentes(ruc) ON DELETE CASCADE,
    
    -- Datos del comprobante
    tipo_comprobante tipo_comprobante,
    serie_comprobante VARCHAR(30),
    clave_acceso VARCHAR(49) UNIQUE,
    fecha_emision DATE NOT NULL,
    
    -- Valores de retención
    retencion_iva_percent NUMERIC(5,2),
    retencion_valor NUMERIC(12,2),
    retencion_renta_percent NUMERIC(5,2),
    retencion_renta_valor NUMERIC(12,2),
    
    -- Auditoría
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Índices para retenciones
CREATE INDEX idx_retenciones_contribuyente ON retenciones(contribuyente_ruc);
CREATE UNIQUE INDEX retenciones_clave_acceso_unique ON retenciones(clave_acceso);

COMMENT ON TABLE retenciones IS 'Comprobantes de retención de IVA y Renta emitidos';
COMMENT ON COLUMN retenciones.retencion_iva_percent IS 'Porcentaje de retención de IVA (ej: 30, 70, 100)';
COMMENT ON COLUMN retenciones.retencion_renta_percent IS 'Porcentaje de retención en la fuente de Impuesto a la Renta';


-- -----------------------------------------------------------------------------
-- TABLA: tax_liquidations
-- Descripción: Liquidaciones tributarias mensuales o semestrales
-- -----------------------------------------------------------------------------
CREATE TABLE tax_liquidations (
    -- Identificación
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    contribuyente_ruc CHAR(13) REFERENCES contribuyentes(ruc) ON DELETE CASCADE,
    
    -- Periodo de liquidación
    fecha_inicio_cierre DATE NOT NULL,
    fecha_fin_cierre DATE NOT NULL,
    
    -- Totales de compras
    total_compras_iva_0 NUMERIC(12,2) DEFAULT 0,
    total_compras_iva_mayor_0 NUMERIC(12,2) DEFAULT 0,
    
    -- Totales de ventas
    total_ventas_iva_0 NUMERIC(12,2) DEFAULT 0,
    total_ventas_iva_mayor_0 NUMERIC(12,2) DEFAULT 0,
    
    -- Ajustes
    total_nc_iva_mayor_0 NUMERIC(12,2) DEFAULT 0,
    total_retenciones_iva_mayor_0 NUMERIC(12,2) DEFAULT 0,
    
    -- Créditos tributarios
    credito_favor_adquisicion NUMERIC(12,2) DEFAULT 0,
    credito_favor_retencion NUMERIC(12,2) DEFAULT 0,
    
    -- Resultado
    impuesto_pagar_sri NUMERIC(12,2) DEFAULT 0,
    impuesto_causado NUMERIC(12,2) DEFAULT 0,
    
    -- Auditoría
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE tax_liquidations IS 'Liquidaciones tributarias periódicas (IVA y otros impuestos)';
COMMENT ON COLUMN tax_liquidations.impuesto_pagar_sri IS 'Monto neto a pagar al SRI después de aplicar créditos';
COMMENT ON COLUMN tax_liquidations.impuesto_causado IS 'Impuesto total causado en el periodo';


-- -----------------------------------------------------------------------------
-- TABLA: retencion_params
-- Descripción: Parámetros y códigos de retención según el SRI
-- -----------------------------------------------------------------------------
CREATE TABLE retencion_params (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE,
    descripcion TEXT,
    porcentaje NUMERIC(5,2),
    tipo VARCHAR(10)  -- 'IVA' o 'RENTA'
);

COMMENT ON TABLE retencion_params IS 'Catálogo de códigos y porcentajes de retención vigentes';


-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Habilitar RLS en todas las tablas principales
ALTER TABLE contribuyentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividades_economicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribuyente_actividad ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE retenciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE retencion_params ENABLE ROW LEVEL SECURITY;

-- Nota: tax_liquidations no tiene RLS habilitado según la configuración actual


-- =============================================================================
-- FOREIGN KEYS Y CONSTRAINTS
-- =============================================================================

-- Foreign Keys principales ya definidas en las tablas:
-- - contribuyentes.user_id -> auth.users(id)
-- - contribuyente_actividad.contribuyente_ruc -> contribuyentes(ruc)
-- - contribuyente_actividad.actividad_codigo -> actividades_economicas(codigo)
-- - ventas.contribuyente_ruc -> contribuyentes(ruc)
-- - ventas.nota_credito_id -> notas_credito(id)
-- - ventas.retencion_id -> retenciones(id)
-- - compras.contribuyente_ruc -> contribuyentes(ruc)
-- - notas_credito.contribuyente_ruc -> contribuyentes(ruc)
-- - retenciones.contribuyente_ruc -> contribuyentes(ruc)
-- - tax_liquidations.contribuyente_ruc -> contribuyentes(ruc)


-- =============================================================================
-- ÍNDICES ADICIONALES
-- =============================================================================

-- Los índices ya están creados en las definiciones de tablas anteriores
-- Resumen de índices:
-- - idx_contribuyentes_user_id
-- - idx_contribuyentes_email
-- - idx_contribuyente_actividad
-- - idx_ventas_contribuyente
-- - idx_compras_contribuyente
-- - idx_retenciones_contribuyente
-- - compras_clave_acceso_unique
-- - retenciones_clave_acceso_unique


-- =============================================================================
-- SISTEMA MULTI-ROL: CONTADORES
-- =============================================================================
-- Agregado: 2025-12-21
-- Descripción: Soporte para usuarios tipo contador que gestionan múltiples contribuyentes

-- -----------------------------------------------------------------------------
-- TIPOS ENUM ADICIONALES
-- -----------------------------------------------------------------------------

-- Tipo: Tipo de usuario del sistema
CREATE TYPE user_type AS ENUM (
    'contribuyente',
    'contador'
);

-- Tipo: Estado de la relación contador-contribuyente
CREATE TYPE relacion_estado AS ENUM (
    'activo',
    'inactivo',
    'pendiente'
);

-- -----------------------------------------------------------------------------
-- TABLA: contadores
-- Descripción: Almacena información de los contadores profesionales
-- -----------------------------------------------------------------------------
CREATE TABLE contadores (
    -- Identificación
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Información personal
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(120) NOT NULL,
    direccion TEXT,
    
    -- Información profesional
    numero_registro VARCHAR(50),  -- Número de registro profesional del contador
    especialidad VARCHAR(100),
    
    -- Estado
    estado contribuyente_estado NOT NULL DEFAULT 'activo',
    
    -- Auditoría
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Índices para contadores
CREATE INDEX idx_contadores_user_id ON contadores(user_id);
CREATE INDEX idx_contadores_email ON contadores(email);

COMMENT ON TABLE contadores IS 'Tabla de contadores profesionales que gestionan contribuyentes';
COMMENT ON COLUMN contadores.numero_registro IS 'Número de registro profesional del contador';

-- -----------------------------------------------------------------------------
-- TABLA: contador_contribuyente
-- Descripción: Relación entre contadores y sus contribuyentes asignados (1:N)
-- -----------------------------------------------------------------------------
CREATE TABLE contador_contribuyente (
    -- Identificación
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Relaciones
    contador_id UUID NOT NULL REFERENCES contadores(id) ON DELETE CASCADE,
    contribuyente_ruc CHAR(13) NOT NULL REFERENCES contribuyentes(ruc) ON DELETE CASCADE,
    
    -- Estado de la relación
    estado relacion_estado NOT NULL DEFAULT 'activo',
    
    -- Auditoría
    fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_desactivacion TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraint único: un contador solo puede tener una relación activa con un contribuyente
    CONSTRAINT unique_contador_contribuyente UNIQUE (contador_id, contribuyente_ruc)
);

-- Índices para contador_contribuyente
CREATE INDEX idx_contador_contribuyente_contador ON contador_contribuyente(contador_id);
CREATE INDEX idx_contador_contribuyente_ruc ON contador_contribuyente(contribuyente_ruc);
CREATE INDEX idx_contador_contribuyente_estado ON contador_contribuyente(estado);

COMMENT ON TABLE contador_contribuyente IS 'Relación entre contadores y contribuyentes asignados';
COMMENT ON COLUMN contador_contribuyente.estado IS 'Estado de la relación: activo, inactivo, pendiente';

-- Triggers para contadores
CREATE TRIGGER update_contadores_updated_at
    BEFORE UPDATE ON contadores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contador_contribuyente_updated_at
    BEFORE UPDATE ON contador_contribuyente
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS para contadores
ALTER TABLE contadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE contador_contribuyente ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- FUNCIONES HELPER PARA RLS
-- -----------------------------------------------------------------------------

-- Verifica si el usuario autenticado es contador de un contribuyente específico
CREATE OR REPLACE FUNCTION is_contador_of_contribuyente(p_contribuyente_ruc CHAR(13))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM contador_contribuyente cc
        INNER JOIN contadores c ON cc.contador_id = c.id
        WHERE cc.contribuyente_ruc = p_contribuyente_ruc
          AND cc.estado = 'activo'
          AND c.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verifica si el usuario es propietario del contribuyente
CREATE OR REPLACE FUNCTION is_owner_of_contribuyente(p_contribuyente_ruc CHAR(13))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM contribuyentes
        WHERE ruc = p_contribuyente_ruc AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verifica acceso (propietario O contador asignado)
CREATE OR REPLACE FUNCTION has_access_to_contribuyente(p_contribuyente_ruc CHAR(13))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN is_owner_of_contribuyente(p_contribuyente_ruc) 
        OR is_contador_of_contribuyente(p_contribuyente_ruc);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- ESTADÍSTICAS DE LA BASE DE DATOS
-- =============================================================================

-- Total de registros por tabla (al momento de la exportación):
-- contribuyentes: 1 registro
-- actividades_economicas: 38 registros
-- contribuyente_actividad: 1 registro
-- ventas: 36 registros
-- compras: 1787 registros
-- notas_credito: 0 registros
-- retenciones: 16 registros
-- tax_liquidations: 1 registro
-- retencion_params: 0 registros
-- contadores: 0 registros
-- contador_contribuyente: 0 registros


-- =============================================================================
-- POLÍTICAS RLS (Row Level Security)
-- =============================================================================

-- NOTA: Las políticas RLS específicas se encuentran en archivos separados:
-- - supabase-ventas-rls-policies.sql
-- - supabase-compras-rls-policies.sql
-- - supabase-retenciones-rls.sql
-- - supabase-notas-credito-rls.sql
-- - supabase-tax-liquidations-rls-policies.sql
--
-- Estas políticas garantizan que cada usuario solo puede acceder a sus propios
-- registros basándose en la relación contribuyente_ruc <-> user_id
--
-- ACTUALIZACIÓN: Las políticas ahora también permiten acceso a contadores 
-- asignados mediante la función has_access_to_contribuyente()


-- =============================================================================
-- FUNCIONES Y TRIGGERS
-- =============================================================================

-- Función para actualizar el timestamp updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para la tabla contribuyentes
CREATE TRIGGER update_contribuyentes_updated_at
    BEFORE UPDATE ON contribuyentes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- COMENTARIOS FINALES
-- =============================================================================

-- Este esquema representa un sistema completo de gestión tributaria para Ecuador
-- que incluye:
--
-- 1. Gestión de contribuyentes y sus actividades económicas
-- 2. Registro de ventas (facturas emitidas)
-- 3. Registro de compras con clasificación por rubros (gastos personales)
-- 4. Notas de crédito para devoluciones
-- 5. Retenciones de IVA y Renta
-- 6. Liquidaciones tributarias periódicas
-- 7. Catálogos parametrizados (actividades económicas, códigos de retención)
-- 8. Sistema multi-rol: Contadores que gestionan múltiples contribuyentes
--
-- Características de seguridad:
-- - Row Level Security (RLS) habilitado en todas las tablas principales
-- - Relación directa con el sistema de autenticación de Supabase (auth.users)
-- - Soft deletes mediante columnas deleted_at
-- - Auditoría con timestamps automáticos
-- - Contadores pueden acceder a datos de sus contribuyentes asignados
--
-- Base de datos: PostgreSQL 17.4.1.064 en Supabase
-- Región: us-east-1
-- Project ID: tqrxlnopvqusqxaljzlz

