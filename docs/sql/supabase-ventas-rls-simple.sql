-- ========================================
-- POLÍTICAS RLS SIMPLES PARA TABLA DE VENTAS
-- (Versión alternativa más directa)
-- ========================================

-- Habilitar RLS
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

-- OPCIÓN 1: Política combinada para todas las operaciones
-- (Más simple, cubre SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "acceso_completo_ventas_propias" ON ventas
    FOR ALL
    USING (
        contribuyente_ruc IN (
            SELECT ruc 
            FROM contribuyentes 
            WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        contribuyente_ruc IN (
            SELECT ruc 
            FROM contribuyentes 
            WHERE auth_user_id = auth.uid()
        )
    );

-- ========================================
-- VERIFICACIÓN DE FUNCIONAMIENTO
-- ========================================

-- Consulta para verificar que funciona:
-- SELECT * FROM ventas; -- Solo debería devolver ventas del usuario actual

-- Para probar desde el cliente (JavaScript):
-- const { data, error } = await supabase
--   .from('ventas')
--   .select('*');
-- console.log('Ventas del usuario:', data);



